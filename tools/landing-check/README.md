# Landing check

Checks `docs/index.html` in Chromium against the page checks in `CONTRIBUTING.md` ("Checks on every
page change"), so a change that breaks accessibility, the fold or the layout fails its PR instead of
reaching visitors. CI runs it on every PR to `dev` and `main` that touches `docs/`, this folder or the
workflow (`.github/workflows/landing.yml`).

## What it checks

It serves `docs/` itself on `127.0.0.1` (no other server needed) and opens the page at 390×844,
820×1180 and 1280×800, each in light and dark. In each of the six:

1. **The web fonts loaded.** It waits for the Google Fonts stylesheet to switch to `media=all` and for
   `document.fonts.ready`, then counts the page's `FontFace` objects: Manrope and JetBrains Mono must
   each have at least one with status `loaded`, and none still loading or failed. It counts because
   `document.fonts.check()` is true when no face of a family exists at all, which once let a run pass
   with no web fonts. Up to 15 s per try, two tries, so one slow font response doesn't fail the check
   by itself.
2. **The fold**, at 390 and 1280 px, measured once the fonts have loaded. Each element's bottom, in px
   from the top of the page, must be at most the viewport height:

   | Viewport | Elements | Limit |
   |---|---|---|
   | 1280×800 | `#paid .pk`, `#free .pk` (both cards' kicker); `#paid .amt`, `#free .amt` (their price); `#free .cost` (the free card's cost line with its tested/untested sentence) | 800 px |
   | 390×844 | `#paid .btn` (the paid card's button) | 844 px |

3. **No horizontal scroll**: the page is no wider than the viewport.
4. **axe: 0 violations**, with axe-core's default rules.

It saves a screenshot of each first screen to `shots/`; the workflow uploads them when the check fails.

## Run it locally

```bash
cd tools/landing-check
npm ci
npx playwright install chromium   # once; on Linux: npx playwright install --with-deps chromium
npm run check                     # same as: node landing-check.mjs
```

The page loads its fonts from Google, so the check needs internet access. Exit status 0 means every
check passed, 1 that one failed, 2 that the check itself could not run.

- `--docs <dir>` checks another copy of the page, for example a scratch copy you are trying things in.
- `--shots <dir>` puts the screenshots somewhere else.
- `--block-web-fonts`, or `BLOCK_WEB_FONTS=1`, blocks `fonts.googleapis.com` and `fonts.gstatic.com`.
  The check must then fail with "web fonts did not load": that is how to see the guard work.

**Delete `node_modules/` here before you run the wording guard** (`rm -rf tools/landing-check/node_modules`).
The guard scans every file in the repository, untracked ones too, and npm packages contain words it
bans. CI is not affected: the guard runs in its own job on a clean checkout.

## What a failure means

Every `FAIL` line belongs to a viewport and theme, such as `390x844 light`; the summary at the end
lists each problem again with its viewport and theme.

- **`web fonts did not load`**: Manrope or JetBrains Mono has no loaded face after two tries. The line
  says why (the stylesheet failed or never switched to `media=all`, a font file failed, or the wait
  timed out) and which requests failed. Locally, check your connection. In CI, run it again; if it
  fails twice, Google Fonts was unreachable from the runner or the page's font link changed. If the
  page changed its fonts on purpose, update `WEB_FONTS` in `lib.mjs`. The fold isn't measured without
  the fonts.
- **`fold: <selector> (<element>) ends at N px, below the fold at L px`**: the element no longer fits
  the first screen at that width. Shorten or rearrange what is above it; the screenshot shows the first
  screen. `is not on the page` or `not rendered` means the markup changed: if on purpose, update `FOLD`
  in `landing-check.mjs` together with the rule in `CONTRIBUTING.md`.
- **`horizontal scroll`**: something is wider than the viewport; the line names the outermost elements
  that stick out.
- **`axe <rule> (<impact>)`**: an accessibility violation. The lines above the summary list each element
  (its selector and HTML) and the rule's help page.

## In CI

`.github/workflows/landing.yml` runs on PRs to `dev` and `main` that touch `docs/**`,
`tools/landing-check/**` or the workflow, and by hand (`workflow_dispatch`; GitHub offers manual runs
for workflows on the default branch, `main`). The manual run has a box to block the web fonts: tick it
to see the check fail without them. When the check fails, the screenshots are uploaded as the
`landing-shots` artifact.

## The font-swap sweep

`swap-shift.mjs` is the font-swap layout-shift sweep from #146. It holds every font file back 1.2 s, so
the page paints in the fallback faces first and then swaps, and per width it sums Chrome's own
`layout-shift` entries; `docs/UX-REVIEW.md` §8 budgets CLS at 0.05. By default it covers 73 widths from
320 to 1440 px, about 2 s each.

```bash
node swap-shift.mjs                                     # every width, docs/
node swap-shift.mjs --widths=390,820,1280               # a few widths
node swap-shift.mjs before=/path/to/old/docs after=../../docs   # two versions side by side
node swap-shift.mjs --lh                                # adds Lighthouse's mobile setup
```

CI doesn't run it. The fallback faces it measures against are `local()` Arial, Roboto, Menlo and
Courier New, none of which Playwright installs on Linux (Menlo exists only on macOS), so a sweep on a
CI runner would measure a swap no visitor sees. Run it on your own machine when a change touches the
fonts or the text of the first screen.
