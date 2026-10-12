---
name: client-pack
description: Build a bilingual client research pack — who they are, what they built, competitors with a page each, open source and free value, APIs, build-vs-base, first principles, plan — as a SISO-landing-styled static site behind a per-client login at research.sisolabs.space, plus agent-readable JSON. Use when Shaan asks to research a client or prospect, make a client or industry packet, share research with a client as a site, or reuse one of its pieces (product cards with 3D tiles, IN→OUT flow, docs sidebar, logo item pages, the per-folder login layer) on another static site.
---

# client-pack

**Home:** `~/SISO_Workspace/SISO_Agency/factory/siso-client-pack` (GitHub sisodias/siso-client-pack, private).
**Example:** `packs/donga-haus` → https://research.sisolabs.space/donga-haus/ (login in `research-site.env`, below).
**Pieces:** `COMPONENTS.md` (every component, what drives it, where it lives) · `METHOD.md` (stages, rules) ·
`schema/CONTENT.md` (content format) · `prompts/` (Haiku research + translation).

## The system in one breath
Haiku agents research → the lead (you) judges and writes `source/make_content.py` → `content.en.json` → Haiku translates
via id-frozen todo files → `bin/build.py` renders 150+ static pages (stdlib Python, one CSS, one JS) → `bin/check.py` →
`bin/deploy.sh` puts every pack behind its own login on one Cloudflare Pages project.

## First
1. `ls packs/`: does a pack for this client exist? Extend it; don't start again.
2. Super-App Forge registry (`superapp-forge` skill): is the industry already researched? Reuse it.
3. Read `METHOD.md` and `schema/CONTENT.md`; `COMPONENTS.md` when changing the look.

## Run
```bash
cd ~/SISO_Workspace/SISO_Agency/factory/siso-client-pack
bin/new-pack.sh <slug> "<Client name>"                 # skeleton: 11 pages, 5 groups, big number, flow
# research: Haiku agents with prompts/research.md §A–§K, parallel, background -> packs/<slug>/research, source
# lead: verify every repo on GitHub, write 07-first-principles + 00-SUMMARY, fill packs/<slug>/source/make_content.py
python3 packs/<slug>/source/make_content.py              # -> content.en.json
python3 bin/i18n.py extract packs/<slug> vi --chunks 6   # Haiku per chunk with prompts/translate.md (few strings: do it yourself)
python3 bin/i18n.py merge packs/<slug> vi                # -> content.vi.json ; fixes in i18n/vi/done-99-fixes.json
python3 bin/build.py packs/<slug> --serve                # http://127.0.0.1:8797 ; screenshot with camofox
python3 bin/check.py packs/<slug>                        # links, both languages, no TODO, no secrets
# login: add PACK_<SLUG>_USERS=Name1,Name2 and PACK_<SLUG>_PASSWORD=<Word-Word-Word-1234> to
#   ~/SISO_Workspace/.credentials/projects/SISO_Agency/factory/siso-client-pack/research-site.env
bin/deploy.sh                                            # every pack with a login -> https://research.sisolabs.space/<slug>/
```
Done = `check.py` 0 problems · without login 302 (browser) / 401 (agents) · `curl -u user:pw -L` 200 on every file ·
screenshots read (front door, inner, item, research; EN + VI; phone width) · committed via PR · Forge registry row updated.

## Rules
- Haiku gathers; the lead judges. Correct agent errors in the content itself. Translators must not spawn sub-agents.
- Cite or omit; label `[vendor]` / `[practitioner]` / `[analysis]`; date prices and stars; verify repos with `gh api`.
- **Honest big number:** the largest pool really searched, cited (GitHub 630M+ repos, Octoverse 2025), then how it narrowed
  (SISO bank 23,778 → verified by hand). Count sources and sites from `research/` + `source/`; never estimate.
- Each pack has its own login; a pack without one is not deployed. Still redact staff names, bug details, credentials,
  customer and production data: clients forward links. Give Shaan the username + password in chat; store them only in
  `research-site.env` (and a git-ignored handoff), never in git.
- Look: SISO landing outside (ring nav that takes each group's colour, orbit hero, IN→OUT flow, LibraryCard product cards
  with 3D tiles and window previews, horizon footer); docs sidebar grouped with 3D sprites, coloured page heroes, white
  paper blocks alternating with dark inside. Lion mark only, never the SISO wordmark. No npm, React or Tailwind.
- Add beside the design: new block = new `b_<type>` + CSS rule; new look = tokens/classes, not a second stylesheet.

## Traps already hit
- Pages 308-redirects `x.html` → `x`: test with `curl -L`. Port 8790 is taken (bifrost); serve on 8797.
- The landing's `.mov` 3D clips are HEVC-alpha (Safari only) → black boxes elsewhere; tiles float in CSS instead.
- A generic class name (`.core`) collided between two components; prefix new component classes.
- Slugs must be ASCII (NFKD fold, đ→d). Research `url` fields are sometimes prose ("Facebook groups"): only `http…` becomes a link.
- camofox `/viewport` can hang on remote pages; skip it there. zsh does not word-split `$var`: use `bash <<'EOF'`.
- A 3D/icon pool shared with the UI hub is wanted (see `.agents/tasks/`); until then use `template/assets/3d/`.
