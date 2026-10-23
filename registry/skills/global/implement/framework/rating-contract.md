# Rating Contract

All ratings are integer scores from `0` to `100`.

| Range | Meaning |
| --- | --- |
| `95-100` | Verified, low residual risk, evidence is strong. |
| `85-94` | Passes the requested floor with known tradeoffs documented. |
| `70-84` | Partial or risky; repair loop required when in scope. |
| `1-69` | Failing, speculative, or weakly verified. |
| `0` | Not attempted or invalid. |

Rules:

- A blocked verification cannot score above `69`.
- A missing independent verifier cannot score above `84`.
- A change without runnable evidence cannot score above `84` unless the blocker is external and documented.
- A checkpoint aggregate is the minimum of the item average, verifier rating, and smoke/benchmark rating. Do not hide one weak item behind a strong average.
