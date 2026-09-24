# Landing UX review — 24 Sep 2026

Reviewed: `docs/index.html` on `feat/landing-global`, after the English-only pass
and the offer rework. Findings are ranked by impact. Effort is S (minutes),
M (an hour or so), L (needs a decision or a new surface, not just code).

Method: persona walkthroughs using the `product-discovery` question order
(user → job → what they do today → riskiest assumption), then IA, CTA, trust,
copy, mobile, accessibility and performance passes. Accessibility numbers are
from axe-core 4.10 (WCAG 2 A + AA) run against both themes; contrast ratios were
computed directly from the token values.

`product-discovery` is a PRD-authoring skill and its own guidance warns against
"PRD theater" — Burrow is already specified, so its **method** was used as the
persona lens rather than its output format. No PRD was generated.

---

## 1. First-visit comprehension

Tested against the three personas, reading the page top to bottom and stopping
at 5 seconds, at the end of the hero, and after one scroll.

### (a) Developer who already runs a VPS

| | |
|---|---|
| Job | "Stand up REALITY + WireGuard without reading three blog posts." |
| Today | Does it by hand from upstream docs, or not at all. |
| **5 s** | Tagline + "Free skill, full guide, always" + a GitHub button. Converts or bounces here; the page has already done its job. |
| **After hero** | Knows the paid tier exists and that it is not aimed at them ("You are never charged"). Correct outcome. |
| **Loses them** | Was: nothing said what actually gets installed, so they had to leave for the README. **Fixed** — see UX-L3 below. |

**Finding UX-3 (S, fixed).** The free path read "You run the steps, Claude talks
you through them", and every step description assumes a server is created during
setup. A developer with a VPS already couldn't tell the skill would work for
them. Now reads "Bring a server or let the skill create one".

**Finding UX-L3 (M, fixed — was L).** A collapsed *What actually gets installed*
disclosure now sits under How it works: cover (Xray, VLESS + XHTTP + REALITY on
443/tcp behind a real site), devices (plain WireGuard, official apps), panel,
watchdog, split routing, and the two layouts — plus a link to
`references/architecture.md`. Downgraded from L because `<details>` answers the
persona without adding a section or taxing the non-technical reader, which is what
made it look expensive in the first pass.

### (b) Non-technical person setting it up for family

| | |
|---|---|
| Job | "Make my parents' internet work without flying there." |
| Today | Installs a commercial VPN app on their phone and re-installs it when it breaks. |
| **5 s** | Tagline is plain. "$29 — verified or refunded" is legible and the badge says it isn't live yet. |
| **After hero** | Can state both paths. This is the change that mattered most. |
| **Loses them** | Step 2 of how-it-works: "installer built, certificates, watchdog". Four unexplained nouns in one line. Mitigated but not solved — see **UX-5**. |

**Finding UX-4 (S, fixed).** The hero lede stacked three undefined terms — *panel*,
*QR*, *split tunneling* — before any of them appear elsewhere on the page.
Rewritten to lead with the outcome ("a VPN only your people use") and to describe
split tunneling by its effect rather than its name.

### (c) Tried a commercial VPN and got flagged by their bank

| | |
|---|---|
| Job | "A VPN my bank doesn't treat as fraud." |
| Today | Toggles the VPN off to bank, forgets to toggle it back on. |
| **5 s** | "No shared servers" names their problem, but not in their words. |
| **After hero** | The lede now says banking apps keep working. Previously this was the last clause of a three-clause sentence. |
| **After one scroll** | "Split tunneling" is claim #1 in *Why your own server*, phrased as the outcome. Well served. |

**Finding UX-2 (S, fixed).** Folded into the hero lede rewrite: the bank case is
now in the first sentence a visitor reads, not the third clause.

---

## 2. Information architecture

Section order: hero → how it works → **bridge** → why your own server → set it up
for me → card declined? → who's behind this.

**The brief's hypothesis — "why" should come before "how" for persona (c) —
was tested and rejected.** Reasoning:

- Two of three personas want the mechanism next: (a) wants to know what it
  installs, (b) wants to judge the effort. Only (c) wants the argument.
- Persona (c)'s answer is already above the fold, in the hero lede, and is the
  first claim in *why* when they reach it.
- The "stuck" bridge line has to sit at the end of the DIY explanation to make
  sense. Moving *why* above *how* would separate the bridge from what it refers to.

Keeping the order. If this is revisited, the honest test is a real one — two URLs
and a click-through count — not another reading.

**"Card declined?" is pulling weight.** It is dead weight for most visitors and
decisive for the segment that hits it. It is correctly placed directly after the
section that asks for a card, and the comparison's "add your card" row links into
it. No change.

**Finding UX-5 (M, accepted not fixed).** How-it-works step 2 and the comparison's
"What Burrow does" row now describe the same work twice, ~1.5 screens apart. This
is deliberate — the brief asks for the split to be repeated at the decision point,
and repetition at a decision point is not redundancy. Flagged so it is a choice,
not an accident. If the page is ever trimmed, step 2 is the one to cut.

---

## 3. Calls to action

18 links. Every promise now matches its destination:

| Label | Destination | Promise honoured |
|---|---|---|
| Free skill *(nav)* | repo | yes |
| Get the free skill *(hero, comparison)* | repo | yes |
| Set it up for me *(nav, hero)* | `#agent` | yes |
| The agent can take over from any step *(bridge)* | `#agent` | yes |
| add your card *(comparison row)* | `#card` | yes |
| Notify me in Telegram | `t.me/burrow_vpn_bot` | yes |
| See the list in the guide | `references/provisioning.md` | yes |

**Finding UX-6 (S, fixed).** The footer link labelled "Telegram — updates and
releases" pointed at `@burrow_vpn_bot`, which is an early-access waitlist bot and
does not post releases. Two Telegram destinations with near-identical labels, one
of them making a promise it cannot keep. Footer now points at the channel; the bot
keeps the one job it has.

The repo is linked five times (nav, hero, comparison, bio, footer). Three of those
are the same promise at three decision points, which is intentional; bio and footer
repeats are conventional. No merge needed.

---

## 4. Trust

Three claims carried no evidence. All three now link to something that already
exists in the repo — nothing was invented, and no testimonials or numbers were
added.

| Claim | Evidence added |
|---|---|
| "verified before you're done" | `scripts/payload/common/verify.sh` — the script that does it |
| "nobody sees your traffic, access logs are off" | README § *Privacy, stated plainly* |
| "Works with DigitalOcean today" | `references/provisioning.md` — the provider table |

**Finding UX-L1 (L, decided and fixed).** "Or your money back" had no stated
process: no window, no method, no who-decides. Now stated on the page, one line
under the guarantee, in the shape the owner chose — **verification-tied with
discretion**: a failed verification is a full automatic refund, anything else
inside 14 days on request. The trigger is objective and its evidence is already
public (`verify.sh`, linked from the same column), which is what makes the narrow
half defensible and the generous half safe to offer.

Two constraints recorded for whoever revisits this:

- **The merchant of record governs.** Payments are to run through a MoR, which
  imposes its own refund policy and moves the money. The landing's terms must be a
  subset of theirs or they are unenforceable — read their terms before changing
  this line.
- **The bot's `/start` copy must match.** It is the other place a buyer meets the
  offer, and it is outside this repo.

---

## 5. Copy

Read aloud, flagging anything a non-native reader would stumble over.

- **Jargon before explanation.** Fixed in the hero (UX-4). Remaining, all after
  first explanation: *WireGuard* (first seen in the panel mockup, which is
  `aria-hidden` decoration), *DNS* (hero fine print, in a context that explains
  itself — "a DNS wait"), *watchdog* and *certificates* (step 2, see UX-5).
- **"Burrow runs no servers at all"** — deliberately absolute, and true. Kept.
- **"None to give — you paid nothing"** in the free column's Guarantee row reads
  as a shrug rather than a gap, which is the intent.
- No sentence exceeds two clauses in the hero or the comparison headers.

---

## 6. Mobile (390 px)

Walked the page at 390×844.

- No horizontal scroll anywhere; `scrollWidth === innerWidth` at 390, 820, 1280.
- The comparison stacks to one column and its label/value rows collapse to a
  single column with the price moving under the heading. **It never becomes a
  horizontal scroll** — verified on the `.cmp` element itself, not just the page.
- Sticky header is 61 px at phone width; anchors carry `scroll-margin-top: 72px`,
  so headings land below it.
- Both paths, the word "free" and "$29" are above the fold: the paid card's
  heading bottom sits at 775 px of an 844 px viewport, and at 772 px of 800 px at
  1280. Tight at both. Any further growth in the H1 or lede pushes the price under
  the fold — this is the constraint to protect in future copy edits, and it caught
  a regression during this very review: the first rewrite of the hero lede added a
  line and dropped "$29" below 800 px at 1280. The lede was shortened rather than
  the constraint relaxed.
- Tap targets: all buttons ≥ 44 px tall.

---

## 7. Accessibility

axe-core, WCAG 2 A + AA, both themes.

**Before: 23 violations in dark, 3 in light. After: 0 and 0** (20 passing rule
groups each).

**Finding A11Y-1 (S, fixed) — the one the brief predicted.** `--mute` in dark was
`#6B7684`: **4.10:1** on `--bg`, **3.85:1** on `--surface`. Both under 4.5. This is
every mono label on the page — the fine print, the comparison row labels, the bot
handle, the badge. Changed to `#798596` (5.05 / 4.74), which keeps the muted
reading while clearing AA.

**Finding A11Y-2 (S, fixed).** Three more in light:
- `--good` `#12B76A` on surface: **2.51:1**. Only ever used for small text
  ("tunnel healthy"). Now `#087443` (5.60:1).
- `.btn small` at `opacity: .75` → effectively `#C3DBDE` on the teal button:
  **4.11:1**. Now `.9` (5.14:1).
- The "Opens in November" badge inherited `--mute` over `--accent-soft`:
  **4.40:1**. Now uses `--ink-2` (6.80:1).

**Verified, already correct:**
- `prefers-reduced-motion` is honoured — transitions and smooth scroll are both
  disabled.
- Focus order follows the DOM and the visible order; `:focus-visible` is styled
  with a 2 px accent outline at 3 px offset on every interactive element.
- The dead `aria-disabled` button the brief asked about **no longer exists** — the
  offer rework replaced it with a text badge, which is the better answer: there is
  now no focusable control that does nothing.

---

## 8. Performance

Measured with Lighthouse 12.8.2, mobile form factor, simulated throttling.
Localhost numbers are for the current branch; the live row is the deployed page
before this PR, as a baseline.

| | Perf | A11y | BP | SEO | FCP | LCP | CLS |
|---|---|---|---|---|---|---|---|
| Deployed page, before this PR | 88 | 95 | 96 | 100 | 2.9 s | 2.9 s | 0 |
| This branch, before perf fixes | 91 | **100** | 96 | 100 | 2.8 s | 2.8 s | 0.002 |
| This branch, after perf fixes | **100** | **100** | **100** | **100** | **0.9 s** | **0.9 s** | 0.004 |

The accessibility jump from 95 to 100 is the contrast work in §7, independently
confirmed by a second tool.

**Finding PERF-2 (S, fixed) — the big one.** The Google Fonts stylesheet was
render-blocking: Lighthouse attributed **865 ms** directly to it, and flagged
1743 ms of render-blocking work overall. The document cannot paint until a
stylesheet in `<head>` resolves, and this one is on a third-party origin. Now
loaded asynchronously — `media="print"` flipped to `all` on load, with a
`<noscript>` fallback so the fonts still arrive with scripting off. `display=swap`
was already set, so text paints immediately in the fallback face and swaps.
**FCP and LCP went 2.8 s → 0.9 s.**

**Finding PERF-3 (S, fixed).** One console error on every load: browsers request
`/favicon.ico` whether or not you declare one, and nothing was there. Added an
inline SVG data-URI icon using the existing brand mark — no extra request, and
Best Practices went 96 → 100.

**Finding PERF-1 (S, fixed).** Only `fonts.googleapis.com` was preconnected; the
font *files* come from `fonts.gstatic.com`, which was left to a connection
discovered after the CSS parsed. Second preconnect added with `crossorigin`.

**Finding PERF-4 (S, fixed).** The portrait is below the fold, had no intrinsic
size, and loaded eagerly. Now `width`/`height` + `loading="lazy"`
+ `decoding="async"`.

**Not a real finding:** Lighthouse's "enable text compression" is an artifact of
`python -m http.server`, which does not gzip. GitHub Pages does.

### Budget

Regressions below this are what future changes should be measured against, on the
deployed URL, mobile, simulated throttling:

| Metric | Budget |
|---|---|
| Performance | ≥ 95 |
| Accessibility | 100 |
| Best Practices | ≥ 95 |
| SEO | 100 |
| FCP / LCP | ≤ 1.5 s |
| CLS | ≤ 0.05 |
| Render-blocking resources | none |
| Console errors | none |

Re-take these against `https://antongavrilov88.github.io/burrow/` once this is
merged and deployed; the numbers should improve slightly, since Pages serves
gzipped and the local server does not.

**Finding HYG-1 (S, fixed).** The restructure orphaned 25 CSS rules
(`.price`, `.plan`, `.grp`, `.li`, `.cta`, `.badge` and descendants). Removed.
Three of them (`.sub`, `.handle`, full-width buttons) were still in use under a
different parent and were re-scoped to `.col` — worth noting because removing dead
CSS is exactly where a silent visual regression hides.

---

## 9. The 5-second test

Covering everything below the hero, at 1280 and at 390: both paths are statable —
free skill for do-it-yourself, $29 for have-it-done, not live until November. That
was not true before this PR, at any width.

---

## Left as issues

| | What | Why it isn't in this PR |
|---|---|---|
| **UX-L1** | ~~Refund terms~~ | **Decided and shipped** — §4. Re-check against the MoR's policy when one is chosen |
| **UX-L2** | ~~Measure first paint and set a budget~~ | **Done** — §8. Re-take on the deployed URL after merge |
| **UX-L3** | ~~"What gets installed" for persona (a)~~ | **Done** — §1a, as a `<details>` rather than a section |
