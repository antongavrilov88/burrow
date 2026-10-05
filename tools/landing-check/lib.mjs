// Shared by landing-check.mjs and swap-shift.mjs: a static server for docs/ and the web-fonts guard.
import { createServer } from 'node:http';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

// The page's web fonts, as its CSS names them. If the page changes fonts, change this list.
export const WEB_FONTS = ['Manrope', 'JetBrains Mono'];
// Where they come from: the stylesheet from fonts.googleapis.com, the font files from fonts.gstatic.com.
export const WEB_FONT_HOSTS = /^https:\/\/fonts\.(googleapis|gstatic)\.com\//;

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
};

/** Serves dir on 127.0.0.1 at a free port, like `python3 -m http.server`. Resolves to { url, close }. */
export async function serveDir(dir) {
  const root = path.resolve(dir);
  const server = createServer(async (req, res) => {
    try {
      let p = decodeURIComponent(new URL(req.url, 'http://localhost').pathname);
      if (p.endsWith('/')) p += 'index.html';
      const file = path.join(root, p);
      const rel = path.relative(root, file);
      if (rel === '..' || rel.startsWith(`..${path.sep}`) || path.isAbsolute(rel)) {
        res.writeHead(403);
        res.end();
        return;
      }
      const body = await readFile(file);
      res.writeHead(200, { 'Content-Type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404);
      res.end();
    }
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}/`,
    close: () => new Promise((resolve) => {
      server.close(resolve);
      server.closeAllConnections();
    }),
  };
}

/** Aborts every request to the web font hosts, so the page has to do without its web fonts. */
export async function blockWebFonts(context) {
  await context.route(WEB_FONT_HOSTS, (route) => route.abort('blockedbyclient'));
}

/**
 * Opens url in page and waits until the web fonts are in use: the Google Fonts stylesheet, if the page
 * has one, has switched to media=all (the page loads it as media=print and flips it on load); then, after
 * document.fonts.ready (awaited for up to 1 s per poll), every family in WEB_FONTS has at least one
 * FontFace with status "loaded" and none loading or failed. Counting FontFace objects is the point:
 * document.fonts.check() is true when no face of a family exists at all, so it passes on a page that
 * never got its web fonts.
 * Resolves to { ok, reason, faces }; ok is false after timeoutMs, or at once when the stylesheet or a
 * face has failed. faces is null when the page itself did not load.
 */
export async function openWithWebFonts(page, url, { timeoutMs = 15000 } = {}) {
  const failedRequests = new Set();
  page.on('requestfailed', (req) => {
    if (WEB_FONT_HOSTS.test(req.url())) failedRequests.add(`${shortUrl(req.url())} ${req.failure()?.errorText || 'failed'}`);
  });
  page.on('response', (res) => {
    if (WEB_FONT_HOSTS.test(res.url()) && res.status() >= 400) failedRequests.add(`${shortUrl(res.url())} HTTP ${res.status()}`);
  });
  // A stylesheet that fails to load fires "error" on its <link> and never switches to media=all.
  await page.addInitScript(() => {
    window.__webFontCssError = false;
    document.addEventListener('error', (e) => {
      const t = e.target;
      if (t instanceof HTMLLinkElement && t.rel === 'stylesheet' && t.href.includes('fonts.googleapis.com')) {
        window.__webFontCssError = true;
      }
    }, true);
  });
  try {
    await page.goto(url, { waitUntil: 'load', timeout: 30000 });
  } catch (err) {
    return { ok: false, reason: `the page did not load: ${err.message.split('\n')[0]}`, faces: null };
  }
  const requests = () => (failedRequests.size ? `; failed requests: ${[...failedRequests].join(', ')}` : '');
  const deadline = Date.now() + timeoutMs;
  for (;;) {
    const s = await page.evaluate(fontState, WEB_FONTS);
    const failed = [];
    if (s.cssError) failed.push('the Google Fonts stylesheet failed to load');
    for (const family of WEB_FONTS) {
      if (s.faces[family].error) failed.push(`${s.faces[family].error} ${family} face(s) failed to load`);
    }
    if (failed.length) return { ok: false, reason: failed.join('; ') + requests(), faces: s.faces };
    const sheetReady = s.stylesheet === null || s.stylesheet === 'all';
    if (sheetReady && WEB_FONTS.every((f) => s.faces[f].loaded > 0 && s.faces[f].loading === 0)) {
      return { ok: true, reason: '', faces: s.faces };
    }
    if (Date.now() >= deadline) {
      const waiting = sheetReady ? 'waiting for the font files' : `with the Google Fonts stylesheet still media=${s.stylesheet}`;
      return { ok: false, reason: `timed out after ${timeoutMs / 1000} s ${waiting}${requests()}`, faces: s.faces };
    }
    await page.waitForTimeout(200);
  }
}

/** "Manrope 4 loaded, JetBrains Mono 2 loaded", plus any faces still loading or failed. */
export function describeFaces(faces) {
  if (!faces) return 'none';
  return Object.entries(faces).map(([family, n]) => {
    const extra = [n.loading && `${n.loading} loading`, n.error && `${n.error} failed`].filter(Boolean);
    return `${family} ${n.loaded} loaded${extra.length ? ` (${extra.join(', ')})` : ''}`;
  }).join(', ');
}

// Runs in the page: the font stylesheet's media and, per family, how many FontFace objects are in each status.
async function fontState(families) {
  const link = document.querySelector('link[rel="stylesheet"][href*="fonts.googleapis.com"]');
  const stylesheet = link ? link.media : null;
  document.body.getBoundingClientRect(); // style and layout first, so the faces the page uses start loading
  await Promise.race([document.fonts.ready, new Promise((resolve) => setTimeout(resolve, 1000))]);
  const faces = {};
  for (const family of families) faces[family] = { loaded: 0, loading: 0, error: 0, unloaded: 0 };
  for (const face of document.fonts) {
    const family = face.family.replace(/["']/g, '');
    if (faces[family]) faces[family][face.status] += 1;
  }
  return { stylesheet, cssError: window.__webFontCssError === true, faces };
}

function shortUrl(url) {
  return url.replace(/^https:\/\//, '').replace(/\?.*$/, '');
}
