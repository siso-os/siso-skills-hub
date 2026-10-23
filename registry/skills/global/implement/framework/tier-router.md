# Tier Router

Choose the smallest tier that can honestly finish the job and verify it.

| Tier | Agents | Passes | Default shape |
| --- | --- | --- | --- |
| `XS` | 1 | 1 | One headless Codex run and one local verification. |
| `S` | 2-3 | 1 | One implementer plus one independent verifier. |
| `M` | 5-8 | 2 | Parallel lane split, bounded repair loop, checkpoint. |
| `L` | 12-16 | 2 | Parallel implementation plus adversarial gate. |
| `XL` | fan-out | 3 | Multi-phase map, implement, verify, synthesize. |
| `Super` | as needed | until dry | Repeat until no new high-value findings remain. |

Escalate only for evidence: unknown blast radius, multiple owners, failing verification after repair, or ambiguous requirements. If a job fits `XS`, do not inflate it.
