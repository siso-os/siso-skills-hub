---
name: halo-batch-qa
description: Run HALO CRM error discovery first, freeze the findings, then repair and verify one batch using the repository-owned QA skill. Use for HALO regression sweeps and release evidence, including work from its VPS; not for the separately deployed model app or unrelated projects.
---

# HALO batch QA

This is the discovery adapter. The HALO repository owns the workflow, executable
browser harness, release boundaries, and private environment details. Keep those
sources with HALO rather than copying them into this catalog.

1. Resolve the **HALO-AGENCY/halocrm** checkout from the current project, its
   project front door, or `estate where halo`. On its VPS, use the documented
   checkout from the project front door. Inspect its branch and working state.
2. Read `AGENTS.md`, then **`.agents/skills/halo-batch-qa/SKILL.md`** and the
   linked `docs/testing/HALO-BATCH-QA.md` from that same checkout.
3. Follow that workflow: inventory and freeze findings before product edits;
   implement a coordinated repair batch; verify the candidate and its rendered
   deployment; save evidence and revoke only the run's own temporary access.

If the repository skill is absent, report the missing source. Do not substitute
an old run's cookies, absolute paths, numeric pass counts, or private fixtures.
Installation of this adapter does not authorize a deployment, provider action,
financial write, or change to the model app. Apply the user's current scope and
the repository's release rules.

The adapter is useful on a laptop; a VPS agent can read the repository skill
directly without installing this catalog. Current sessions do not automatically
reload installed skills.
