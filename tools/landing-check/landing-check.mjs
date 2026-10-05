// Landing check for docs/index.html (#175); CI runs it from .github/workflows/landing.yml.
// Serves docs/ over HTTP on 127.0.0.1, then at 390x844, 820x1180 and 1280x800, each in light and dark,
// waits for the web fonts and fails on:
//   - web fonts that did not load (lib.mjs, openWithWebFonts: loaded FontFace objects are counted,
//     because document.fonts.check() is true when no such face exists);
//   - any axe-core violation;
//   - horizontal scroll;
//   - the fold rule in CONTRIBUTING.md, "Checks on every page change" (FOLD below).
// Usage: node landing-check.mjs [--docs <dir>] [--shots <dir>] [--block-web-fonts]
// Exit status: 0 every check passed, 1 a check failed, 2 the check could not run.
import { chromium } from 'playwright';
import { createRequire } from 'node:module';
import { access, mkdir, readFile } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { blockWebFonts, describeFaces, openWithWebFonts, serveDir } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '../..');
const require = createRequire(import.meta.url);

// A path as printed: relative to the repository root when inside it, else absolute.
function shown(p) {
  const rel = path.relative(repoRoot, p);
  return rel && !rel.startsWith('..') && !path.isAbsolute(rel) ? rel : p;
}

const VIEWPORTS = [[390, 844], [820, 1180], [1280, 800]];
const SCHEMES = ['light', 'dark'];
const FONT_TIMEOUT_MS = 15000; // per attempt
const FONT_ATTEMPTS = 2; // one slow font response alone doesn't fail the check

// The fold rule (CONTRIBUTING.md, as decided in #149), keyed by viewport width. After the web fonts have
// loaded, each element must end above the fold: its bottom, in px from the top of the page, is at most the
// viewport height. Ids and classes only, so copy edits don't break the selectors.
const FOLD = {
  1280: [
    ['#paid .pk', "paid card's kicker"],
    ['#paid .amt', "paid card's price"],
    ['#free .pk', "free card's kicker"],
    ['#free .amt', "free card's price"],
    ['#free .cost', "free card's cost line with its tested/untested sentence"],
  ],
  390: [['#paid .btn', "paid card's button"]],
};

const USAGE = `usage: node landing-check.mjs [--docs <dir>] [--shots <dir>] [--block-web-fonts]
  --docs <dir>       the folder to serve (default: docs/ at the repository root)
  --shots <dir>      where the first-screen screenshots go (default: shots/ next to this script)
  --block-web-fonts  block fonts.googleapis.com and fonts.gstatic.com, also BLOCK_WEB_FONTS=1;
                     the check must then fail with "web fonts did not load"`;

function parseArgs(argv) {
  const opts = {
    docs: path.resolve(here, '../../docs'),
    shots: path.join(here, 'shots'),
    blockFonts: process.env.BLOCK_WEB_FONTS === '1',
  };
  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if ((arg === '--docs' || arg === '--shots') && !argv[i + 1]) {
      console.error(`${arg} needs a folder\n${USAGE}`);
      process.exit(2);
    } else if (arg === '--docs') opts.docs = path.resolve(argv[++i]);
    else if (arg === '--shots') opts.shots = path.resolve(argv[++i]);
    else if (arg === '--block-web-fonts') opts.blockFonts = true;
    else if (arg === '-h' || arg === '--help') {
      console.log(USAGE);
      process.exit(0);
    } else {
      console.error(`unknown argument: ${arg}\n${USAGE}`);
      process.exit(2);
    }
  }
  return opts;
}

const round1 = (n) => Math.round(n * 10) / 10;

async function checkViewport(browser, url, [width, height], scheme, opts, axeSource) {
  const label = `${width}x${height} ${scheme}`;
  let header = `== ${label}`;
  const lines = [];
  const problems = [];
  const fail = (message) => {
    lines.push(`FAIL  ${message}`);
    problems.push(`${label}: ${message}`);
  };

  let context;
  let page;
  let fonts;
  let attempt;
  for (attempt = 1; attempt <= FONT_ATTEMPTS; attempt++) {
    context = await browser.newContext({ viewport: { width, height }, colorScheme: scheme, deviceScaleFactor: 1 });
    if (opts.blockFonts) await blockWebFonts(context);
    page = await context.newPage();
    fonts = await openWithWebFonts(page, url, { timeoutMs: FONT_TIMEOUT_MS });
    if (fonts.ok || attempt === FONT_ATTEMPTS) break;
    lines.push(`note  web fonts not ready on attempt ${attempt}: ${fonts.reason}; faces: ${describeFaces(fonts.faces)}; trying again`);
    await context.close();
  }

  try {
    if (!fonts.faces) {
      fail(fonts.reason);
      return { header, lines, problems };
    }
    const colorScheme = await page.evaluate(() => getComputedStyle(document.documentElement).colorScheme);
    header += ` (color-scheme on the page: ${colorScheme})`;

    if (fonts.ok) {
      lines.push(`ok    web fonts: ${describeFaces(fonts.faces)}${attempt > 1 ? ` (attempt ${attempt})` : ''}`);
    } else {
      fail(`web fonts did not load (${attempt} attempts): ${fonts.reason}; faces: ${describeFaces(fonts.faces)}`);
    }

    // The fold, measured only with the web fonts in place: the rule is about the page as it settles.
    const rule = FOLD[width];
    if (!rule) {
      lines.push(`ok    fold: no rule at ${width} px (it covers ${Object.keys(FOLD).join(' and ')} px)`);
    } else if (!fonts.ok) {
      lines.push(`skip  fold at ${height} px: not measured without the web fonts`);
    } else {
      const measured = await page.evaluate((selectors) => selectors.map((selector) => {
        const all = [...document.querySelectorAll(selector)];
        const shown = all.filter((el) => el.getClientRects().length > 0);
        const bottoms = shown.map((el) => el.getBoundingClientRect().bottom + window.scrollY);
        return { found: all.length, shown: shown.length, bottom: bottoms.length ? Math.max(...bottoms) : null };
      }), rule.map(([selector]) => selector));
      const above = [];
      rule.forEach(([selector, what], i) => {
        const m = measured[i];
        if (!m.found) {
          fail(`fold: ${selector} (${what}) is not on the page; if the markup changed, update FOLD in landing-check.mjs`);
        } else if (!m.shown) {
          fail(`fold: ${selector} (${what}) is on the page but not rendered at ${width} px`);
        } else if (round1(m.bottom) > height) {
          fail(`fold: ${selector} (${what}) ends at ${round1(m.bottom)} px, below the fold at ${height} px`);
        } else {
          above.push(`${selector} ${round1(m.bottom)}`);
        }
      });
      if (above.length === rule.length) lines.push(`ok    fold at ${height} px, bottoms: ${above.join(', ')}`);
      else if (above.length) lines.push(`      fold at ${height} px, above it: ${above.join(', ')}`);
    }

    const scroll = await page.evaluate(() => {
      const de = document.documentElement;
      const vw = de.clientWidth;
      const name = (el) => el.localName + (el.id ? `#${el.id}` : '') + [...el.classList].map((c) => `.${c}`).join('');
      const wide = [];
      if (de.scrollWidth > vw) {
        // the outermost elements that stick out: wider than the viewport while their parent is not
        for (const el of document.body.querySelectorAll('*')) {
          const right = el.getBoundingClientRect().right;
          if (right > vw + 0.5 && el.parentElement.getBoundingClientRect().right <= vw + 0.5) {
            wide.push(`${name(el)} (right edge at ${Math.round(right)} px)`);
            if (wide.length === 3) break;
          }
        }
      }
      return { scrollWidth: de.scrollWidth, clientWidth: vw, wide };
    });
    if (scroll.scrollWidth > scroll.clientWidth) {
      fail(`horizontal scroll: the page is ${scroll.scrollWidth} px wide in a ${scroll.clientWidth} px viewport` +
        (scroll.wide.length ? `; sticking out: ${scroll.wide.join(', ')}` : ''));
    } else {
      lines.push(`ok    horizontal scroll: none (${scroll.scrollWidth} px)`);
    }

    // The first screen as a visitor sees it, before axe touches the page. Playwright's screenshot waits for
    // the fonts itself, so it gets a short timeout: font files that never arrive are reported above, not here.
    await page.screenshot({ path: path.join(opts.shots, `${width}x${height}-${scheme}.png`), timeout: 5000 })
      .catch((err) => lines.push(`note  no screenshot: ${err.message.split('\n')[0]}`));

    await page.addScriptTag({ content: axeSource });
    const violations = await page.evaluate(async () => {
      const result = await window.axe.run(document, { resultTypes: ['violations'] });
      return result.violations.map((v) => ({
        id: v.id,
        impact: v.impact,
        help: v.help,
        helpUrl: v.helpUrl,
        nodes: v.nodes.map((n) => ({ target: n.target.join(' '), html: n.html })),
      }));
    });
    if (!violations.length) {
      lines.push('ok    axe: 0 violations');
    } else {
      lines.push(`FAIL  axe: ${violations.length} violation${violations.length > 1 ? 's' : ''}`);
      for (const v of violations) {
        lines.push(`        ${v.id} (${v.impact}): ${v.help} (${v.helpUrl})`);
        for (const n of v.nodes.slice(0, 5)) lines.push(`          ${n.target}  ${n.html.replace(/\s+/g, ' ').slice(0, 160)}`);
        if (v.nodes.length > 5) lines.push(`          and ${v.nodes.length - 5} more`);
        const targets = v.nodes.slice(0, 3).map((n) => n.target).join(', ') + (v.nodes.length > 3 ? ', …' : '');
        problems.push(`${label}: axe ${v.id} (${v.impact}): ${v.help}; ${v.nodes.length} element(s): ${targets}`);
      }
    }
    return { header, lines, problems };
  } finally {
    await context.close();
  }
}

async function main() {
  const started = Date.now();
  const opts = parseArgs(process.argv.slice(2));
  try {
    await access(path.join(opts.docs, 'index.html'));
  } catch {
    console.error(`no index.html in ${opts.docs}\n${USAGE}`);
    return 2;
  }
  await mkdir(opts.shots, { recursive: true });
  const axeSource = await readFile(require.resolve('axe-core/axe.min.js'), 'utf8');
  const axeVersion = require('axe-core/package.json').version;

  const server = await serveDir(opts.docs);
  const browser = await chromium.launch();
  const problems = [];
  try {
    console.log(`landing check: ${shown(path.join(opts.docs, 'index.html'))}, Chromium ${browser.version()}, axe-core ${axeVersion}; ` +
      `web fonts ${opts.blockFonts ? 'BLOCKED on purpose (--block-web-fonts / BLOCK_WEB_FONTS=1)' : 'from Google Fonts'}`);
    for (const viewport of VIEWPORTS) {
      for (const scheme of SCHEMES) {
        const result = await checkViewport(browser, server.url, viewport, scheme, opts, axeSource);
        console.log(`\n${[result.header, ...result.lines].join('\n')}`);
        problems.push(...result.problems);
      }
    }
  } finally {
    await browser.close();
    await server.close();
  }

  const seconds = ((Date.now() - started) / 1000).toFixed(1);
  const combinations = VIEWPORTS.length * SCHEMES.length;
  if (!problems.length) {
    console.log(`\nresult: ok, ${combinations} of ${combinations} width and theme combinations passed in ${seconds} s`);
    return 0;
  }
  console.log(`\nresult: FAIL, ${problems.length} problem${problems.length > 1 ? 's' : ''} in ${seconds} s ` +
    `(screenshots of each first screen: ${shown(opts.shots)}/):`);
  for (const p of problems) console.log(`- ${p}`);
  if (process.env.GITHUB_ACTIONS === 'true') {
    const escape = (s) => s.replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
    for (const p of problems) console.log(`::error title=landing check::${escape(p)}`);
  }
  return 1;
}

main().then((code) => process.exit(code), (err) => {
  console.error(`landing check could not run: ${err.stack || err}`);
  process.exit(2);
});
