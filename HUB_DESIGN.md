# Skills Hub Architecture Design

## Overview

The Skills Hub is the central registry for all SISO agent skills. This document defines the complete architecture including registry schema, skill structure, CLI, and categorization.

---

## 1. Registry Schema

**Location:** `registry/skills_registry.json`

Each skill is registered with the following schema:

```json
{
  "skills": [
    {
      "skill_id": "gitsearch",
      "name": "GitHub Search",
      "description": "Search GitHub for code, repos, issues, and PRs",
      "category": "devops",
      "tags": ["search", "github", "code-discovery", "research"],
      "version": "1.0.0",
      "author": "SISO Team",
      "repo_url": null,
      "remote_url": null,
      "commit_hash": null,
      "dependencies": {
        "skills": ["cli-runner"],
        "packages": ["gh"]
      },
      "install_commands": {
        "system": "brew install gh",
        "skill": "echo 'No additional setup required'"
      },
      "uninstall_commands": {
        "system": "brew uninstall gh",
        "skill": "rm -rf ~/.claude/skills/gitsearch"
      },
      "files": {
        "required": ["SKILL.md"],
        "optional": ["README.md", "install.sh", "uninstall.sh", "scripts/", "config/", "examples/"]
      },
      "metadata": {
        "user_invocable": true,
        "context": "fork",
        "agent_type": "Explore",
        "allowed_tools": ["Bash", "Read"],
        "created": "2024-01-15",
        "updated": "2025-03-19",
        "status": "stable"
      }
    }
  ]
}
```

**Schema Fields:**

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `skill_id` | string | yes | Unique identifier (kebab-case) |
| `name` | string | yes | Human-readable name |
| `description` | string | yes | 1-2 sentence summary |
| `category` | string | yes | Primary category |
| `tags` | array | yes | Searchable tags |
| `version` | string | yes | Semantic versioning |
| `author` | string | no | Creator/maintainer |
| `repo_url` | string | no | Source location |
| `remote_url` | string | no | Clone URL after independent-repository promotion |
| `commit_hash` | string | no | Reviewed immutable source revision for a promoted skill |
| `dependencies.skills` | array | no | Required skills |
| `dependencies.packages` | array | no | System packages |
| `install_commands.system` | string | no | OS-level install |
| `install_commands.skill` | string | no | Skill-specific setup |
| `uninstall_commands` | object | no | Cleanup commands |
| `metadata` | object | no | Additional metadata |

---

## 2. Standard Skill Structure

Every skill directory follows this structure:

```
skill_name/
├── SKILL.md              # REQUIRED - Main skill definition
├── README.md             # Optional - Long-form documentation
├── install.sh            # Optional - Installation script
├── uninstall.sh          # Optional - Uninstall script
├── config/               # Optional - Configuration files
│   └── default.json
├── scripts/              # Optional - Executable scripts
│   └── main.py
├── examples/              # Optional - Usage examples
│   └── example1.md
└── tests/                # Optional - Test files
    └── test_skill.py
```

### SKILL.md Format

```markdown
---
name: <skill_id>
description: <1-2 sentence description>
disable-model-invocation: false
user-invocable: true
context: fork|root|agent
agent: <AgentType>
allowed-tools: <Tool1>, <Tool2>
---

# Skill Name

You are [context description].

## Input

$ARGUMENTS

## Your Task

1. Step one
2. Step two

## Scripts

- `scripts/script.py` - Description

## Examples

See `examples/` folder.
```

### install.sh / uninstall.sh

```bash
#!/bin/bash
# install.sh - Skill installation hook
# Called with: $1 = install|uninstall
#              $2 = target directory

set -e

ACTION="$1"
TARGET_DIR="$2"

if [ "$ACTION" = "install" ]; then
    echo "Installing skill..."
    # Add setup commands here
elif [ "$ACTION" = "uninstall" ]; then
    echo "Uninstalling skill..."
    # Add cleanup commands here
fi
```

---

## 3. Hub CLI

**Location:** `scripts/skills`

The Hub CLI provides a unified interface for managing skills.

### Commands

```bash
# List all available skills
skills hub list [--category <cat>] [--json]

# Search skills by name or tag
skills hub search <query> [--tag <tag>]

# Show skill details
skills hub info <skill_id>

# Install skill to agent's local skills/
skills hub install <skill_id> [--target <path>]

# Symlink skill instead of copying
skills hub link <skill_id> [--target <path>]

# Update skill to latest version
skills hub update <skill_id>

# Add new skill to registry
skills hub add <skill_dir>

# Remove skill from registry
skills hub remove <skill_id>

# Validate skill structure
skills hub validate <skill_id>
```

### Implementation

```python
#!/usr/bin/env python3
"""
skills_hub CLI - Manage SISO skills
"""
import argparse
import json
import os
import shutil
import subprocess
import sys
from pathlib import Path

HUB_ROOT = Path(__file__).parent.parent
REGISTRY_FILE = HUB_ROOT / "registry/skills_registry.json"
SKILLS_DIR = HUB_ROOT / "registry/skills"


def load_registry():
    with open(REGISTRY_FILE) as f:
        return json.load(f)


def save_registry(data):
    with open(REGISTRY_FILE, 'w') as f:
        json.dump(data, f, indent=2)


def cmd_list(args):
    """List all skills"""
    registry = load_registry()
    skills = registry.get('skills', [])

    if args.category:
        skills = [s for s in skills if s.get('category') == args.category]

    if args.json:
        print(json.dumps(skills, indent=2))
        return

    print(f"{'SKILL ID':<20} {'NAME':<25} {'CATEGORY':<15} {'STATUS'}")
    print("-" * 70)
    for s in skills:
        print(f"{s['skill_id']:<20} {s['name']:<25} {s.get('category', 'N/A'):<15} {s.get('metadata', {}).get('status', 'N/A')}")


def cmd_search(args):
    """Search skills"""
    registry = load_registry()
    query = args.query.lower()

    results = [
        s for s in registry.get('skills', [])
        if query in s['skill_id'].lower()
        or query in s['name'].lower()
        or query in s.get('description', '').lower()
        or any(query in tag.lower() for tag in s.get('tags', []))
    ]

    for s in results:
        print(f"{s['skill_id']}: {s.get('description', '')}")
        print(f"  Tags: {', '.join(s.get('tags', []))}")
        print()


def cmd_info(args):
    """Show skill details"""
    registry = load_registry()
    skill = next((s for s in registry.get('skills', []) if s['skill_id'] == args.skill_id), None)

    if not skill:
        print(f"Error: Skill '{args.skill_id}' not found")
        return 1

    print(f"Skill ID: {skill['skill_id']}")
    print(f"Name: {skill['name']}")
    print(f"Description: {skill['description']}")
    print(f"Category: {skill.get('category', 'N/A')}")
    print(f"Tags: {', '.join(skill.get('tags', []))}")
    print(f"Version: {skill.get('version', 'N/A')}")
    print(f"Author: {skill.get('author', 'N/A')}")
    print(f"Status: {skill.get('metadata', {}).get('status', 'N/A')}")
    print(f"Dependencies: {skill.get('dependencies', {})}")
    return 0


def cmd_install(args):
    """Install skill to target"""
    skill_id = args.skill_id
    target = Path(args.target or os.path.expanduser("~/.claude/skills"))

    skill_dir = SKILLS_DIR / skill_id
    if not skill_dir.exists():
        print(f"Error: Skill '{skill_id}' not found in registry")
        return 1

    target_dir = target / skill_id
    target_dir.parent.mkdir(parents=True, exist_ok=True)

    if args.link:
        # Create symlink
        if target_dir.exists():
            target_dir.unlink()
        os.symlink(skill_dir.resolve(), target_dir)
        print(f"Linked {skill_id} -> {target_dir}")
    else:
        # Copy
        if target_dir.exists():
            shutil.rmtree(target_dir)
        shutil.copytree(skill_dir, target_dir)
        print(f"Installed {skill_id} -> {target_dir}")

    return 0


def cmd_update(args):
    """Update skill from registry"""
    # Implementation: pull latest from repo or sync from hub
    print(f"Updating {args.skill_id}...")
    return 0


def main():
    parser = argparse.ArgumentParser(prog="skills hub")
    subparsers = parser.add_subparsers()

    # list
    p_list = subparsers.add_parser('list', help='List skills')
    p_list.add_argument('--category', help='Filter by category')
    p_list.add_argument('--json', action='store_true', help='JSON output')
    p_list.set_defaults(func=cmd_list)

    # search
    p_search = subparsers.add_parser('search', help='Search skills')
    p_search.add_argument('query', help='Search query')
    p_search.set_defaults(func=cmd_search)

    # info
    p_info = subparsers.add_parser('info', help='Show skill info')
    p_info.add_argument('skill_id', help='Skill ID')
    p_info.set_defaults(func=cmd_info)

    # install
    p_install = subparsers.add_parser('install', help='Install skill')
    p_install.add_argument('skill_id', help='Skill ID')
    p_install.add_argument('--target', help='Target directory')
    p_install.add_argument('--link', action='store_true', help='Symlink instead of copy')
    p_install.set_defaults(func=cmd_install)

    # update
    p_update = subparsers.add_parser('update', help='Update skill')
    p_update.add_argument('skill_id', help='Skill ID')
    p_update.set_defaults(func=cmd_update)

    args = parser.parse_args()
    if hasattr(args, 'func'):
        return args.func(args)
    parser.print_help()
    return 0


if __name__ == '__main__':
    sys.exit(main())
```

---

## 4. Category Hierarchy

```
skills_hub/
└── registry/
    └── skills/
        ├── devops/              # DevOps & Infrastructure
        │   ├── gitsearch/
        │   ├── github/
        │   ├── cmux/
        │   ├── cmux-browser/
        │   └── vercel/
        │
        ├── code/                # Code Development
        │   ├── agent-builder/
        │   ├── agent-setup/
        │   ├── implement_story/
        │   ├── verify_story/
        │   └── analyze_task/
        │
        ├── ops/data/                # Data & Search
        │   ├── websearch/
        │   ├── xsearch/
        │   ├── multisearch/
        │   └── gitsearch/  (also in devops - can have multiple categories)
        │
        ├── communication/        # Agent Communication
        │   ├── agent-commander/
        │   ├── meta-commander/
        │   ├── task-commander/
        │   └── cli-runner/
        │
        ├── testing/             # Testing & QA
        │   ├── playwright/
        │   └── verify_story/
        │
        ├── system/              # OS & System
        │   ├── os-database/
        │   ├── workspace/
        │   └── task-manager/
        │
        └── global/              # Global/Cross-cutting
            ├── subagents/
            └── memory-setup/
```

### Category Definitions

| Category | Description | Example Skills |
|----------|-------------|----------------|
| **devops** | Infrastructure, CI/CD, deployment | vercel, cmux, github |
| **code** | Code generation, implementation | implement_story, agent-builder |
| **data** | Search, discovery, research | websearch, gitsearch, xsearch |
| **communication** | Inter-agent, CLI, messaging | agent-commander, task-commander |
| **testing** | QA, verification, automation | playwright, verify_story |
| **system** | OS, database, workspace | os-database, task-manager |
| **global** | Cross-cutting, templates | subagents, memory-setup |

### Tags (Flat, Searchable)

Each skill can have multiple tags beyond category:
- `search`, `discovery`, `research`
- `deployment`, `ci-cd`, `infrastructure`
- `code-generation`, `refactoring`
- `testing`, `qa`, `automation`
- `communication`, `messaging`
- `database`, `storage`
- `browser`, `ui`, `automation`
- `template`, `scaffold`

---

## 5. Directory Layout

```
skills_hub/
├── HUB_DESIGN.md              # This document
├── README.md                  # User-facing overview
├── registry/
│   ├── skills_registry.json   # Master registry
│   ├── INDEX.md               # Markdown index (auto-generated)
│   └── skills/                # All skills (by category)
│       ├── devops/
│       ├── code/
│       ├── ops/data/
│       ├── communication/
│       ├── testing/
│       ├── system/
│       └── global/
├── scripts/
│   └── skills                 # CLI entry point
├── in_progress/              # Skills being built
├── backlog/                  # Requested skills
└── templates/
    └── skill/                 # Skill template
        ├── SKILL.md
        ├── README.md
        ├── install.sh
        ├── uninstall.sh
        ├── config/
        ├── scripts/
        └── examples/
```

---

## 6. Migration Plan

1. **Phase 1**: Create `skills_registry.json` from existing INDEX.md
2. **Phase 2**: Create CLI script at `scripts/skills`
3. **Phase 3**: Organize skills into category subdirectories
4. **Phase 4**: Add install/uninstall hooks to skills that need them
5. **Phase 5**: Deprecate flat structure (maintain backward compatibility)

---

## 7. Backward Compatibility

- Keep `registry/INDEX.md` as auto-generated from `skills_registry.json`
- Keep `registry/skills/` as-is (flat) while also supporting category subdirs
- CLI first looks in flat structure, then falls back to categories

---

## Summary

The Skills Hub provides:
- **JSON registry** for machine-readable skill metadata
- **Standard structure** for consistent skill development
- **CLI tool** for easy skill management
- **Category hierarchy** for organization and discovery
- **Backward compatibility** with existing skills
