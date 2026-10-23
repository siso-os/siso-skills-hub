---
name: herdr
description: "herdr \u2014 agent skill"
---

# herdr — agent skill

before using this skill, check that `HERDR_ENV=1`. if it is not set to `1`, say you are not running inside a herdr-managed pane and stop. do not inspect or control the focused herdr pane from outside herdr.

you are running inside herdr, a terminal-native agent multiplexer. herdr gives you workspaces, tabs, and panes — each pane is a real terminal with its own shell, agent, server, or log stream — and you can control all of it from the cli.

**Siblings:** this skill = mechanics (drive one pane correctly). `agent-comms` = the four messaging moves for any agent. `orchestrate` = policy for running a whole fleet (status contracts, admission control, rehydration). If you're about to run >3 persistent workers on one project, load `orchestrate` too.

---

## ⚖️ THE LAWS — if you read nothing else, obey these

1. **Absolute path, always: `~/.local/bin/herdr`.** Bare `herdr` is "command not found" in most spawned shells (PATH gap — the #1 silent failure), and `/opt/homebrew/bin/cmux` is a stale wrong binary. Export once per pane that will call it: `export PATH="~/.local/bin:$PATH"`. When you brief a worker that must message peers, put the absolute path in its brief — it does not inherit yours.
2. **A pane id is a position, not a name.** Pane ids renumber when panes/tabs/workspaces close. Never cache one across turns; re-resolve from `pane list` immediately before every send. For anything you'll address more than once, use a **durable handle**: the agent **name** (give one at `agent start`, or `agent rename`) or the `terminal_id` — both survive renumbering (see §addressing).
3. **Enter gets swallowed in agent TUIs.** `pane run` = text + Enter, but Claude/Codex panes frequently eat the Enter and the message sits unsent in the input box. Protocol: send → `sleep 2` → read the pane back → if the text is still queued, `pane send-keys <id> Enter`. Never trust a send you didn't verify. Never use `send-text` alone (it never presses Enter). Strongest confirmation isn't the text disappearing — it's `agent get <id>` flipping to `working`/`blocked` within ~1s of the Enter (§sharp-edges #3). Retry the Enter only; never retype the text.
4. **Your workers live in YOUR lane.** Spawn into your own workspace (or a new workspace you create for the team) — never into another agent's workspace or tab. If you didn't create a workspace and can't identify its owner as you, it's not yours to spawn into.
5. **One agent per tab.** A tab is one worker's lane. Pane splits inside a tab are ONLY for support processes of that same worker's task (its dev server, its logs, its test loop) — never a second agent. Ten agents in one tab is an illegible wall nobody can route to.
6. **Reuse before spawn.** `pane list` first, every time. If a pane with your label/lane already exists (idle or done), send it the next task instead of spawning a twin. Duplicate lanes are how the workspace rots.
7. **Name everything at birth.** Workspace label = project. Tab label = lane role (`JARVIS-RESEARCH`, `codex-review`). Agent name = same slug via `agent start <name>`. An unlabeled pane is unaddressable and will be mistaken for trash (or worse, kept forever because nobody dares close it).
8. **A pane is for a lane you'll watch or converse with.** One-shot jobs (a single audit, a bounded research question, a bulk transform) go headless — Agent tool with `model: haiku`, `haiku-dispatch`/`mini-headless`, or `codex-dispatch` — NOT a new pane. Panes are persistent team members; headless is piecework.
9. **Clean up after yourself.** Worker done and lane retired → close its tab. After any spawn → kill the orphan root shell (§spawning). Periodically audit: every tab you own should read `panes 1` (or 1 agent + its support splits) and carry a label. Bare shells and `done` panes left around are workspace litter.
10. **Identify yourself in every message** (`[from: X] @Y: ...`) and only message panes you positively identified first. A misrouted instruction is worse than a late one.

---

## 🔪 verified sharp edges — empirical herdr facts (id: sharp-edges)

Third-party verified QA of this exact binary (firstmate project's herdr adapter work, herdr 0.7.1–0.7.3, 2026-07; receipts: `SISO_Agent_Base/research/firstmate/docs/herdr-backend.md`). These are measured behaviors, not folklore:

1. **`pane read --lines N` returns COMPLETELY EMPTY when N < the pane's viewport height.** Reproduced by binary search on a 23-row pane: `--lines 5/6/8/15` → zero bytes; `--lines 24+` → correct clamping. Any small read (`--lines 6`, `--lines 40` on a tall pane) can silently return nothing and look like a dead pane. **Rule: always request a generous floor and trim locally** — `pane read <id> --source recent --lines 200 | tail -n 40`.
2. **`agent get` reads `idle` during a long foreground tool call.** An agent blocked minutes inside its own tool (build, pipeline, long bash) has finished its generation turn — `agent_status` reports idle/blocked even though the pane still renders the busy banner. **Rule: trust only a bare `working` verdict outright; corroborate `idle`/`unknown` against pane content (busy banner regex, e.g. "esc to interrupt") before concluding a worker is stalled or safe to interrupt.** A genuinely human-blocked agent (permission dialog) shows no busy banner — the corroboration still reads it correctly as not-busy.
3. **Submit confirmation: watch `agent_status`, not the text.** For `/`- or `$`-prefixed sends, the first Enter may only close the autocomplete popup or expand an argument placeholder (measured on `/no-mistakes`, `/compact`) — the text visibly *changes*, which fools content-delta checks, while the command is still unsent. Real submission flips `agent_status` to `working`/`blocked` within ~0.09–0.5s (measured over 10 trials on claude + codex). Settle ~1s before the first Enter on slash commands; on failure retry **Enter only, never retype**.
4. **Idle composers show ghost text.** Claude renders rotating prompt suggestions as SGR-2 dim; Codex renders faint tips; these read as "pending input" in plain captures. Use `pane read --format ansi` and treat dim/faint and dark-truecolor runs as empty before deciding a composer holds a real draft.
5. **`HERDR_SESSION` env alone does NOT reliably target a named session once another herdr server is running** — the client silently falls back to whatever server IS running. And `herdr server stop` takes no target: it acts ambiently (this killed a live production session twice in their fleet — and matches our own 2026-06-08 burn scar). **Rule: destructive ops (`session stop`/`session delete`) always with the explicit name positional + trailing `--session <name>`, after re-querying `session list --json`; NEVER `herdr server stop`.**
6. **Server restart leaves husks, and ids survive.** `session stop` + fresh server preserves workspace/tab/pane ids and labels exactly — but every pane's process is a fresh bare shell and `agent get` reports `agent_not_found`. **Pane-exists ≠ agent-alive.** Classify: `pane_not_found` = dead; pane-without-agent = husk (respawnable); registered agent (any status) = live, refuse to replace; unparseable = unknown, refuse. When replacing a husk: create the replacement tab FIRST, close the husk after — closing a workspace's last tab deletes the whole workspace.
7. **`pane get`'s `.cwd` is frozen at pane creation.** It never updates when the process `cd`s. Use `.foreground_cwd`, which tracks the live process (this is why `pane list` shows both).
8. **Labels are not unique and adoption is by first match.** Herdr enforces zero label uniqueness for workspaces AND tabs; find-before-create logic adopts the first label match — including a coincidental human-owned workspace (their 2026-07-02 incident: a label-heuristic prune closed the operator's live pane 27ms after task creation). **Rule: never act destructively on a label match; track the ids you created structurally, and only close what you can prove you created.**
9. **Marking agent-injected messages: U+2063, never ASCII control bytes.** Herdr's input path eats C0 bytes like `0x1f` as control actions; U+2063 INVISIBLE SEPARATOR (UTF-8 `e2 81 a3`) travels as text, is untypable from a keyboard, and survives every harness tested — the right sentinel for telling agent-injected input apart from the human's.

---

## 🧹 workspace hygiene — where a worker goes (decide BEFORE you spawn)

The confusion this section kills: agents spawning workers wherever they happen to be, scattering one-shots across shared workspaces, and cramming fleets into a single tab. Decide placement with this table, top rule that matches wins:

| You need | Where it goes |
|---|---|
| A one-shot job (bounded audit/research/transform, no conversation needed) | **No pane at all.** Headless: Agent tool (`model: haiku`, background), `haiku-dispatch`/`mini-headless`, or `codex-dispatch`. |
| A support process for YOUR current task (dev server, logs, test watch) | **Split inside your own tab** (`pane split --no-focus`). |
| ONE persistent worker for your project | **New labelled tab in YOUR workspace** (create-tab → agent start → close orphan root; §spawning). |
| A team of 2–6 persistent workers on one project | **A dedicated workspace** for the team (`workspace create --cwd <project> --label "<PROJECT>"`), one labelled tab per worker inside it. |
| More than ~6 live workers | **Stop.** You're past pane-fleet territory — load `orchestrate` (admission control caps live workers at 6; refuse, don't queue). |

**Placement rules, non-negotiable:**

- **Check before you create.** `workspace list` + `pane list` first. An existing workspace for this project → use it. An existing idle lane of yours → reuse it (Law 6). Only then create.
- **Never spawn into someone else's workspace.** Workspaces map to projects and owners. If agents from another team run there, adding your worker makes it unroutable for everyone. Make your own space instead — spaces are cheap, confusion is not.
- **One agent per tab (Law 5).** If you're about to `agent start` into a tab that already has an agent, you wanted a new tab.
- **Label at creation, not later.** `--label` exists on `workspace create` and `tab create`; name the agent in `agent start <name>`. Prefix with your team identity so `pane list` reads like an org chart (`JARVIS-RESEARCH`, `ORACLE-F03-PLATFORM`).
- **cwd matters.** Spawn workers with `--cwd` set to the project they work on — peers use `cwd` to figure out who's on what, and a worker in the wrong cwd looks like it belongs to a different project.

**Teardown checklist (run when a lane finishes, and periodically over your own workspace):**

```bash
H=~/.local/bin/herdr
$H tab list --workspace <ws>       # every tab: labelled? panes count sane?
# for each retired lane: read it first (classify by reading, never by label/mtime), then:
$H tab close <tab_id>              # closes the lane and its panes
$H pane list                       # ids renumbered — re-resolve before touching anything else
```

Litter to hunt: tabs with `panes 2` where one is a bare shell (orphan root — close the EMPTY one, see §spawning), unlabeled `unknown` panes nobody owns, `done` agents whose output you already harvested. **Read a pane before closing it** — closing the wrong pane kills a live agent and its work.

---

## concepts

**workspaces** are project contexts. each workspace has one or more tabs. unless manually renamed, a workspace's label follows the first tab's root pane — usually the repo name, otherwise the root pane's current folder name.

**tabs** are subcontexts inside a workspace. each tab has one or more panes. Doctrine: one tab = one worker's lane (Law 5).

**panes** are terminal splits inside a tab. each pane runs its own process — a shell, an agent, a server, anything.

**agent status** is detected automatically by herdr. the api exposes one public field for it:

- `agent_status` — `idle`, `working`, `blocked`, `done`, `unknown`

`done` means the agent finished, but you have not looked at that finished pane yet. `unknown` = a pane herdr can't introspect (often a bare shell), not necessarily dead. ⚠️ `done` is a heuristic — it also fires on stalls, crashes, and permission prompts. Completion truth is the worker's report/handoff artifact, never `agent_status` alone (see `orchestrate` Law 3).

**three address layers — know which you're holding:**

| Handle | Example | Durability |
|---|---|---|
| `pane_id` | `w65269154916e83-3` | **VOLATILE** — renumbers on any close. Position, not name. |
| `terminal_id` | `term_656343bf087a518a` | Durable for the terminal's lifetime — survives renumbering and cross-workspace moves. |
| agent **name** | `JARVIS-RESEARCH` | Durable, human-legible, addressable — set at `agent start <name>` or via `agent rename`. |

`herdr agent` commands accept terminal ids, unique agent names, detected/reported labels, and legacy pane ids as targets. **Prefer names/terminal_id for anything you address twice; use pane_id only freshly-resolved.**

ids can compact when tabs, panes, or workspaces are closed. do not treat pane/tab/workspace ids as durable. re-read them from `workspace list`, `tab list`, `pane list`, or create/split responses when you need a current id.

## discover yourself — and the whole map (live, never written down)

There is no static "projects and tabs" doc, on purpose. **Any written-down map of workspaces/tabs/panes goes stale the instant a pane opens or closes, and a stale map is exactly what misroutes messages.** The live commands ARE the registry:

```bash
herdr workspace list   # projects (label ≈ repo name) + their ids
herdr tab list         # tabs per workspace
herdr pane list        # panes + labels + detected agents + agent_status + cwd (current ids — volatile)
herdr agent list       # just the detected agents, with names + terminal ids
```

the focused pane is yours. other panes are your neighbors. To know *which project a pane belongs to*, trace pane → tab → workspace from these live lists, then confirm against the pane's actual content (`pane read`). Identify a target by **workspace label + verified content**, never by a remembered id.

## addressing agents by name (the durable way)

Once a worker has a name, you can skip pane-id resolution for most operations:

```bash
herdr agent list                                   # names, terminal ids, statuses
herdr agent read JARVIS-RESEARCH --source recent --lines 200 | tail -n 40
herdr agent wait JARVIS-RESEARCH --status idle --timeout 120000
herdr agent rename <terminal_id> my-lane           # align a bare "claude"/"codex" name to its tab label
herdr agent focus my-lane
```

⚠️ `agent send <target> <text>` writes **literal text with no Enter** — for messaging, resolve the pane id fresh and use the `pane run` + verify protocol (§messaging). Two name layers exist: the **tab label** (what a human named the lane) and the agent **name** (`agent list`). A pane started without an explicit name reports `name: "claude"` even when its tab is meaningfully labelled — derive identity from the tab label and `agent rename` to align them.

## tab management

```bash
herdr tab list --workspace <ws>
herdr tab create --workspace <ws> --cwd <path> --label "logs"   # label at birth (Law 7)
herdr tab rename <tab_id> "logs"
herdr tab focus <tab_id>
herdr tab close <tab_id>
```

without `--label`, the new tab keeps the default numbered tab name — don't leave it that way.

## read another pane

see what is on another pane's screen:

```bash
herdr pane read <id> --source recent --lines 200 | tail -n 50
```

- `--source visible` = current viewport
- `--source recent` = recent scrollback as rendered in the pane
- `--source recent-unwrapped` = recent terminal text with soft wraps joined back together

## split a pane and run a command

Splits are for YOUR task's support processes only (Law 5). split your pane to the right and keep focus on your current pane:

```bash
NEW_PANE=$(herdr pane split <your_id> --direction right --no-focus | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')
herdr pane run "$NEW_PANE" "npm run dev"
```

split downward instead with `--direction down`.

## wait for output

block until specific text appears in a pane. useful for waiting on servers, builds, and tests.

for `--source recent`, matching uses unwrapped recent terminal text, so pane width and soft wrapping do not break matches. if you want to inspect the same transcript that the waiter matches, use `pane read --source recent-unwrapped`.

```bash
herdr wait output <id> --match "ready on port 3000" --timeout 30000
herdr wait output <id> --match "server.*ready" --regex --timeout 30000
```

if it times out, exit code is `1`.

## wait for an agent status

```bash
herdr wait agent-status <id> --status done --timeout 60000
# or by durable name:
herdr agent wait <name> --status idle --timeout 60000
```

use this instead of sleep-polling a worker. remember `done` is a heuristic — gate real completion on the worker's report, not the status.

## messaging another agent — ADDRESS BY IDENTITY, NEVER BY REMEMBERED PANE ID

**This is the #1 source of misrouted messages: pane ids are volatile.** They re-number when panes/tabs/workspaces open or close (see §concepts). "Sonnet is in pane N" becomes false the moment a pane closes — that id is now someone else, and your message lands on the wrong agent. **A pane id is a position, not a name.** Never cache one across turns. Never trust a label you remember.

**Protocol — every time you message an agent, do all three:**

1. **Resolve fresh.** Re-read the live list; never reuse an id from a previous turn:
   ```bash
   herdr pane list   # JSON: each pane's current id + label + detected agent + status + cwd
   ```
2. **Verify who is actually there** before sending — match on the agent's role/task in the pane content, not just the label:
   ```bash
   herdr pane read <id> --source recent --lines 200 | tail -n 30   # confirm this is the agent you mean
   ```
   If the content doesn't match who you expect (e.g. label says "OPUS" but the pane is doing unrelated work), STOP — the label is stale. Find the right pane by its actual work, or ask the lead. Do not send to a pane you could not positively identify.
3. **Then send** to the just-resolved id with `herdr pane run`, **then VERIFY it submitted** — do not trust that it did:
   ```bash
   herdr pane run <id> "[from: <you>] @<them>: your message"
   sleep 2
   herdr pane read <id> --source visible --lines 200 | tail -n 40   # did it submit, or is it still sitting in the input box?
   ```
   ⚠️ **`pane run` is NOT reliably atomic in agent TUI panes.** Plain shells take the Enter fine, but **Claude and Codex panes frequently swallow the Enter** — the text lands in the input box and just sits there unsent (the prompt shows after the `❯` with no response). This is the #1 cause of "I messaged them but they never responded." When the verify read shows the text still queued, **send an explicit Enter**:
   ```bash
   herdr pane send-keys <id> Enter
   ```
   Rule of thumb: messaging a plain shell → `pane run` is enough. Messaging a **Claude/Codex agent** → `pane run`, then read-back, then `send-keys Enter` if it didn't fire. Long messages may collapse to a `[Pasted text]` indicator — that's delivery, not submission; verify the receiver actually started (status flips to `working`, or a response appears).
   ⚠️ Do NOT send with `pane send-text` alone — that types the text but never presses Enter at all.

**Identify yourself in every message.** The receiver has the same volatility problem. Start with who you are and who it's for: `"[from: infra-session] @oracle-lead: ..."`. A bare "done" with no sender/addressee is how threads cross.

**If you are unsure who a pane is, you are not allowed to message it.** Re-resolve or escalate to the lead. A misdelivered status update is worse than a delayed one — it makes another agent act on work that isn't theirs.

## agent-to-agent context packets — shared state for real work

Herdr is only transport. It does not make a weak message strong. Agents can still talk naturally, ask questions, negotiate, and use their own style. When a message needs to survive a handoff, restart/resume, review, completion report, blocker report, or relay to another agent, wrap the useful state in this compact packet so the next agent gets the map instead of a vibe.

Use terse English plus pointers. Prefer paths, session ids, pane ids resolved just now, commands, artifact names, and evidence handles over narrative.

Use the packet helper when practical:

```bash
PACKET=/tmp/agent-packet.md
node ~/.siso/agent/profile/skills/herdr/scripts/agent-packet.mjs template --to reviewer --from lead --thread "api coverage" --obj "review src/api coverage" > "$PACKET"
# edit/populate the packet, then:
node ~/.siso/agent/profile/skills/herdr/scripts/agent-packet.mjs check "$PACKET"
node ~/.siso/agent/profile/skills/herdr/scripts/agent-packet.mjs send --pane <fresh-pane-id> --file "$PACKET"
```

`check` is a quality gate for packetized handoffs. If it fails, either fix the packet or use normal chat if this is not a state-bearing message. `send` validates first, then uses Herdr and prints a read-back so you can see whether the TUI accepted the prompt.

For state-bearing agent work, prefer `agent-packet.mjs send` over raw `herdr pane run`. Use raw `pane run` freely for shell commands, launching tools, quick pings, natural discussion, and cases where the recipient explicitly asked for unstructured text.

```md
AGENT_PACKET v1
TO:
FROM:
THREAD:
OBJ:
STATE:
MODE:
ANCHORS:
- A1:
FACTS:
- F1:
DECISIONS:
- D1:
CONSTRAINTS:
- C1:
TODO:
- T1:
VERIFY:
- V1:
OPEN:
- O1:
```

Field rules:

- `TO` / `FROM`: human-readable agent identity plus current pane id if known from a fresh resolve.
- `THREAD`: project/workspace/task name, not a remembered tab number.
- `OBJ`: one sentence outcome, not background.
- `STATE`: `new`, `working`, `handoff`, `blocked`, `review`, `done`, or `restart`.
- `MODE`: model/routing/budget constraints such as `use Codex for mechanical edits`, `avoid Opus`, `standard depth`.
- `ANCHORS`: files, directories, session ids, artifact paths, graph nodes, or evidence files the agent should read first.
- `FACTS`: claims already established, each short enough to verify.
- `DECISIONS`: choices already made so the receiver does not re-litigate.
- `CONSTRAINTS`: safety, dirty-work, model, time, token, or "do not kill" limits.
- `TODO`: exact next actions in order.
- `VERIFY`: concrete commands/checks or expected observable state.
- `OPEN`: questions only if they block progress.

If the message is just a ping, a one-line acknowledgement, or live back-and-forth discussion, a packet is not required. If the recipient is expected to continue work from context, make a decision, review evidence, or report durable status, use a packet or include one at the bottom.

When spawning a new agent for a scoped task, the first prompt should include an `AGENT_PACKET v1` and this instruction: "When you finish, block, or hand off, reply with an updated AGENT_PACKET v1 plus evidence." When relaying another pane's state to a third pane, summarize it into a packet; do not paste raw transcript unless the transcript itself is the evidence being reviewed.

The helper lives in this skill at `scripts/agent-packet.mjs`. From the active SISO profile, call it as:

```bash
node ~/.siso/agent/profile/skills/herdr/scripts/agent-packet.mjs check <packet.md>
```

### lower-level send primitives

- `herdr pane run <id> "..."` — text + an Enter in one request. **The one you want for messaging an agent — but in Claude/Codex panes the Enter is often swallowed, so read the pane back and `send-keys Enter` if it didn't submit (see the verify-and-re-Enter pattern above).**
- `herdr pane send-text <id> "..."` — text, NO Enter. Only for the rare case where you deliberately want to stage text without submitting (e.g. pre-fill a prompt for a human to edit). On its own it does NOT send — pair with `send-keys Enter` or the receiver never gets it. For long multi-line task prompts, `send-text` then `send-keys Enter` then read-back-to-confirm is MORE reliable than one `pane run`.
- `herdr pane send-keys <id> Enter` — press Enter / other keys.
- `herdr agent send <target> "..."` — literal text by durable name, NO Enter. Same pairing rule as `send-text`.

(Always resolve `<id>` via the protocol above first.)

## workspace management

```bash
herdr workspace list
herdr workspace create --cwd /path/to/project --label "api server"   # label at birth
herdr workspace create --no-focus                                     # create without switching to it
herdr workspace focus <ws>
herdr workspace rename <ws> "api server"
herdr workspace close <ws>
```

Create a workspace when you're standing up a TEAM (2–6 workers on one project — see §hygiene); use a tab for a single lane. Never build your team inside a workspace another agent owns.

## spawning a fresh agent in its own tab — and the ORPHAN-PANE TRAP

You will often want a clean, named tab running one agent (a dedicated lane for a subtask). **First: should this be a pane at all?** One-shot job → headless instead (Law 8). Existing idle lane of yours → reuse it (Law 6). Confirmed you need a new persistent lane → the intuitive spawn sequence leaves a dead empty shell behind. Know this before you spawn, or you litter the workspace with empty panes.

**The trap:** `herdr agent start <name> --tab <tab_id> -- claude ...` does NOT replace the tab's root shell — it SPLITS the tab, leaving the original empty root pane sitting beside your new agent. So a freshly-created tab ends up with **2 panes**: one bare shell (no agent) + your agent. `tab list` will show `panes 2` where you expected `panes 1`.

**The correct recipe — create tab, start agent, close the orphan root:**

```bash
H=~/.local/bin/herdr
WS=<your_workspace_id>
CWD=/path/to/repo
# 1. create the tab — capture BOTH its tab_id AND root pane id (you need both)
read TAB ROOT < <($H tab create --workspace $WS --cwd "$CWD" --label "my-lane" --no-focus \
  | python3 -c 'import sys,json; d=json.load(sys.stdin)["result"]; print(d["tab"]["tab_id"], d["root_pane"]["pane_id"])')
# 2. start the agent in THAT tab (use $TAB, not a literal placeholder) — it spawns a SIBLING pane.
# Herdr does not choose the model; use an explicit current user/project override
# when one exists, otherwise use the CLI's configured default and verify its banner.
AGENT=$($H agent start my-lane --tab "$TAB" --cwd "$CWD" --no-focus -- claude --dangerously-skip-permissions \
  | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["agent"]["pane_id"])')
# 3. close the now-orphaned empty root → promotes the agent to the tab's sole pane
$H pane close "$ROOT"
# 4. VERIFY: tab should now read panes 1, and the agent survives (its pane id may renumber; its NAME does not)
$H tab list --workspace $WS
```

Note the agent gets a **name** (`my-lane`) at start — from here on address it by name (`agent read my-lane`, `agent wait my-lane`), not by its renumbering pane id.

**Two facts that make this dangerous if you skip the verify:**

- **Closing a pane renumbers the others.** After `pane close`, every pane id can shift. Re-read `pane list` before you message the new agent — never reuse the id from the start response across a close.
- **Closing the WRONG pane kills the agent.** If you close the agent pane instead of the orphan root (easy to mix up after a renumber), you destroy the agent and its running workflow. Always `pane read <id>` both panes first: the orphan is EMPTY (no agent), the keeper shows the agent. Close the empty one.

**Before declaring a spawn clean, audit:** `herdr tab list --workspace <ws>` — every tab you own should read `panes 1`. Any `panes 2` with a bare shell = orphan, close it. Don't leave empty terminals lying around.

## routing heavy work to Codex — DON'T burn the Claude account

herdr panes running `claude` all draw on the same Claude plan. When a sub-lane's job is **mechanical or design-spec reasoning** (produce a diff-level spec, refactor plan, code transform, adversarial review), route the heavy pass to **Codex**, not a Claude workflow. Claude stays the orchestrator/reviewer; Codex does the bulk token spend.

**Model-routing boundary:** Herdr owns pane mechanics, not model policy. Never pin provider model ids or reasoning levels in this skill or its recipes. Resolve overrides from the user's current instruction, then applicable project/model-routing policy; otherwise use the CLI's configured default. Start an interactive TUI without a task prompt and inspect its banner before sending work. The GPT-5.5 family is prohibited for new Codex lanes: if the default resolves there, close the empty lane before task submission and correct the upstream preference instead of silently using or substituting it.

**Two Codex paths, both valid on this machine — pick by job shape:**
- **Headless one-shot:** use `codex-dispatch` or current local Codex configuration. Herdr must not inject a model id into a headless command.
- **Interactive tab:** launch bare `codex` in its own Herdr tab, verify the banner against the current user/project routing preference, then send the task. If the user explicitly supplied a model for this lane, pass that exact value; never infer one from this document.

Spawn a Codex tab exactly like a Claude agent (create tab → start → close orphan root, recipe above), launching `codex` instead of `claude` in step 2.

Pattern: **The lead frames the problem → hands heavy coding/design/transform work to a model-verified Codex lane → reviews the output against locked constraints → saves the artifact.** Keep model choice in user/project routing policy, not in Herdr mechanics.

## recipes

### run a server and wait until it is ready

```bash
NEW_PANE=$(herdr pane split <your_id> --direction right --no-focus | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')
herdr pane run "$NEW_PANE" "npm run dev"
herdr wait output "$NEW_PANE" --match "ready" --timeout 30000
herdr pane read "$NEW_PANE" --source recent --lines 200 | tail -n 20
```

### run tests in a separate pane and inspect the result

```bash
TEST_PANE=$(herdr pane split <your_id> --direction down --no-focus | python3 -c 'import sys,json; print(json.load(sys.stdin)["result"]["pane"]["pane_id"])')
herdr pane run "$TEST_PANE" "cargo test"
herdr wait output "$TEST_PANE" --match "test result" --timeout 60000
herdr pane read "$TEST_PANE" --source recent --lines 200 | tail -n 30
```

### check what another agent is working on

```bash
herdr pane list
herdr pane read <id> --source recent --lines 200 | tail -n 80
# or, if it has a name:
herdr agent read <name> --source recent --lines 200 | tail -n 80
```

### watch another pane robustly

```bash
# inspect what is already there
herdr pane read <id> --source recent --lines 200 | tail -n 40
# wait only for the next output you expect
herdr wait output <id> --match "ready" --timeout 30000
# to inspect the same transcript the waiter matched:
herdr pane read <id> --source recent-unwrapped --lines 200 | tail -n 40
```

### spawn a worker lane and hand it a task (the full clean sequence)

```bash
# 0. hygiene gate: pane list — does a reusable lane already exist? is this a one-shot (→ headless)?
# 1. spawn clean (create tab → agent start <name> → close orphan root — §spawning)
# 2. wait for the agent to be ready, then send the task packet and VERIFY it submitted:
herdr agent wait my-lane --status idle --timeout 30000
herdr pane list    # resolve my-lane's CURRENT pane id fresh
herdr pane run <fresh_id> "AGENT_PACKET v1
TO: my-lane
FROM: lead
THREAD: api coverage
OBJ: review test coverage in src/api and report gaps
STATE: new
MODE: concise review, no edits unless obvious and low-risk
ANCHORS:
- A1: src/api/
FACTS:
- F1: coverage review requested for API surface
DECISIONS:
- D1: findings first, tests/gaps second
CONSTRAINTS:
- C1: preserve user dirty work
TODO:
- T1: inspect src/api tests and implementation
- T2: report missing coverage with file refs
VERIFY:
- V1: include commands run or state not run
OPEN:
- O1: none

When you finish, block, or hand off, reply with an updated AGENT_PACKET v1 plus evidence."
sleep 2
herdr pane read <fresh_id> --source visible --lines 200 | tail -n 40   # queued? → send-keys Enter
```

### coordinate with another agent

Resolve + verify the pane first (§messaging — ids are volatile). Using a placeholder `<id>` from a fresh `pane list`:

```bash
herdr wait agent-status <id> --status done --timeout 120000
herdr pane read <id> --source recent --lines 200 | tail -n 100
```

Then reduce what you read into `AGENT_PACKET v1` before sending it anywhere else. Do not relay a wall of raw transcript as "context" unless another agent explicitly needs to audit the transcript itself.

## notes

- `workspace list`, `workspace create`, `tab list`, `tab create`, `tab get`, `tab focus`, `tab rename`, `tab close`, `pane list`, `pane get`, `pane split`, `agent list`, `wait output`, and `wait agent-status` print json on success.
- `pane read` prints text, not json. `pane read --format ansi` returns a rendered ANSI snapshot for TUI feedback loops.
- `pane send-text`, `pane send-keys`, and `pane run` print nothing on success.
- current pane ids look like `w65269154916e83-3` (workspace hash + index); tab ids like `w65269154916e83:3`; terminal ids like `term_656343bf087a518a`. older docs/examples showing `1-1`-style ids still work as "legacy pane ids" but the volatility rule is the same.
- `pane report-agent <pane_id> --source <id> --agent <label> --state idle|working|blocked|unknown [--message TEXT] [--custom-status TEXT] [--seq N]` lets an external writer (a sidecar, the orchestrator) publish a status hint for a pane. Not authoritative; herdr auto-detection can override. (See `orchestrate` Law 5.)
- `herdr worktree create|open|list|remove` manages git worktrees per workspace — useful when parallel workers would collide on the same checkout; give each worker lane its own worktree.
- parse ids from `workspace create`, `tab create`, and `pane split` responses when you need new ids. `workspace create` returns `result.workspace`, `result.tab`, and `result.root_pane`. `tab create` returns `result.tab` and `result.root_pane`. for `pane split`, the new pane id is at `result.pane.pane_id`.
- use `pane read` for current output that already exists. use `wait output` for future output you expect next.
- `--no-focus` on split, tab create, and workspace create keeps your current terminal context focused.
- raw protocol / full api reference: [socket api docs](https://herdr.dev/docs/socket-api/).
- if you are running inside herdr, the `HERDR_ENV` environment variable is set to `1`.
