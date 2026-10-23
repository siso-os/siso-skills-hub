---
name: fleet-check
description: Use when asking what agents are doing, which seat is stuck or why a run stopped; run fleet-check for current evidence before reading transcripts.
---

# fleet-check

Agent Zero, 15 Oct: "I did this by hand three times today; make it one command."

```
fleet-check                 # every seat, one line each, problems under it (~0.5 s)
fleet-check --problems      # only seats with something wrong
fleet-check --seat HALO     # one seat, with its last message in full
fleet-check --json          # for screens and loops
fleet-check --stuck-min 20  # how quiet a "running" run must be to count as stuck (default 10)
```

It reads SISO Code's database read-only (`~/.local/state/siso-code/userdata/statev2.sqlite`), the seat map
(`~/.local/state/agent-base/t3-seats.json`) and the Claude transcripts. It never writes and costs no model tokens.
Source: `SISO_Agents/siso-harness-lab/bin/fleet-check`; the turn classes come from
`siso-harness-lab/.agents/efficiency/failures.py`.

## What each flag means and what to do

| Flag | Means | Do |
|---|---|---|
| STUCK | run "running", but no SISO Code event and no transcript write for 10+ min | interrupt the run in SISO Code; its queued messages then start |
| BEHIND | messages queued behind a stuck run | clear the stuck run first |
| QUEUED | messages queued with no run going: they never start by themselves | send the thread a new message, or cancel the stale queue items |
| STOP | ended on "Next I'm X" instead of doing X | tell the seat "do X now" |
| WAIT / RULE | waiting on another seat, or a made-up rule ("belongs to X", "not mine to build") | "build it in X's repo by branch + PR, merge on green `siso-ci`" |
| OFFER | "If you'd rather …, say so" | "choose and do it" |
| PARKED | said "I'll … when/once …" and nothing has woken it | check the background job; if it died, tell the seat to rerun and wait in the same turn |
| UNFINISHED | said "X of Y" with X < Y and has been idle since | tell it to finish the rest |
| ENDED | the last run failed, was interrupted or cancelled | read `--seat` and resend |

Flags are pattern matches on the seat's own words: read the quote before relaying. One message per seat, never a
command for Shaan to run.
