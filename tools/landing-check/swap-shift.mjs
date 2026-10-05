// Font-swap layout shift sweep (from #146), for local runs; CI doesn't run it (README.md, "The font-swap sweep").
// Each font file from fonts.gstatic.com is held back 1.2 s, so the page paints in the fallback faces first and
// then swaps to the web fonts, as on a slow phone. Per width it prints the sum of Chrome's own layout-shift
// entries (none caused by input) and the elements Chrome names as their sources. docs/UX-REVIEW.md §8 budgets
// CLS at 0.05. It reports and exits 0; it exits 1 only when the web fonts never load, since then there is no swap.
// Usage: node swap-shift.mjs [--widths=390,820,1280] [--lh] [name=docsDir ...]
//   default widths: every 20 px from 320 to 1440 plus common device widths (73 in all)
//   default page:   docs/ at the repository root; several name=dir pairs are compared side by side
//   --lh            adds Lighthouse's mobile setup (412x823, DPR 1.75, mobile)
import { chromium } from 'playwright';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { openWithWebFonts, serveDir } from './lib.mjs';

const here = path.dirname(fileURLToPath(import.meta.url));
const HOLD_MS = 1200;

const args = process.argv.slice(2);
const widthsArg = args.find((a) => a.startsWith('--widths='));
const lh = args.includes('--lh');
let variants = args.filter((a) => a.includes('=') && !a.startsWith('--'))
  .map((a) => [a.slice(0, a.indexOf('=')), path.resolve(a.slice(a.indexOf('=') + 1))]);
if (!variants.length) variants = [['docs', path.resolve(here, '../../docs')]];
let widths = widthsArg ? widthsArg.slice('--widths='.length).split(',').map(Number) : [];
if (!widthsArg) {
  for (let w = 320; w <= 1440; w += 20) widths.push(w);
  widths.push(375, 390, 393, 412, 414, 428, 430, 744, 760, 761, 768, 810, 820, 834, 1024, 1040, 1041, 1180, 1194, 1280, 1366);
  widths = [...new Set(widths)].sort((a, b) => a - b);
}

// Collects every layout shift from the first paint on, with the elements Chrome blames for it.
const OBSERVER = `
  window.__ls = [];
  new PerformanceObserver((list) => {
    for (const e of list.getEntries()) {
      if (e.hadRecentInput) continue;
      const src = (e.sources || []).map((s) => {
        const n = s.node; if (!n || n.nodeType !== 1) return n ? n.nodeName : '?';
        return n.localName + (n.id ? '#' + n.id : '') + (n.className && typeof n.className === 'string' ? '.' + n.className.trim().split(/\\s+/).join('.') : '');
      });
      window.__ls.push({ v: e.value, t: Math.round(e.startTime), src });
    }
  }).observe({ type: 'layout-shift', buffered: true });`;

const servers = await Promise.all(variants.map(([, dir]) => serveDir(dir)));
const browser = await chromium.launch();

async function measure(url, contextOptions) {
  let reason = '';
  for (let attempt = 1; attempt <= 2; attempt++) {
    const context = await browser.newContext(contextOptions);
    await context.addInitScript(OBSERVER);
    await context.route(/^https:\/\/fonts\.gstatic\.com\//, async (route) => {
      await new Promise((resolve) => setTimeout(resolve, HOLD_MS));
      await route.continue().catch(() => {}); // the context may have closed meanwhile
    });
    const page = await context.newPage();
    try {
      const fonts = await openWithWebFonts(page, url, { timeoutMs: 20000 });
      if (fonts.ok) {
        await page.evaluate(() => new Promise((r) => requestAnimationFrame(() => requestAnimationFrame(() => setTimeout(r, 300)))));
        const shifts = await page.evaluate(() => window.__ls);
        const cls = shifts.reduce((sum, e) => sum + e.v, 0);
        const srcs = [...new Set(shifts.flatMap((e) => e.src))].slice(0, 4).join(' ');
        return { cls, srcs };
      }
      reason = fonts.reason;
    } finally {
      await context.close();
    }
  }
  throw new Error(`web fonts did not load, so there is no swap to measure: ${reason}`);
}

try {
  console.log(`width | ${variants.map(([name]) => name).join(' | ')}`);
  const totals = Object.fromEntries(variants.map(([name]) => [name, { sum: 0, max: 0, over: 0 }]));
  const jobs = widths.map((w) => [w, { viewport: { width: w, height: w <= 760 ? 844 : 800 }, deviceScaleFactor: 1 }]);
  if (lh) jobs.push(['412 LH-mobile', { viewport: { width: 412, height: 823 }, deviceScaleFactor: 1.75, isMobile: true, hasTouch: true }]);
  for (const [w, contextOptions] of jobs) {
    const cells = [];
    for (let i = 0; i < variants.length; i++) {
      const r = await measure(servers[i].url, contextOptions);
      const t = totals[variants[i][0]];
      t.sum += r.cls;
      t.max = Math.max(t.max, r.cls);
      if (r.cls > 0.05) t.over++;
      cells.push(`${r.cls.toFixed(4)}${r.srcs ? ` [${r.srcs}]` : ''}`);
    }
    console.log(`${w} | ${cells.join(' | ')}`);
  }
  console.log(`\nsummary over ${jobs.length} widths:`);
  for (const [name, t] of Object.entries(totals)) {
    console.log(`  ${name}: max ${t.max.toFixed(4)}, mean ${(t.sum / jobs.length).toFixed(4)}, widths over 0.05: ${t.over}`);
  }
} catch (err) {
  console.error(`swap-shift: ${err.message}`);
  process.exitCode = 1;
} finally {
  await browser.close();
  await Promise.all(servers.map((s) => s.close()));
}
