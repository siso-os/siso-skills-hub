# Shared skill home

`scripts/skills install NAME` copies the reviewed registry source into the real
`~/.agents/skills/NAME` directory, creates a relative per-skill link at
`~/.claude/skills/NAME`, and archives the old Codex duplicate. Hub source wins
conflicts. Existing names and registry aliases remain installable, including dormant skills.
`--link` does not turn the shared home into a link. Explicit `--target` retains
the bounded copy/link API for disposable or caller-owned projections.

Run `scripts/skills migrate-home --dry-run`, then `scripts/skills migrate-home`
to reconcile the installed union. Every source is validated before migration.
`scripts/skills doctor` is read-only and exits nonzero for broken links,
noncanonical folders, duplicates, or differences between the tools' skill sets.
Run migration again to verify idempotence: every `changed` and `codex_archived`
value must be zero. Codex's bundled hidden `.system` skills and Claude's reserved account-managed `synced/` folder stay tool-owned.

| Content | Canonical location | Tool entry |
| --- | --- | --- |
| Installed global skill | `~/.agents/skills/NAME/` | Claude per-skill link; Codex native |
| Repository skill | `<repo>/.agents/skills/NAME/` | tracked relative `.claude/skills/NAME` link |
| Shared global instructions | `~/.agents/AGENTS.md` | `.codex/AGENTS.md` file link; Claude `@~/.agents/AGENTS.md` import |
| Claude settings, agents, commands, workflows, projects, plugins | Real `.claude` paths | unchanged tool ownership |
| Claude account configuration | `~/.claude.json` | unchanged tool ownership |
| Codex config, auth, sessions | Real `.codex` paths | unchanged tool ownership |
| Agent state and project memory | Existing `.agents/agents/` and `.agents/memory/` | outside skills discovery |

The brain composer owns instruction generation. Originals go under
`~/SISO_Workspace/_archive/2026-10-21-dot-agents/<machine>/<unique-id>/`,
each with `MANIFEST.txt`, fingerprints, and a restore instruction. Symlink
payloads are retained beside the archived link. The harness backup namespace
also records each exact archived backup in its manifest. No whole skill-directory links.

The 136 previously unregistered installed capabilities (34 laptop, 102 Mini) have source hashes in
their `INSTALL-SOURCE.json` receipts. These are preserved installation snapshots,
with provisional assessments, rather than claims of upstream promotion. Missing metadata, home path literals, and credential examples were made portable; original hashes and archives preserve their provenance.

Verified loader contracts: [Codex skills](https://learn.chatgpt.com/docs/build-skills)
and [Claude skills](https://code.claude.com/docs/en/skills), checked 21 October 2026.
