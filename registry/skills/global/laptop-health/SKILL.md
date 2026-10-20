---
name: laptop-health
description: Diagnose and fix a slow or overloaded MacBook (load storms, full RAM, stray servers and browsers) with the laptop-health command. Use when Shaan says the laptop is slow, hot, laggy or "killing itself", when load is far above 8, before starting several heavy builds or test browsers at once, and when asked to kill zombie servers, old Chromes or leftover processes. Never kills agents.
---

# Laptop health

Shaan's MacBook (M1, 8 cores, 16 GB) runs flat out: 8-10 Claude sessions, DeepSeek and Codex workers, dev servers,
test browsers, a live stream. When it chokes, do not guess from one `top` snapshot. Run the command; it holds what was
learned the hard way. Its house is `~/SISO_Workspace/_data/worktrees/siso/live/estate/laptop-health` (read its `AGENTS.md` for the full playbook and the
known offenders), and its agent is herdr `LAPTOP`.

## Run it

```bash
laptop-health                # 10 s triage: power, CPU speed, load, RAM, strays; ranked causes with the fix
laptop-health load 30        # who makes up the load (share of runnable threads per process)
laptop-health churn 30       # what keeps starting processes (every fork/exec, by source)
laptop-health mem            # real memory by kind and the biggest processes
laptop-health strays         # leftovers, dry run;  laptop-health clean  stops them
laptop-health history         # battery vs charger timeline, agent sessions per hour
laptop-health hogs 15        # the load by owning agent pane + waste tips (local whisper, uncapped vitest, own Chrome...)
laptop-health hogs --tell    # ...and message those agents (only into an empty input box, once an hour per tip)
laptop-health servers        # every dev server: RAM, clients, folder, owning agent
laptop-health who <pid>      # which agent pane (or launchd service) a process belongs to
laptop-health tell <pane|name> "msg"   # safe one-line message to an agent pane
laptop-health watch          # last passes of the 10-min persistent job (com.siso.laptop-health-watch)
health                       # Shaan's way in: opens the laptop-health agent here (health codex|omp|siso, health tab)
```

`check` exits 0 healthy, 1 degraded, 2 critical; `laptop-health check --json` for agents. `load`, `churn` and the
CPU-speed probe use passwordless `sudo` (it works on this laptop).

## Order that pays off
1. **Power first.** On battery, Low Power Mode caps the P-cores at 828 of 3,204 MHz and load goes from 5-6 to 50-100.
   If `check` says so, the fix is the charger. Turning Low Power Mode off on battery is Shaan's call.
2. RAM (under ~400 MB free with GBs compressed), then `load`, then `churn`, then `strays`.
3. After a fix, run `check` again and report the numbers, not "fixed".

## Rules
- **Never touch an agent**: no killing Claude, omp or Codex processes or their panes, or anything an agent is using
  now. Name the heavy agent to Shaan instead.
- **Never free `heavy` slots held by `live-quiet`** (`sleep 2700` in a slot protects a live Oracle stream).
- `clean` stops only: dead or duplicate console waiters, dev/file servers whose starter is gone with no clients for 2 h+,
  your Chrome with no windows, agent Chromes whose owner is gone, the idle chrome-devtools-axi browser, and polling
  loops from ended sessions. Shaan's own servers are in `~/SISO_Workspace/_data/worktrees/siso/live/estate/laptop-health/keep.txt`; add to it when he says
  a thing is his.
- **Before you start heavy work yourself**, avoid the patterns in `~/SISO_Workspace/_data/worktrees/siso/live/estate/laptop-health/tips.json`: transcribe
  audio with Groq (Keychain `com.siso.groq-api`), not local whisper; `heavy -- vitest --maxWorkers=2`; `tsc-inc`;
  `shot` instead of your own Playwright Chrome; stop the dev server you started when you are done.
- A bug in someone else's tool: `estate report "<what, where, numbers>"`. New findings go in the house's
  `.agents/HANDOFF.md` and the known offenders table.

Resolve current module locations with `bin/siso where` in the live siso checkout: `siso.estate.core`, `siso.estate.laptop-health`, `siso.agents.harness`, and `siso.agents.zero`.
