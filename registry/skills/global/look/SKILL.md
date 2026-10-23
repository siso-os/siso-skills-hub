---
name: look
description: Use when Agent Zero needs current queue and seat status or must wait for dispatched work; wraps look, a0-await and waitfor without manual polling.
---

# Look and wait

Run `look` (or `look --json`) for Agent Zero's health, queue and fleet snapshot. Read the reds first.
After dispatch, run `a0-await SEAT` in the harness background facility; use `--all` for all named seats.
Its completion is the wake-up: read the returned report and integrate it in the same task.
For another completion condition, use `waitfor queue ID`, `waitfor job NAME`, `waitfor fleet NAME`, `waitfor pid PID`, or `waitfor asks OWNER`, with optional `--timeout SECONDS`. Start it in the harness background facility and wait for its exit.
Never treat a timeout, missing database or a short waiting response as completed work.
These commands are owned by `agents/zero/bin`; `fleet-check` is in `agents/harness/bin`.
