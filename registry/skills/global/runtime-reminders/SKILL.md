---
name: runtime-reminders
description: "Runtime reminders"

  Build or apply short event-scoped instruction reminders when agent runtime
  state changes: worker assignment, lane or model change, permission denial,
  session restart, write-fence change, or context danger threshold. Use when
  designing worker prompts, dispatchers, handoffs, or state-aware agent hooks.
  Keep volatile task state out of the stable global brain.
---

# Runtime reminders

Put stable identity and timeless invariants in the composed brain, domain
knowledge in lazy skills, and volatile state in a reminder emitted only when its
runtime event occurs.

## Build the reminder

Use this shape:

```text
EVENT: <what changed>
CURRENT STATE: <only facts needed after that event>
REQUIRED ACTION: <one concrete behavior>
STOP CONDITION: <when the reminder no longer applies>
```

Keep the payload at 12 lines or fewer. Include only state that can change between
sessions or workers, such as:

- active task id and branch/worktree;
- exact write fence;
- current lane/model and its limits;
- named runtime acceptance surface; and
- stop or handoff condition.

Do not restate the global brain, repeat a whole task brief, carry durable memory,
or embed credentials. Inspect repository facts before asking a human; ask only
about preferences, trade-offs, authority, or missing credentials that inspection
cannot resolve.

## Oracle assignment packet

For an Oracle-streaming worker assignment, emit the active task id, owned paths,
branch/worktree, runtime verification surface, and stop condition. Re-emit only
when one of those values changes. Never bake current Oracle status into the
always-loaded brain.

## Provenance and trust boundary

Paraphrased from general runtime-reminder and fact-versus-preference techniques
observed in `asgeirtj/system_prompts_leaks` at revision
`2195b1035f8eaafe22ac571c0811fb84688fe32d`. The repository was treated as
untrusted captured data. No prompt text, policy, executable, injection content,
or license header was copied; its CC0 label does not establish rights to
third-party material.
