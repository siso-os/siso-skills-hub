---
name: opencli
description: OpenCLI - turn websites, browser sessions, Electron apps, and local tools into deterministic CLI interfaces for humans and AI agents.
allowed-tools: Bash(opencli:*) Bash(node:*) Bash(curl:*)
---

# OpenCLI

Turn websites, browser sessions, Electron apps, and local tools into deterministic CLI interfaces.

## Installation

```bash
npm install -g @jackwener/opencli
```

### Browser Bridge Extension (required for browser commands)

1. Download `opencli-extension-v{version}.zip` from [GitHub Releases](https://github.com/jackwener/OpenCLI/releases)
2. Unzip, open `chrome://extensions`, enable **Developer mode**
3. Click **Load unpacked** and select the unzipped folder

### Verify Setup

```bash
opencli doctor
```

## Quick Start

```bash
# List all available commands
opencli list

# Built-in adapters
opencli hackernews top --limit 5
opencli reddit hot --search programming

# Browser control
opencli browser open https://example.com
opencli browser click "#submit"
opencli browser screenshot

# Generate new adapters from URLs
opencli generate https://example.com --goal "search products"
```

## Built-in Site Commands

| Site | Commands |
|------|----------|
| **hackernews** | `top`, `new`, `best`, `ask`, `show`, `jobs` |
| **reddit** | `hot`, `frontpage`, `popular`, `search`, `subreddit`, `read`, `user` |
| **twitter** | `trending`, `search`, `timeline`, `post`, `profile`, `bookmarks` |
| **bilibili** | `hot`, `search`, `history`, `feed`, `ranking`, `download` |
| **xiaohongshu** | `search`, `note`, `comments`, `feed`, `user`, `download` |
| **zhihu** | `hot`, `search`, `question`, `download`, `follow` |
| **amazon** | `bestsellers`, `search`, `product`, `offer` |

87+ adapters total. Run `opencli list` to see all.

## Browser Commands

```bash
# Navigation
opencli browser open <url>
opencli browser state          # Current page state
opencli browser back
opencli browser close

# Interaction
opencli browser click <selector>
opencli browser type <selector> "<text>"
opencli browser select <selector> "<value>"
opencli browser keys <key>     # Keyboard shortcuts
opencli browser scroll <x> <y>

# Extraction
opencli browser get <selector>
opencli browser screenshot
opencli browser eval "<js>"
opencli browser network        # Monitor network requests
```

## AI Agent Workflows

```bash
# Explore a site to discover APIs
opencli explore https://example.com --site mysite

# Generate adapters from exploration
opencli synthesize mysite

# One-shot: URL to command
opencli generate https://example.com --goal "get product price"

# Auth strategy discovery
opencli cascade https://api.example.com/data
```

## CLI Hub

OpenCLI auto-discovers and exposes local CLI tools:

```bash
opencli gh pr list --limit 5
opencli docker ps
opencli vercel deploy --prod
opencli obsidian search query="AI"
```

## Output Formats

```bash
# Table (default), JSON, YAML, MD, CSV
opencli bilibili hot -f json
opencli hackernews top -f yaml

# Verbose debug output
opencli bilibili hot -v
```

## Exit Codes

| Code | Meaning |
|------|---------|
| `0` | Success |
| `1` | Generic error |
| `2` | Usage error |
| `66` | Empty result |
| `69` | Browser Bridge not connected |
| `75` | Timeout (retry) |
| `77` | Auth required |
| `78` | Config error |

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `OPENCLI_DAEMON_PORT` | `19825` | Daemon HTTP port |
| `OPENCLI_BROWSER_CONNECT_TIMEOUT` | `30` | Seconds to wait for browser |
| `OPENCLI_BROWSER_COMMAND_TIMEOUT` | `60` | Seconds per browser command |
| `OPENCLI_VERBOSE` | `false` | Enable verbose logging |
| `OPENCLI_WINDOW_FOCUSED` | `false` | Set to `1` for foreground windows |

## Prerequisites

- **Node.js**: >= 21.0.0
- **Chrome/Chromium**: Running and logged into target sites

## Update

```bash
npm install -g @jackwener/opencli@latest
```
