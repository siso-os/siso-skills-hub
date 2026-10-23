---
name: disk-cleanup
description: "disk-cleanup \u2014 reclaim space on the MacBook, keep every byte of code"
---

# disk-cleanup — reclaim space on the MacBook, keep every byte of code

Shaan's laptop fills up regularly (99% full is normal). The space is ALWAYS in the same
places. This skill is the map + the playbook so you never re-scan from scratch.

**Golden rule: code is sacred, everything that regenerates or lives elsewhere is fair game.**
Never delete source, git-tracked files, canonical DBs, memory/, or app-data that holds state
you can't rebuild. When unsure → classify by reading (`classify-by-reading` skill), don't guess.

---

## 0. One-shot: how to run this

```bash
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"   # mole/brew not on default PATH
mole status                 # quick capacity read
mole analyze --json         # full scan → JSON (moves to Trash, not hard-delete)
mole clean --dry-run        # preview what the safe tiers would remove
```

If `mole` is missing: `brew install mole`. It's the workhorse scanner (single binary,
`--json`, `--dry-run`, moves to Trash via Finder). We wrap it — we don't re-implement `du`.

Fallback capacity check (always works): `df -h /System/Volumes/Data`

**Fan-out for the deep scan.** When you need the full per-region breakdown (not just mole's
buckets), dispatch ONE background Haiku worker per region below in parallel (read-only, return
a size table + tier verdict). Never `du -sh` a 150G tree in the main thread — it's slow and
clouds context. See the `fan-out` skill.

---

## 1. THE DISK-MAP — where the space always is (verified 2026-07-10)

Home total ~355G. The whales, biggest-first:

| Region | Typical size | What's in it |
|--------|-------------|--------------|
| `~/SISO_Workspace` | ~158G | THE whale. Code (keep) + node_modules + `_archive` + Foundry corpus |
| `~/SISO_Workspace/SISO_Agency` | ~64G | Active apps (oracle-streaming etc.) — code KEEP, but heavy node_modules + release DMGs + `.next`/`dist` to prune |
| `~/SISO_Workspace/SISO_Agent_Base` | ~53G | Agent home + Foundry corpus/research (`foundry/research/wild*`) + node_modules. Corpus/research → MOVE TO MINI; code KEEP |
| `~/SISO_Workspace/_archive` | ~28G | Dated cleanup snapshots (cleanup-YYYY-MM, vault-sweep, laptop-cleanup). **Read-only historical → MOVE TO MINI wholesale.** |
| `~/Library` | ~64G | Application Support ~34G (mostly app-data KEEP) + Caches 9G + pnpm 4.2G. Reclaimable ~15G |
| `~/Pictures/Photos Library` | ~11G | USER-DATA — never touch without asking |
| node_modules (scattered) | ~10-13G | Regenerable via `pnpm/npm install` |
| `~/Library/pnpm` (store) | ~4.2G | Regenerable — `pnpm store prune` |
| `~/.codex/sessions` | ~6.7G | Codex history — prune OLD only, keep recent |
| Docker.raw + old DMG installers | ~6.5G | Safe-delete |

---

## 2. TIERED KILL-LIST — act top-down, stop when you've cleared enough

### TIER 1 — SAFE-DELETE, no questions (regenerates or is pure junk) → ~30-40G
Do these first, no heads-up needed (nothing lost):

- **`_archive` → move to mini, then delete local** (~28G). Biggest single lever. It's read-only
  history (CLAUDE.md marks it so). `rsync -a --remove-source-files ~/SISO_Workspace/_archive/ <mini>:/vault/archive/` — but confirm mini reachable first (Tailscale). If mini down, this tier is blocked; skip to caches.
- **Regenerable caches** (~15G): `~/Library/Caches/{ms-playwright,Arc,com.openai.codex,Google}`,
  `~/Library/Application Support/{Chromium,discord,Arc}` cache dirs. `mole clean` handles these.
- **Package-manager caches** (~7G): `pnpm store prune`; `npm cache clean --force`;
  `bun pm cache rm`; `uv cache clean`; nuke `~/.cache/{zig,uv}`.
- **Old DMG installers + build artifacts** (~6.5G): `*.dmg` in Downloads/Desktop, oracle-streaming
  release DMGs, `Docker.raw` (if Docker idle: `docker system prune -a --volumes`).
- **Archive venvs + archived_sessions** (~1.5G): `_archive/**/venv`, `~/.codex/archived_sessions`, `~/.claude/_backups`.
- **Trash**: `rm -rf ~/.Trash/*` (or empty after mole moves things there).

### TIER 2 — REGENERABLE but has a cost (reinstall/rebuild needed) → ~15G
Clear if Tier 1 wasn't enough. All restore on next build:
- node_modules in **non-active** projects (`_archive`, `*-clone`, corpus, research, merged worktrees). KEEP active: oracle-streaming, isso-dashboard, freeflow, collegebesties, SISO_Agent_Base, .hermes.
- `.next` / `dist` / `build` dirs. `~/.rustup` + `~/.cargo` (2.8G) only if no Rust project active.

### TIER 3 — needs judgment / a heads-up first (per-item review, may hold state)
Only with Shaan's nod, and classify-by-reading first:
- `~/.codex/sessions` (6.7G), `~/.claude/projects` (2.8G), `~/.hermes` (2.5G) — prune OLD entries, never blanket-delete (live session/brain state).
- `~/.codex/logs_2.sqlite` — `VACUUM`, don't delete.

### NEVER TOUCH (KEEP)
Source code, anything git-tracked, `.SystemDB/sisosystem.db`, `memory/`, `.agents/jarvis/`,
Photos Library, WhatsApp/Claude/SISO-Voice/Oracle app-data, `personal/`.

---

## 3. macOS reclaims some for free
Local APFS snapshots hold space the OS releases on demand. Force it:
`tmutil thinlocalsnapshots / 999999999999 4`

---

## 4. The move-to-mini pattern (doctrine: mini=engine, laptop=cockpit)
Corpus/scraped-data/archives belong on the Mac mini's 5TB vault, not the laptop. Before moving:
1. Confirm mini reachable: `ping -c1 <mini-tailscale>` or the herdr/foundry mini check.
2. `rsync -av --remove-source-files <src> <mini>:/vault/<dest>/` (verify transfer completed before the source is gone — rsync only removes files it confirmed copied).
3. Log the move to `memory/journal.md` so we know where it went.
If mini is offline (see `mini_offline` memory), move-to-mini tiers are BLOCKED — do cache tiers only.

---

## 5. Close-out
- Re-check free space: `df -h /System/Volumes/Data` — report before/after delta.
- If you moved anything to mini, note the destination path in the journal.
- Update this map's numbers if a region has grown/shrunk materially since 2026-07-10.
