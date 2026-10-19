---
name: task-commander
description: Transitional task-dispatch playbook adapter using Agent Brain for state and an explicitly selected workspace host for delivery.
version: 2.0.0
tags:
  - task-management
  - agent-brain
  - playbook-step
---

# Task Commander — transitional playbook adapter

> **Not the only task system.** Many SISO projects carry their own file-based tasks at
> `.agents/tasks/` (Oracle Streaming has ~984 of them) which this skill does NOT read or write.
> Load `siso-project-front-door` before assuming a project's work lives in Agent Brain.


Task Commander does not own a database or a workspace topology. It is one step of a future Agent Playbook: select shared work from **SISO Agent Brain**, construct a bounded handoff, then deliver it through the orchestration host selected by that playbook (for the current SISO stack, normally Herdr).

## 1. Read or claim work

```bash
siso-brain tasks --agent Testing_Agent
siso-brain steps --role tester
siso-brain step-claim --role tester --by testing-agent
```

The claim response is the source of truth. Do not query SQLite or infer state from a workspace pane.

## 2. Build the handoff

Include only the stable identifiers and context the receiving agent needs:

```text
Task: <task_id>
Step: <step_id>
Title: <task_title>
Intent: <task_description>
Input: <step_input_payload>
Definition of done: <playbook acceptance rule>
```

## 3. Deliver through the selected host

Workspace creation, pane selection, and message delivery belong to the orchestration playbook and host adapter. Do not hardcode pane IDs, machine names, or historical CMUX workspaces in this skill.

## 4. Record the result

```bash
siso-brain step-update --id <step_id> --status done --output '{"verified":true}'
siso-brain timeline --agent testing-agent --type HANDOFF --task <task_id> --message "Verification returned"
```

On a recoverable failure, use `--status retry`; on a terminal step failure, use `--status error`. The Brain updates the parent task state under its tested workflow contract.

## Boundary

This entry remains in Skills Hub only as a transitional adapter. The full dispatch sequence belongs in Agent Playbooks because it composes task selection, host operations, agent communication, and verification.
