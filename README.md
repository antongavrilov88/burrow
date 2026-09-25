# Burrow — the site

The landing page for [Burrow](https://github.com/antongavrilov88/burrow-skill), served at
<https://antongavrilov88.github.io/burrow/> by GitHub Pages from `docs/`.

**The skill itself lives at [antongavrilov88/burrow-skill](https://github.com/antongavrilov88/burrow-skill).**
This repository holds only the website, so that installing the skill does not drag a
marketing site into `~/.claude/skills/`.

## Layout

| Path | What |
|---|---|
| `docs/index.html` | The whole site — one self-contained file: markup, CSS and a small i18n script |
| `docs/og.png` | Social preview, 1200x630 |
| `docs/anton.jpg` | Portrait used in the bio |
| `docs/UX-REVIEW.md` | Standing UX review, findings ranked with effort, plus the performance budget |

## Working on it

```bash
cd docs && python3 -m http.server 8765   # then open http://localhost:8765
```

Deploys automatically on every push to `main` that touches `docs/`.

A language is one dictionary plus one `<option>`: add `DICT.xx = {…}` in the inline
script and an `<option value="xx">` in the header. With a single language the dropdown
hides itself.

## Checks

CI runs three: no secrets, no country-specific wording (`.github/wording-guard.sh`, rules
in `CONTRIBUTING.md`), and no leftover `{{placeholders}}` reaching `main`.

Before changing the page, read `docs/UX-REVIEW.md` §8 — it records the performance budget
the page is held to, and §1 the personas it is written for.

## Claims about the skill

The page states things about what the skill does. Those claims are checked against the
code in the other repository, not against intent — if you change a claim here, verify it
there first. A round of false claims once shipped because nobody did.

## License

MIT, same as the skill.
