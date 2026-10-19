---
name: cmux
description: Terminal multiplexer for Claude Code. Exposes a socket API to programmatically control workspaces, send commands, and automate browsers.
version: 1.0.0
tags:
  - cmux
  - terminal
  - automation
disable-model-invocation: true
---

# CMUX Skill

CMUX is a terminal multiplexer for Claude Code. It exposes a socket API to programmatically control workspaces, send commands, and automate browsers.

## CMUX Location

```
/Applications/cmux.app/Contents/Resources/bin/cmux
```

Add to PATH:
```bash
export PATH="/Applications/cmux.app/Contents/Resources/bin:$PATH"
```

---

## List Workspaces

```bash
cmux list-workspaces
```

Output:
```
* workspace:6  INTERNAL: Testing  [selected]
  workspace:3  OS: PM
  workspace:23  …/SISO_Internal_Lab/agents/PM_Agent
  workspace:18  META: Task Iterator
```

---

## Create & Name Workspace

### Create new workspace
```bash
cmux new-workspace
```

### Rename workspace
```bash
cmux workspace-action --action rename --title "INTERNAL: Testing"
# OR
cmux rename-workspace --workspace workspace:6 "INTERNAL: Testing"
```

---

## Send Command to Workspace

Send text/commands to a workspace's terminal:

```bash
cmux send --workspace workspace:6 "echo hello\n"
cmux send --workspace workspace:6 "cd /path/to/project\n"
cmux send --workspace workspace:6 "siso-mini\n"
```

**Escape sequences:**
- `\n` - Enter
- `\t` - Tab

---

## Run Agent via CMUX

To run an agent in a workspace:

```bash
# 1. Create workspace
cmux new-workspace

# 2. Rename
cmux rename-workspace --workspace workspace:X "INTERNAL: AgentName"

# 3. Send commands to start agent
cmux send --workspace workspace:X "cd /path/to/agent\n"
cmux send --workspace workspace:X "siso-mini\n"
```

---

## Browser Automation

CMUX has built-in browser control:

```bash
# Open URL in browser split
cmux browser open https://siso-internal.vercel.app

# Navigate
cmux browser goto https://siso-internal.vercel.app/admin

# Take snapshot (get interactable elements)
cmux browser snapshot

# Click element
cmux browser click "button:Login"

# Type text
cmux browser type "input:email" "test@example.com"

# Get page info
cmux browser get url
cmux browser get title

# Console errors
cmux browser errors list

# Close browser
cmux close-surface --surface surface:X
```

---

## Workspace Naming Strategy

```
INTERNAL: <name>    - Internal projects (Testing, Dev, Code Review)
OS: <name>          - OS-level tasks
META: <name>        - Meta/management tasks
```

Examples:
- `INTERNAL: Testing`
- `INTERNAL: Dev`
- `INTERNAL: Code Review`
- `OS: PM`
- `META: Agent Builder`

---

## List Panes & Surfaces

```bash
# List panes in workspace
cmux list-panes --workspace workspace:6

# List surfaces in pane
cmux list-pane-surfaces --workspace workspace:6 --pane pane:13
```

---

## Focus & Manage

```bash
# Focus workspace
cmux select-workspace --workspace workspace:6

# Focus pane
cmux focus-pane --pane pane:13

# Close workspace
cmux close-workspace --workspace workspace:6
```

---

## Read Screen Output

```bash
# Read terminal output
cmux read-screen --workspace workspace:6 --lines 50
```

---

## Full Workflow: Create Testing Agent Workspace

```bash
# 1. Create workspace
cmux new-workspace

# 2. Get new workspace ID
cmux list-workspaces

# 3. Rename it
cmux rename-workspace --workspace workspace:X "INTERNAL: Testing"

# 4. Navigate to agent - ALWAYS send cd FIRST
cmux send --workspace workspace:X "cd ${SISO_WORKSPACE}/SISO_Internal_Lab/agents/Testing_Agent\n"

# 5. Run siso-mini - send as SEPARATE command (not together with &&)
cmux send --workspace workspace:X "siso-mini\n"
```

**⚠️ IMPORTANT: Never combine cd and siso-mini with && - always send separately!**

# 5. Run agent
cmux send --workspace workspace:X "siso-mini\n"
```

---

## SISO Internal Lab Agents

| Agent | Path |
|-------|------|
| PM_Agent | `${SISO_WORKSPACE}/SISO_Internal_Lab/agents/PM_Agent` |
| Testing_Agent | `${SISO_WORKSPACE}/SISO_Internal_Lab/agents/Testing_Agent` |

---

## Examples

### Start Testing Agent
```bash
cmux send --workspace workspace:6 "cd ${SISO_WORKSPACE}/SISO_Internal_Lab/agents/Testing_Agent\n"
cmux send --workspace workspace:6 "siso-mini\n"
```

### Open App in Browser
```bash
cmux browser open https://siso-internal.vercel.app
```

### Take Screenshot
```bash
cmux browser snapshot
```
