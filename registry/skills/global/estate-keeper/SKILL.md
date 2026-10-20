---
name: estate-keeper
description: Keep Shaan's laptop estate clean while you work. Use before you create, clone, download, move, rename, archive or delete any folder, repo, worktree or file under ~ or ~/SISO_Workspace; when you need a key or .env; when you make something big; when you find a stray, a second copy or a misplaced folder that is not your task (report it with `estate report`, never ask Shaan); and before you end a session that made files. Tells you where things go, the one command for each move, and how to report a mess you find.
---

# Keep the estate clean

Everything on this laptop has one home on one map: `~/SISO_Workspace` is the private repo `sisodias/siso-city`, and
every repo sits at one path in it. Shaan's goal: the dumbest agent finds anything, and nothing lives in two places.
You keep it that way by following six habits. The Estate Manager (herdr agent `ESTATE`, repo
`~/SISO_Workspace/_data/worktrees/siso/live/estate/core`) cleans up after the fact; this skill stops the mess being made.

## 1. Look before you make anything

```bash
estate where <words>      # best homes for a thing, with its GitHub repo
estate path <words>       # just the path:  cd "$(estate path oracle)"
estate map                # the districts
```

If it exists, use it. Do not make a second copy, a `-v2`, a `-new` or a clone "just to look".

## 2. Put new things where the legend says

Ask the map, not this page: `estate new <island>/<compound>[/<building>] --what "..."` dry-runs the placement, names
it, and refuses a second building for a job that already has an owner (`--run` makes it). The rule behind it is
`~/SISO_Workspace/_data/worktrees/siso/live/estate/core/docs/LEGEND.md` §5, three questions in order: which part of the business does it serve;
does something already do this job; is it code, data or a run.

| It serves | It goes in |
|---|---|
| a partner agency's own systems | `SISO_Agency/partners/<agency>/` (HALO is still at `HALO_Agency/` until its move) |
| one of a partner's clients | `SISO_Agency/partners/<agency>/clients/<brand>/` |
| a client that came without a partner | `SISO_Agency/clients/<brand>/` |
| how SISO runs itself (sites, HQ, industries) | `SISO_Agency/hq/<function>` |
| every partner, as a module built once / as the way SISO builds | `SISO_Agency/apps/<product>` / `SISO_Agency/factory/` |
| the agents that do the work (Agent Zero: `agent-zero/`) | `SISO_Agents/<job>` |
| knowledge, research, banks, code kept to learn from | `Great_Library_of_SISO/` |
| Shaan's life | `personal/` |
| data (databases, uploads, client PII) | a data plane (`estate data`), never a repo |
| a run: worktree, scratch, a test's temp folder | `_data/worktrees/<repo>/<lane>` or scratch, never inside a building |
| anything retired | `_archive/YYYY-MM-DD-subject/` with a line in its `MANIFEST.md` |

Rules the map is built on:
- **Folder name = GitHub repo name.** New repos are private under `sisodias`.
- **Never add a folder at the top of `~/SISO_Workspace` or in `~`.** `estate doctor` fails on it.
- **No compat links, no symlinked second paths.** One path per thing.
- **Nothing in Downloads, Desktop, Documents or `~` that you made and want kept.** Put it in its district.

### Hidden folders (ADR 0015)

- **`.agents/` is the one state root in a repo** (ADR 0029). Each seat writes only
  `.agents/agents/<seat>/{memory/,HANDOFF.md,notes/,lessons/,session-context/}`. `.agents/memory/` is reviewed repo-wide
  facts only. Cross-project state follows the same layout in `~/SISO_Workspace/.agents/`.
  Keep existing mixed state read-only; the harness importer copies it without removing or overwriting originals.
  Do not start a `.memory/`, `.plans/`, `.scratch/`, `.orchestrate/` or `.tasks/`.
- `.claude/`, `.codex/`, `.cursor/` hold that harness's config only. `.uihub/` is the UI loop (siso-project-os).
- Tool state (`.omc/`, `.playwright-cli/`, `.wrangler/`, `.serena/cache/`) and per-agent runtime state are never
  committed; the machine-wide git ignore already hides it.
- A hook (`estate-guard`) blocks a new folder at the top of `~/SISO_Workspace` or in `~`, and a worktree outside
  `_data/worktrees/`. If it blocks you, it says where the thing goes.

## 3. The one command for each move

```bash
E=~/SISO_Workspace/_data/worktrees/siso/live/estate/core
python3 $E/tools/houses.py house <folder> --repo <name> --why "..."    # loose work becomes its own private repo
python3 $E/tools/houses.py sync <folder> --why "..."                   # every branch, stash and edit up to GitHub
estate move <src> <dst> --no-link --why "..."                          # move a folder; records it, repairs worktrees
python3 $E/tools/repoint.py <files that named the old path>            # then fix whatever used the old path
python3 $E/tools/houses.py retire <folder> --why "..." [--plane NAME]  # plan taking it off the laptop; add --run to do it
estate restore --only <map path> --run                                 # bring a retired repo back, keys included
python3 $E/tools/reference-index.py drop <clone> --why "..."           # drop a third-party clone upstream still holds
```

- **Never `mv` or `rm -rf` a repo or a folder other agents use.** Use `estate move` or retire. A plain `mv` breaks
  worktrees, launchd jobs, links and every note that names the path.
- **Nothing is deleted without proof.** Read it first (`classify-by-reading`). Then archive it, with a MANIFEST line.
  Delete only what GitHub or upstream provably holds.
- **When your branch is merged, remove its worktree** (`git worktree remove`) and push the branch first.

## 4. Keys and big files

- **Never commit a key.** Put it in the repo's ignored `.env` and have the code read it as `${NAME}`. Then copy it into the
  credentials store with `python3 $E/tools/houses.py keys <repo>`. That puts it at `~/SISO_Workspace/.credentials/projects/<map path>/`,
  which is backed up encrypted, and `estate restore` puts it back.
- **Found a key already committed?** Stop and tell `ESTATE`. The history has to be rewritten on GitHub too, not just in the file.
- **Big or binary data does not go in git.** That means corpora, recordings, databases, exports and anything over 10 MB.
  Keep it under `_data/`, or in the project's ignored folder with an encrypted data plane. The planes are listed in
  `$E/plan/data-planes.json`; ask `ESTATE` to add one.
- **HALO code is never copied off Cam's repo** (`HALO_Agency/crm`). Not into sisodias, not into notes, not into a backup.

## 5. Other agents' work

Run `git status` before any git action. **Never stage, reset, stash or overwrite what you did not write.** Commit only
your own paths (`git commit -- <paths>`). Run `herdr agent list` to see who else is in a repo. Only `estate` commits at
the top of `~/SISO_Workspace`.

## 6. Before you end

1. Your branch is pushed. Nothing you made is only on this laptop unless it belongs in a data plane.
2. Scratch files are gone. Use `mktemp -d "${TMPDIR%/}/.siso-ephemeral-<task>.XXXXXX"` with an exit trap.
3. If you created, moved or retired any folder, run `estate refresh --maps-only` to rebuild district doors and the laptop map from existing
   inventory, then run `estate doctor`. It must show 0 failures. Hourly `estate refresh --light` remains maintenance;
   `--maps-only` uses the existing inventory and does not run that maintenance.
4. **Found a mess outside your task?** That means a second copy, a folder in the wrong district, loose files with no
   home, a stray in `~`, or a key in a file. Do not fix other people's things in passing. Report it and carry on:
   ```bash
   estate report "<what you found, and where>"    # one line in the Estate Manager's inbox; read at its next boot
   ```
   Do not ask Shaan about it and do not fix it in passing.
   The inbox is `~/SISO_Workspace/_data/worktrees/siso/live/estate/core/.agents/INBOX.md`; `estate brief` shows it.

## Where the detail lives

`~/SISO_Workspace/AGENTS.md` is the city map. `~/SISO_Workspace/_data/worktrees/siso/live/estate/core/AGENTS.md` and its `docs/adr/` hold the rules and why.
The Estate Manager's own skills are in `~/SISO_Workspace/_data/worktrees/siso/live/estate/core/.claude/skills/` (move, house and retire, backups and
secrets, delete and archive, Downloads).

Resolve current module locations with `bin/siso where` in the live siso checkout: `siso.estate.core`, `siso.estate.laptop-health`, `siso.agents.harness`, and `siso.agents.zero`.
