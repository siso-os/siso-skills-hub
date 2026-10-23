---
name: skill-author
description: Use when any agent adds, edits, registers or installs a skill; reuse the Hub source, write trigger cases first, validate and verify the installed files.
---

# P3 — author and install one skill

In sisodias/siso, resolve `bin/siso where siso.agents.skills.hub`; the Hub is `agents/skills/hub`.
Resolve the user's actual Skills Hub checkout and read its AGENTS.md and
PROMOTION.md. The registry owns discovery/provenance; bundled atomic capabilities
live at `registry/skills/<category>/<id>/`. Composed workflows stay with Agent
Playbook; private data and machine bindings stay with their consumer. Agent Base
is source inventory, never an automatic installation list.

Read existing sources before declaring a duplicate, replacement or retirement.
Preserve their licenses, references, dirty edits and restore pointers. A historical
classification is a review lead, not permission to remove an installed consumer.

For one requested capability:

1. Write at least two realistic positive trigger cases and one adjacent negative case before editing descriptions. Keep baseline descriptions and count actual Skill calls, not the model's claim that it used a skill. Reuse its owning source. For a new atomic skill, write a concise SKILL.md with
   nonempty `name` and `description`; add only resources its actual task needs.
2. Add/update its entry in `registry/skills_registry.json` and matching assessment
   in `registry/promotion-assessments.json`. Preserve other entries. Remote sources
   require the reviewed full commit SHA, not a moving branch or caller override.
3. Run `python3 scripts/skills validate <id>`, `npm run build:index`,
   `npm run build:promotion-map`, and `npm test`. A frontmatter PASS is not proof
   of the skill's behavior: exercise its real bounded workflow in a disposable
   target, including failure/collision behavior.
4. Inspect the explicitly requested installed home, then run
   `python3 scripts/skills install <id> --target <skills-directory> --dry-run`.
   After the plan passes, run the same command without `--dry-run`; `--link` is
   available for an explicitly desired live local projection. A different existing
   target is refused; do not delete it or use another installer to bypass that
   refusal. Resolve its owner and actual differences first.
5. Verify the installed SKILL.md and support resources against source, record
   canonical source/projection paths and checks in the consuming project's
   existing handoff. Copy installs need explicit refresh after source changes;
   links change with source. Do not claim active sessions reloaded automatically.

Do not run whole-stack installers, registry install_commands, hooks, providers or
schedulers merely to add a skill. Install only the reviewed capability, not the
entire historical catalog. Publishing/pushing remains a separate requested action.

Authoring references: [Anthropic skill-creator trigger evaluator](https://github.com/anthropics/skills/blob/main/skills/skill-creator/scripts/run_eval.py), [Superpowers writing-skills](https://github.com/obra/superpowers/blob/main/skills/writing-skills/SKILL.md). Use trigger conditions first in a description of at most 300 characters; keep deterministic work in existing scripts and validate the artifact after execution.
