---
name: dedup-primitive
description: "Dedup to a canonical primitive \u2014 without changing behavior"
---

# Dedup to a canonical primitive — without changing behavior

## When this fires
You found the same helper (a guard, a coercer, a formatter, a small util) defined locally in many files and want to collapse the copies into one canonical export. Any "fold these N copies into one import" / "DRY this up" / "consolidate the duplicate helpers" move. The instant a dedup verdict drives a code edit across files, this skill applies.

## The failure this prevents (real, recurring)
In the jsonCoercion folds (oracle-streaming, commits `8bb61f75`/`51aab2cd`/`13cd2704`), nine files defined a local `numberField`/`asRecord`/`stringField` that *looked* identical to the canonical `src/shared/jsonCoercion.ts` exports. Six were true copies and folded cleanly (−119 lines). But **three were behavior-variants wearing the same name** and were correctly SKIPPED: `publicRoomVerifierCore.ts`'s local `numberField` used raw `Number(value)` (coerces `null`→0, `true`→1) where the canonical returns `NaN`; `hostedPublicRoomReadbackDelivery.ts`'s was a single-arg `(value)` signature, not `(record, keys[])`; `platformTransparencyDomProbes.ts`'s was strict-number-only where the canonical parses string numbers. Importing the canonical over any of those three would have **silently changed runtime behavior** — null→0 instead of NaN flips every downstream guard. Same name ≠ same function. The whole skill exists to make that check non-optional.

## The rule
Before you replace a local helper with `import { x } from '<canonical>'`:

1. **Confirm the canonical first.** Read its source + its `<oracle-context>`/doc to learn its EXACT contract — fallback value, return on bad input (`null` vs `NaN` vs `''` vs throw), arity, whether it allows arrays, trims, parses strings. That contract is the bar every copy must match.
2. **Read each local copy, don't grep its name.** Diff the local body against the canonical contract *by reading*, point by point: same signature? same fallback? same edge behavior on `null`/`undefined`/`""`/`true`/array/string-number?
3. **Fold ONLY true copies.** Body is behavior-equivalent to the canonical → delete the local def, add the import. Net negative lines is the signal you did it right.
4. **SKIP behavior-variants — loudly.** Any divergence (different arity, different fallback, `Number()` vs finite-parse, strict vs loose, trims vs not) → leave the file ALONE and record WHY in the commit/log ("skipped X: local returns 0 on null, canonical returns NaN"). A variant is not a bug to fold away; it's a contract the caller depends on until proven otherwise.
5. **Mixed file → SKIP the whole file.** If one file defines several helpers and some are true copies but others are variants (real case: the imlive/adultempire/pornhub parsers each have a byte-equivalent `asRecord` but a single-arg `stringField`/`numberField` that diverges from the canonical `(record, keys[])`), do NOT fold just the clean one. A partial fold leaves orphan local variants beside a new import — dead code and a confusing half-migrated file. Fold a file only when ALL its in-scope helpers are true copies; otherwise leave it whole and record the blocker.
6. **Don't widen the canonical to swallow a variant mid-dedup.** If a variant is genuinely worth unifying, that's a separate, behavior-changing task with its own test — not part of a "no behavior change" fold.
7. **One canonical, one direction.** Import the existing canonical; never create a second one. If two competing canonicals exist, that's a prior decision to resolve first (see `classify-by-reading`), not something to pick blind.

## Procedure (folding N call-sites)
- Map first: find every local copy (`grep`/`ast-grep` the helper name AND its body shape — names lie, so also scan for the implementation). Build the candidate list before editing anything.
- For LARGE sets, delegate the *reading* to Haiku workers (pinned `model:'haiku'`) one batch at a time: "for each file, diff the local helper body against this canonical contract <paste contract>; return FOLD or SKIP + the contract-difference that decides it." Workers read bodies, never name-match. Then spot-verify 2-3 FOLDs and every SKIP yourself.
- Edit surgically: delete the local def, add the import, remove now-unused imports your change orphaned. Touch nothing else.
- **Gate on behavior-equivalence, not on "it compiles":** run `tsc --noEmit` (expect **same error count as before**, not just "passes") AND the existing test suites covering the touched files (the jsonCoercion folds gated on `tsc.node 31/31 unchanged` + `27 vitest pass across the 4 affected suites`). Capture the BEFORE counts first so "unchanged" is provable.
- If a touched path has NO test exercising the helper's edge cases, that's a thin net — add one edge probe (null/empty/array/string-number) before folding, or down-scope to only the tested files.

## Done criterion
Every folded file imports the canonical and its tests pass with the SAME tsc-error and test counts as before the fold (zero behavior change, proven — not assumed). Every skipped file has a one-line recorded reason naming the contract difference. No second canonical was created; no canonical was widened to absorb a variant. Net line count went down.
