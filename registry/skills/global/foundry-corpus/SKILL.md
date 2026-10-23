---
name: foundry-corpus
description: Query the Foundry information organ (repos, transcripts, insights, people) with the foundry CLI. Use when a question needs prior research or who-said-what evidence.
---

# Foundry — query the information organ (repos · transcripts · insights · people)

Shaan's Mac mini runs a 24/7 Foundry engine that continuously gathers and rates
the world's valuable dev data. This is the read primitive he asked for
(GQ-006): *"we have 1.2M repos on the mini but the agents don't know how to check
them — that should be baked into the harness… same for daily YouTube transcripts,
news, GitHub — all valuable data for our AIs to mine, learn from, and improve."*
Now it's one command.

## The tool

`~/.claude/skills/foundry-corpus/foundry`  (add the dir to PATH or call by full path).
A thin `foundry-corpus` alias covers the repos domain for back-compat.

It shells **read-only** `sqlite3 ...?mode=ro` (and `cat` for transcript bodies) to
the mini over Tailscale ssh — auto-detects and skips ssh if already on the mini.
It NEVER writes; the mini is the single writer (Foundry single-writer law). Add
`--json` to any subcommand for a machine contract (exit 0 ok · 3 NOT FOUND · 4
engine unreachable).

## The four domains + health

```bash
F=~/.claude/skills/foundry-corpus/foundry

# ── REPOS — the "assume it exists on GitHub, rob and adapt" reflex, pre-computed
$F repos "agent memory" --saucy --limit 15     # only high-value hits
$F repos "web framework" --lang Rust --min-stars 1000
$F repo karpathy/nanoGPT                        # one repo: card + WHY it's worth lifting
$F category                                     # the 264-cat value taxonomy
$F category "Agentic Coding" --saucy            # top saucy repos in a bucket

# ── TRANSCRIPTS — daily YouTube creator transcripts (search titles/channels, fetch body)
$F transcripts "orchestration" --done --limit 10   # videos with a fetched transcript
$F transcripts "" --channel "Anthropic" --done     # everything from one creator
$F transcript kR64LOqBBCU                          # fetch the full transcript body
$F transcript kR64LOqBBCU --head 40                # first 40 lines only

# ── INSIGHTS — the self-learning corpus (915 mined patterns, full-text search)
$F insights "subagent" --min-action 4              # best Claude-Code/skills primitives
$F insights "context window" --lane youtube

# ── PEOPLE — the god-source creator graph (GQ-003 lives here)
$F people                                          # top people by cross-platform layer count
$F people karpathy                                 # one person + their gh/x/youtube handles

# ── RESEARCH — the L4 harness: fan MiniMax over a God-source slice ON THE MINI, get a synthesized answer
$F research "What are the best patterns for giving coding agents persistent memory?" --saucy --limit 120
#   → slices the corpus, ≤8 MiniMax calls on the mini (429-abort guard), answer + evidence
#     land in ~/foundry-data/research/<date>-<slug>/ on the mini; answer streams to stdout.
#     ~45-90s. Use for corpus-wide "what's the best way to X" questions, not single lookups.

# ── HEALTH — freshness of every collector in one shot
$F status
```

## Search semantics (read this — it prevents 0-result confusion)

- **repos / transcripts** search is substring `LIKE` — matches the phrase
  VERBATIM. `"rust web framework"` finds nothing; `"web framework" --lang Rust`
  finds Rocket/actix-web/iron. **Rule: 1–2 keywords, push quality into flags**
  (`--lang`, `--min-stars`, `--saucy`, `--category`, `--channel`, `--done`).
- **insights** uses FTS5 `MATCH` — single keywords work best; multi-word is
  treated as an AND-ish phrase.
- A 0-result prints a hint and exits 3 (clean NOT FOUND, never a crash).

## Ratings you'll see

- **repos:** `saucy=1` (flagged super-valuable) · `overall/reuse/info_value` 0–100
  (reuse = code to lift, info = things to learn) · `value_type` CODE/INFO/BOTH ·
  `legal_lane` (e.g. `shippable`) · `why` (one line from the README).
- **insights:** `actionability` 0–5 · `source_lane` github/youtube · `source_creator`.
- **people:** layer flags `[YGR]` (YouTube/GitHub/Registry) + `layer_count` —
  3-layer people (Karpathy, Jensen, Willison) are the strongest god-source signal.

## Constraints & failure modes

- **Read-only, always.** No write path exists in this tool by design.
- **Engine dependency:** needs the mini reachable over Tailscale (`mac-mini`). If
  down → `ENGINE UNREACHABLE` exit 4 — fall back to normal search and note the
  organ was unavailable.
- **Freshness varies by lane** — run `$F status`. As of 2026-07-10: repos corpus
  is 1.36M cards / 245k categorized (categorizer runs guarded 02:00–08:00 nightly,
  so the categorized slice can lag a few days; uncategorized repos still return,
  just without ratings). Transcripts: 884 fetched, but the daily pull is degraded
  (YouTube IP-ban on the Tor path — being fixed); some still land. Insights: 915,
  fresh. People: 471.
- Override host/DBs via `FOUNDRY_MINI_HOST` / `FOUNDRY_IDENTITY_DB` /
  `FOUNDRY_QUEUE_DB` / `FOUNDRY_INSIGHTS_DB` / `FOUNDRY_PEOPLE_DB`.

## Where this fits

The four domains are Foundry's L1 content (repos, transcripts), L2 people, and L4
insights layers (see `SISO_Agent_Base/Foundry/FOUNDRY.html`). This skill is the
unified read surface — the harness primitive from GQ-006. Query it before you
blind-search; it's curated, rated, and instant.
