# parse-plan

Extract structured data from a plan section before dispatching workers.

## Required fields per phase

For each phase in the plan, extract:

| Field | Source | Example |
|---|---|---|
| `goal` | `**Goal:**` line | "Add reelClassification field to scrapedPosts" |
| `worker` | `**Worker:**` line | `Haiku parallel-safe` |
| `files` | `**Files touched:**` block | array of `{path, action}` where action ∈ `create | modify` |
| `deps` | `**Dependencies:**` line | array of phase names, or `none` |
| `steps` | `**Implementation steps:**` block | numbered list |
| `verification` | `**Verification:**` block | array of bash commands |
| `subtasks` | `**Sub-tasks:**` block (if present) | array of self-contained briefs |
| `est_time` | `**Estimated time:**` line | string |

## Worker type semantics

| Worker spec | Behavior |
|---|---|
| `Haiku parallel-safe` | fire all sub-tasks in single message, all `model: "haiku"`, parallel |
| `Haiku sequential` | one Agent call per sub-task, wait between |
| `Sonnet single` | one Agent call with rich brief, `model: "sonnet"` |
| `Sonnet verifier` | one Agent call to review parallel-Haiku output |
| `Manual` | hand back to caller for human action |

## Validation (reject malformed phase)

A phase is malformed and dispatch must STOP if:
- Verification block missing or empty
- Worker type not in the table above
- File-touched paths not absolute from repo root
- Sub-task brief missing for `parallel-safe` phase
- Implementation steps too vague ("set things up", "configure properly")

If malformed → write error to status file, escalate to caller via `escalate.md`.

## After parsing

Pass the structured data to the appropriate `spawn-*` sub-skill.
