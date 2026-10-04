# Contributing

This repository is the Homeport website: the landing page in `docs/`, served by GitHub Pages at
<https://antongavrilov88.github.io/homeport/>. The skill itself — `SKILL.md`, its references, the
scripts, the installers, the plugin manifests and the releases — lives in
[antongavrilov88/homeport-skill](https://github.com/antongavrilov88/homeport-skill), with its own
CONTRIBUTING. Changes to what the skill does, and bugs in it, go there.

## Branches

| Branch | What it is | Who pushes |
|---|---|---|
| `main` | What the live site shows. A push that touches `docs/` redeploys Pages. Protected: needs a PR and the `check` status. | merges from `dev` via PR |
| `dev` | Integration branch, may be ahead of `main`. | merges from feature branches via PR |
| `feat/<name>`, `fix/<name>`, `docs/<name>` | One change each, branched from `dev`. | you |

## Release flow

1. Branch from `dev` (`feat/…`, `fix/…` or `docs/…`), open a PR into `dev`. CI runs the secrets scan and the wording guard (`.github/workflows/ci.yml`) and a link check (`.github/workflows/links.yml`; every exclusion, with its reason, in `lychee.toml`).
2. Add a line to `CHANGELOG.md` under `## Unreleased` in the same PR.
3. To release, open a PR `dev → main`. On a PR into `main` CI also runs the placeholder check (no `{{…}}` left in `README.md`, `SECURITY.md`, `docs/` or the issue templates). Merge it with a merge commit, not a squash — keep history.
4. The push to `main` runs `.github/workflows/pages.yml`, which deploys `docs/` to <https://antongavrilov88.github.io/homeport/> when `docs/**` changed. Open the live page and check it.

There are no tags, release assets or version numbers in this repository; the changelog stays under `## Unreleased`.

## Checks on every page change

CI can't see the page, so before you ask for review, check `docs/index.html` in a browser (`cd docs && python3 -m http.server 8765`):

- widths 390, 820 and 1280 px, each in light and dark;
- the fold: after `document.fonts.ready`, at 1280×800 the offer is above it — both cards' kicker and price, and the free card's cost line with its tested/untested sentence (the card buttons may sit just below, about 830 px since #105); at 390×844 the paid button;
- axe: 0 violations;
- no horizontal scroll at any of those widths;
- every claim the page makes about the skill, and every deep link into it, checked against `antongavrilov88/homeport-skill` on `main`. The link check fails on a dead deep link into homeport-skill's `main`, but nothing checks that a claim still matches the code.

`docs/UX-REVIEW.md` records the personas (§1) and the performance budget (§8) the page is held to.

## Commit messages

`type(scope): summary` — types `feat`, `fix`, `docs`, `chore`, `refactor`, `ci`. Scope is `landing` (the page in `docs/`) or `repo` (everything else: docs, templates, CI).

## Wording rules

Homeport is a world-wide product. The public surface of this repository — `docs/`, `README.md`, `CHANGELOG.md`, this file, `SECURITY.md`, `.github/` — names no country as the reason the product exists. CI runs `.github/wording-guard.sh` on every PR and fails on any of the terms below, case-insensitive, in Latin and Cyrillic.

**Banned:** `RKN`, `Roskomnadzor` / `Роскомнадзор`, `Sberbank` / `Сбер` / `Сбербанк`, `обход блокировок`, `белые списки` / `белый список`, `whitelist` / `whitelists` (when it means a carrier's allow-list in one country), `Russian sites`, `works in Russia`, `in Russia`, `VPN for Russians`, `Russian` + exit / bank / IP / address / card / hosting / provider / law / carrier / network / user / household, `Россия` / `в России` / `российский` / `РФ`.

**Approved instead:**

| Say | Not |
|---|---|
| home-country relay | relay in Russia, Russian relay |
| carrier-restricted networks | networks with whitelists, mobile internet in Russia |
| allowlisted IP ranges | whitelist, белые списки |
| apps that refuse VPN connections keep working | Sberbank works, banks work without toggling |
| local sites stay reachable, foreign sites are unavailable | internet works without обход блокировок |
| your network restricts direct foreign connections or only allows listed IP ranges | the one and only reason to choose the `relay` profile |

The Cyrillic terms are matched as stems: every case form fails, not only the dictionary form (`обхода блокировок`, `белых списков`, `Сбером`, `Россией`), while unrelated words such as `сбережения` pass.

**Circumvention framing** is banned as well, case-insensitive, by the guard's second check: `bypass(es|ing)? (the )?(block|censor|filter)`, `evad(e|es|ing) (block|censor|detect|filter)`, `circumvent`, `get around (the )?block`, `when (it'?s |you'?re )?blocked`, `unblock`, `keeps? working when`. The patterns are narrow on purpose, so "bypassing the relay" and "apps that refuse VPN connections keep working" pass. Say instead: "carrier-restricted networks", "local sites stay reachable, foreign sites are unavailable", "networks that detect or slow down plain WireGuard", "the tunnel is down".

**The name is Homeport**, one word, only the H capitalised. The old name `Burrow` fails the same guard, as a whole word in any case, everywhere except `CHANGELOG.md` (history), the rename record `docs/superpowers/specs/2026-09-26-homeport-rename.md` and the guard itself.
The Telegram bot link `t.me/burrow_vpn_bot` is allowed until #85 decides the bot; the allowed strings are listed in `.github/wording-guard.sh`.

What stays allowed: the *language* sense — "the panel is in Russian", `lang/ru.md`, `handout-ru.md` — because the server-side UI has a language and it has to be named. Provider files describe signup facts neutrally ("cards issued in some sanctioned countries are refused"), never by naming the country the user is in. Script logic and server paths (`/opt/vpn-kit`) are out of scope of the guard and of this section.
