# Spec: rename Burrow → Homeport (repos, site URL, skill, plugin)

- **Issues:** #83 (repos and site URL), #84 (skill name, install paths, plugin, upgrade note). Part of epic #88.
- **Status:** draft for Anton's approval. Written by the team lead from Anton's decisions of 26 Sep 2026 (#88 comment) plus the facts below.
- **Gate (from #88):** nothing in this spec runs until Anton confirms the name is clear to use. Before that, only this spec and branches.

## 1. Decisions already made (Anton, 26 Sep 2026)

| # | Question | Decision |
|---|---|---|
| a | New names | Site repo `homeport`; skill repo `homeport-skill`; skill, plugin and marketplace all named `homeport`. |
| b | How the old site URL survives | A small redirect site keeps `https://antongavrilov88.github.io/burrow/` alive and sends visitors to the new URL. The *where* is §3; it needs approval because of a GitHub constraint found while writing this spec. |
| c | Rename in place or recreate | **Rename in place** (both repos). It keeps issues, PRs, stars, the board and release history, and GitHub redirects the old repo and git URLs. Recreating would lose all of that. |

## 2. What GitHub does on a rename (facts)

Source: [Renaming a repository](https://docs.github.com/en/repositories/creating-and-managing-repositories/renaming-a-repository).

- **Redirected automatically:** web pages, issues, wikis, stars and followers, plus `git clone` / `fetch` / `push` against the old URL.
- **Not redirected:** GitHub Pages **project site URLs**. `antongavrilov88.github.io/burrow/` stops working the moment the site repo is renamed.
- **Not redirected:** calls to a GitHub Action hosted in the renamed repo. Neither repo publishes an Action, so this doesn't affect us.
- **Reusing the old name:** if a *new* repository is later created with the old name, the redirects to the renamed repository stop working.

The last point rules out the obvious stub: a new repo called `burrow` would keep the old *site* alive, but it would break every `github.com/antongavrilov88/burrow…` link. That includes issue links, cross-references in the other repo, and the git remote of every existing clone.

## 3. Keeping `…github.io/burrow/` alive without reusing the name

**Proposed (needs approval): a user site that serves `/burrow/`.**

1. Create the user-site repository `antongavrilov88.github.io`. It doesn't exist today. Its Pages site is served at `https://antongavrilov88.github.io/`.
2. In it, add the folder `burrow/`:
   - `index.html`: a redirect to `https://antongavrilov88.github.io/homeport/` that keeps the `#fragment`. That's a `<meta http-equiv="refresh">` plus a one-line `location.replace` script, `<link rel="canonical">` to the new URL, and a visible "Homeport moved here" link for no-JS visitors.
   - `og.png`: a copy of the current share image. Links already shared in Telegram and LinkedIn point their preview image at `…/burrow/og.png` (`docs/index.html:10,15`), and an HTML redirect can't serve an image.
   - `404.html` at the user-site root: sends `/burrow/<anything>` to the matching `/homeport/<anything>`, so deep links like `/burrow/#free` or `/burrow/anton.jpg` keep working.
3. Nothing at the root of the user site is needed now. A root `index.html` pointing to Homeport is optional.

**Why this works:** while the `burrow` repo has Pages, the project site owns the `/burrow/` path. After the rename, no project claims `/burrow/`, so the user site's `burrow/` folder is served.

**Assumption to verify:** GitHub's docs don't state which one wins when both a project site and a user-site folder claim the same path. The plan therefore checks it with a throwaway path *before* the rename (step R1), not afterwards. Also, no repo named `burrow` is ever created again, so the repo and git redirects stay intact.

**Fallbacks, if R1 fails or Anton prefers:**
- **(i) A custom domain** set before the rename. This is GitHub's own recommendation. It costs a domain (burrow#3), and the URL no longer depends on the repo name at all.
- **(ii) The stub repo named `burrow`**, accepting that old repo and issue links break.

## 4. The skill (`#84`)

### 4.1 Names and paths

| Thing | Today | After |
|---|---|---|
| Skill repo | `antongavrilov88/burrow-skill` | `antongavrilov88/homeport-skill` (the old URL redirects, §2) |
| `SKILL.md` frontmatter | `name: burrow` | `name: homeport` |
| Wrapper folder | `skills/burrow/SKILL.md` | `skills/homeport/SKILL.md` |
| Marketplace (`.claude-plugin/marketplace.json` `name`) | `burrow` | `homeport` |
| Plugin (`plugin.json` `name`, marketplace entry) | `burrow` | `homeport` |
| Install via plugin | `/plugin marketplace add antongavrilov88/burrow-skill` → `/plugin install burrow@burrow` | `/plugin marketplace add antongavrilov88/homeport-skill` → `/plugin install homeport@homeport` |
| Invocation | `/burrow:burrow` (plugin), `/burrow` (copied) | `/homeport:homeport`, `/homeport` |
| Copy install | `git clone …/burrow-skill ~/.claude/skills/burrow` | `git clone …/homeport-skill ~/.claude/skills/homeport` |
| Release asset | `burrow-skill.zip` containing `burrow/` | `homeport-skill.zip` containing `homeport/` |
| `homepage` in both manifests | `…github.io/burrow/` | `…github.io/homeport/` |
| Server paths `/opt/vpn-kit`, `/root/vpn-kit` | unchanged | **unchanged**, so the tested installers stay byte-identical |
| Panel strings (`scripts/payload/`) | unchanged | unchanged. They ship with burrow-skill#11 |

`scripts/` and `references/` don't contain the word "burrow" today (grep, 26 Sep), so #84 touches no installer file.

### 4.2 Files that must change together (CI enforces some of these)

- `.github/workflows/ci.yml:25–29`: the wrapper path `skills/homeport/SKILL.md`, and the assert `plugin["name"] == "homeport"`.
- `.github/workflows/release.yml:1,18,22–27`: `grep -q '^name: homeport'`, `dist/homeport`, `homeport-skill.zip`.
- `.claude-plugin/plugin.json`, `.claude-plugin/marketplace.json`: `name`, `homepage`, `repository`.
- `SKILL.md`, `skills/homeport/SKILL.md` (moved with `git mv`), `README.md` (install, update and upgrade sections), `CONTRIBUTING.md`, `SECURITY.md`.
- The description keeps "burrow" as a search word for one release (#84 criterion 4).

### 4.3 Upgrading existing installs

**Facts (Claude Code docs):**
- **A marketplace is registered locally under the `name` in its `marketplace.json`**, not the repo name. It's stored in `~/.claude/plugins/known_marketplaces.json` (source: [create-marketplace](https://code.claude.com/docs/en/plugins/create-marketplace.md), [loading](https://code.claude.com/docs/en/plugins/loading.md)). Existing users therefore have a marketplace called `burrow`.
- **Renaming a *plugin* inside a marketplace is migrated automatically** by a top-level `"renames": {"burrow": "homeport"}` in `marketplace.json`. Claude Code rewrites `enabledPlugins` from `burrow@…` to `homeport@…`. This needs Claude Code **v2.1.193 or later** (source: [host-marketplace → Rename or remove a plugin](https://code.claude.com/docs/en/plugins/host-marketplace.md)).
- **Renaming the *marketplace* itself** (`burrow` → `homeport`) is **not documented**: neither the `renames` map nor any other mechanism covers it.
- **After a repo rename, `marketplace update` should keep working** through GitHub's git redirect. That's an inference from git behaviour, not documented, and it's checked in step R3.

**Plan:**
1. In `marketplace.json`: rename the plugin to `homeport`, add `"renames": {"burrow": "homeport"}`, and set the marketplace `name` to `homeport` (Anton's decision).
2. Because the marketplace rename isn't documented, existing plugin users follow a short **"Upgrading from Burrow"** note in the README (#84 criterion 3), one command per block.

   In Claude Code:
   ```
   /plugin marketplace remove burrow
   ```
   ```
   /plugin marketplace add antongavrilov88/homeport-skill
   ```
   ```
   /plugin install homeport@homeport
   ```
   From a shell, use the same three steps with `claude plugin marketplace remove burrow`, `claude plugin marketplace add antongavrilov88/homeport-skill` and `claude plugin install homeport@homeport`. Then restart Claude Code.

   For copy installs:
   ```bash
   rm -rf ~/.claude/skills/burrow
   ```
   ```bash
   git clone https://github.com/antongavrilov88/homeport-skill ~/.claude/skills/homeport
   ```
3. **Test before release (step R3):** on a machine with `burrow@burrow` 0.3.x installed, run `claude plugin marketplace update burrow` against the renamed branch. Record what Claude Code actually does (auto-migrates / errors / duplicates) and adjust the note to match. If the rename turns out to migrate cleanly, the note shrinks to "update as usual".
4. **Search:** the skill `description` keeps "formerly Burrow" for one release (#84 criterion 4). `plugin.json` also gets `"keywords": [..., "burrow"]`, since the manifest reference documents `keywords` as discovery tags.
5. **Folder name:** the directory stays equal to `name` (`skills/homeport/`, and `~/.claude/skills/homeport` for copy installs). Claude Code allows them to differ, but the open Agent Skills convention expects them to match, and #84 criterion 1 asks for it.

## 5. The site (`#83` side)

- Repo `burrow` → `homeport`. The Pages source stays "GitHub Actions" (`pages.yml`), and the new URL is `https://antongavrilov88.github.io/homeport/`.
- `docs/index.html` `og:url`, `og:image` and `twitter:image` switch to the new absolute URLs. The link and string sweep itself belongs to #86 and #87. #83 only has to keep the site reachable at both URLs.
- The bot handle `t.me/burrow_vpn_bot` (landing lines 370, 587) is #85 and out of scope here.

## 6. Order of operations (after the gate lifts)

| Step | Action | Who | Check |
|---|---|---|---|
| R1 | Create `antongavrilov88.github.io` with a throwaway `probe/index.html`; confirm `https://antongavrilov88.github.io/probe/` serves it | lead | `curl -I` → 200 |
| R2 | Add `burrow/` (redirect `index.html`, `og.png`) and the root `404.html` to the user site; push | lead | While the project still exists, `/burrow/` still shows the project: confirms the project wins |
| R3 | Merge the #84 PR (skill rename inside the repo) to `homeport-skill`'s `dev`. Build and verify it on a branch first | lead | burrow-skill CI green under the new names |
| R4 | **Rename repos**: `burrow-skill` → `homeport-skill`, then `burrow` → `homeport` (Settings → Rename, or `gh repo rename`) | Anton, or the lead with Anton's go | `git ls-remote` on both old URLs still works |
| R5 | Re-run the Pages deploy on `homeport` | lead | `…/homeport/` → 200; `…/burrow/` → redirect; `…/burrow/og.png` → 200; `…/burrow/#free` → `…/homeport/#free` |
| R6 | Update the local remotes (`git remote set-url`) and the project board check (items still listed) | lead | board shows both repos' issues |
| R7 | Release the skill (0.5.0, minor: install paths change) with the upgrade note; then #86 and #87 sweep the strings and links | lead, Anton approves merges to `main` | #88 "done when" greps |

**Rollback:** renaming back is possible until someone creates a repo with the old name. The user-site redirect can be deleted at any time.

## 7. Out of scope

- Strings across both repos and the wording-guard rule: #86.
- The published-links table: #87.
- The bot: #85.
- Identity assets: #81, #82, burrow-skill#16.
- The panel title and favicon: burrow-skill#11.

## 8. Approval

- [ ] Anton approves §3 (user-site redirect instead of a stub repo named `burrow`), or picks fallback (i) or (ii).
- [ ] Anton approves §4 names, paths and the upgrade note.
- [ ] Anton confirms the name is clear, which lifts the gate. Until then, only R1 (harmless probe) may run.
