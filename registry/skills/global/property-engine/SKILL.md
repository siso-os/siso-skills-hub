---
name: property-engine
description: Run the prop CLI for the UK house search (listings, scoring, shortlist). Use only when Shaan asks about the property search.
disable-model-invocation: true
---

# Property Engine

One door: the `prop` CLI. Works on BOTH machines (auto-detects).
- laptop: `~/SISO_Workspace/personal/goals/uk-house-search/bin/prop`
- mini: `"/Volumes/SISO-STORAGE-VAULT 1/SISO-VAULT/property/bin/prop"` (via `ssh mac-mini`, add `-o RemoteCommand=none`)

## CLI

```bash
prop stats                                              # health check: row counts + freshness, PASS/FAIL
prop gems --lane forever --county Gwynedd --max-price 900000 --top 20
#   lanes: forever|flip|landbank|comparator (substring: 'forever' matches 'forever+flip')
#   --sort rank|wealth|multiplier|price|file  --watch  --json
prop comps "LL49 9YB" --type D [--beds 4 --tenure F --new-build N]   # inflation-adjusted Land Registry comps, JSON
prop listing 128740 [--json]                            # full record + price-cut signals + description text
```

## Where data lives (single-writer law)

LAPTOP IS CANONICAL; mini holds one-way replicas under `property/data/` (see its README.md).
- `~/SISO_Workspace/personal/data/uk-house-search/house-search.sqlite` — 25.6k LandSale listings, signals, text sections
- `~/SISO_Workspace/personal/data/uk-house-search/ukdata/ukprop.duckdb` — 31.35M PPD + 727k HPI + postcode cache
- `~/SISO_Workspace/personal/data/uk-house-search/raw/` — landsale-full + apify JSONL
- gems CSVs + all GQ-007 docs: `~/SISO_Workspace/.agents/jarvis/work/god-questions/out/gq-007/`
- Nightly 04:30 laptop→mini push: launchd `com.siso.property-sync` → `scripts/sync_to_mini.sh` (log: `data/uk-house-search/sync-to-mini.log`). `scripts/` is NOT auto-synced (mini collectors run from it).

## Re-running the pipeline

Full runbook: `out/gq-007/PIPELINE.md` (scrape → load → score → detail-scrape → enrich → value).
Scripts: `~/SISO_Workspace/personal/goals/uk-house-search/scripts/` (`scrape_landsale_full.py`,
`load_landsale_full.py`, `build_gem_list.py`, `ukdata/` for PPD/comps/enrichment — duckdb venv at `scripts/ukdata/.venv`).

## Doc map (all in out/gq-007/)

RESULTS.html (top-50 gems + memo) · VALUE-MAP.html · ROI-PLAYBOOK.html · VALUATION-MODEL.html ·
TASTE-CALIBRATION.html · ACTION-PLAN.html · DAILY-SIGNALS.html · FREE-DATA-REGISTRY.html ·
RESEARCH-AGENDA.html · OFFER-STRATEGY.html · PIPELINE.md · status files (*-STATUS.md)

## Fleet (mini launchd, do not break)

`com.siso.property-landsale` nightly LandSale rescrape + agency collectors
(`com.siso.property-{savills,knight-frank,strutt-parker,carter-jonas,brown-co}`) — scripts live in
mini `property/scripts/`; chain entry `nightly_landsale.sh`.

## Politeness contract (any new scraper copies it)

Pattern source: `scripts/scrape_landsale_full.py` — 1.5–2.5s jittered delay/page, backoff on
403/429, hard-stop + record the wall after 3 consecutive hard failures, resumable state file,
no signups, captcha = wall (record and skip). Robots.txt respected.
