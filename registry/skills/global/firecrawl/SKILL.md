---
name: firecrawl
description: "Firecrawl CLI"

  Web scraping, search, crawling, and page interaction via the Firecrawl CLI. Use this skill whenever the user wants to search the web, find articles, research a topic, look something up online, scrape a webpage, grab content from a URL, extract data from a website, crawl documentation, download a site, map a site, or interact with pages that need clicks or logins. Also use when they say "fetch this page", "pull the content from", "get the page at https://", "extract structured data", "extract as JSON", "pull pricing info", "get all the products", "find me", "look up", "find articles about", "find the URL for", "what pages are on", "list all pages", "save for reference", "offline copy", "download the site", "save as local files", "download all the docs", "browser", "click", "fill out the form", "log in to", "sign in", "submit", "paginated", "next page", "infinite scroll", "interact with the page", "navigate to", "open a session", or reference scraping external websites. Provides real-time web search with full page content extraction and live-browser interaction beyond what Claude can do natively with built-in tools. Do NOT trigger for local file operations, git commands, deployments, or code editing tasks.
allowed-tools:
  - Bash(firecrawl *)
  - Bash(npx firecrawl *)
status: retired
---

> **RETIREMENT NOTE (2026-07-31) — BACKEND IS GONE, verified.**
> `~/.npm-global/bin/firecrawl` is a DANGLING SYMLINK -> `../lib/node_modules/firecrawl-cli/dist/index.js`
> (target absent; the npm package was uninstalled). Exec fails with 'No such file or directory'.
> `FIRECRAWL_API_KEY` in `~/.zshrc` line 6 is `"${FIRECRAWL_API_KEY:-}"` — an empty-default
> passthrough, not a real key. The skill's own 2026-07-03 infra note was correct.
> TO REVIVE: `npm install -g firecrawl-cli` AND export a real FIRECRAWL_API_KEY, then set
> `status: active` and re-run `build-playbooks.mjs`. Until then this skill would fail at runtime.
> Alternatives that work today: WebFetch/WebSearch (built in), `/multisearch`, `/foundry-corpus`.


# Firecrawl CLI

Web scraping, search, crawling, and live-browser interaction. Returns clean markdown optimized for LLM context windows.

> **INFRA (2026-07-03):** the firecrawl CLI symlink at `~/.npm-global/bin/firecrawl` points at a missing target and `FIRECRAWL_API_KEY` is empty — reinstall (`npm install -g firecrawl-cli`) and set the key before any subcommand works.

Run `firecrawl --help` or `firecrawl <command> --help` for full option details.

## Prerequisites

Must be installed and authenticated. Check with `firecrawl --status`:

```
  🔥 firecrawl cli v1.8.0
  ● Authenticated via FIRECRAWL_API_KEY
  Concurrency: 0/100 jobs (parallel scrape limit)
  Credits: 500,000 remaining
```

- **Concurrency**: max parallel jobs (run independent ops up to this limit).
- **Credits**: remaining API credits (each scrape/crawl/agent consumes credits).

## Escalation ladder

Pick the cheapest subcommand that gets the job done:

| Need                        | Command               | When                                                      |
| --------------------------- | --------------------- | --------------------------------------------------------- |
| Find pages on a topic       | `search`              | No specific URL yet                                       |
| Get a page's content        | `scrape`              | Have a URL; page is static or JS-rendered                 |
| Find URLs within a site     | `map`                 | Need to locate a specific subpage on a known site         |
| Bulk extract a site section | `crawl`               | Need many pages (e.g., all `/docs/`)                      |
| AI-powered data extraction  | `agent`               | Need structured JSON from complex multi-page sites       |
| Interact with a page        | `scrape` + `interact` | Content requires clicks, form fills, pagination, or login |
| Download a site to files    | `download`            | Save an entire site as organized local files              |

Never use `interact` for searches — use `search`. Prefer `scrape` over `agent` for single-page extraction (faster, cheaper). `search --scrape` already fetches full content — don't re-scrape those URLs.

## search

Web search with optional content scraping. First step when no URL is known.

```bash
firecrawl search "your query" -o .firecrawl/result.json --json
firecrawl search "your query" --scrape -o .firecrawl/scraped.json --json
firecrawl search "your query" --sources news --tbs qdr:d -o .firecrawl/news.json --json
```

Options: `--limit <n>`, `--sources <web,images,news>`, `--categories <github,research,pdf>`, `--tbs <qdr:h|d|w|m|y>`, `--location`, `--country <code>`, `--scrape`, `--scrape-formats`, `-o <path>`, `--json`. Naming: `.firecrawl/search-{query}.json` or `.firecrawl/search-{query}-scraped.json`.

## scrape

Extract clean markdown from one or more URLs (multiple URLs scrape concurrently). Handles JS-rendered SPAs.

```bash
firecrawl scrape "<url>" -o .firecrawl/page.md
firecrawl scrape "<url>" --only-main-content -o .firecrawl/page.md
firecrawl scrape "<url>" --wait-for 3000 -o .firecrawl/page.md
firecrawl scrape https://a.com https://b.com https://c.com
firecrawl scrape "<url>" --format markdown,links -o .firecrawl/page.json
firecrawl scrape "<url>" --query "What is the enterprise plan price?"
```

Options: `-f, --format <markdown,html,rawHtml,links,screenshot,json>`, `-Q, --query <prompt>` (5 credits), `-H` (HTTP headers), `--only-main-content`, `--wait-for <ms>`, `--include-tags`, `--exclude-tags`, `-o <path>`. Prefer plain scrape over `--query`; save then `grep`/`head`. Always quote URLs (shell `?` and `&`). Naming: `.firecrawl/{site}-{path}.md`.

## map

Discover URLs on a site. Use `--search` to find a specific page within a large site.

```bash
firecrawl map "<url>" --search "authentication" -o .firecrawl/filtered.txt
firecrawl map "<url>" --limit 500 --json -o .firecrawl/urls.json
```

Options: `--limit <n>`, `--search <query>`, `--sitemap <include|skip|only>`, `--include-subdomains`, `--json`, `-o <path>`. Common pattern: `map --search` to find a URL, then `scrape` it.

## crawl

Bulk extract content following links up to a depth/limit. Returns JSON; step 4 in the ladder.

```bash
firecrawl crawl "<url>" --include-paths /docs --limit 50 --wait -o .firecrawl/crawl.json
firecrawl crawl "<url>" --max-depth 3 --wait --progress -o .firecrawl/crawl.json
firecrawl crawl <job-id>    # poll a running crawl
```

Options: `--wait`, `--progress`, `--limit <n>`, `--max-depth <n>`, `--include-paths`, `--exclude-paths`, `--delay <ms>`, `--max-concurrency <n>`, `--pretty`, `-o <path>`. Without `--wait`, returns a job ID for async polling. Scope with `--include-paths` — don't crawl an entire site when you only need a section.

## agent

AI-powered autonomous extraction (2–5 min). Navigates complex sites, returns structured JSON.

```bash
firecrawl agent "extract all pricing tiers" --wait -o .firecrawl/pricing.json
firecrawl agent "extract products" --schema '{"type":"object","properties":{"name":{"type":"string"},"price":{"type":"number"}}}' --wait -o .firecrawl/products.json
firecrawl agent "get feature list" --urls "<url>" --wait -o .firecrawl/features.json
```

Options: `--urls <urls>`, `--model <spark-1-mini|spark-1-pro>`, `--schema <json>`, `--schema-file <path>`, `--max-credits <n>`, `--wait`, `--pretty`, `-o <path>`. Always use `--wait`. Use `--schema` for predictable structured output. Cap spend with `--max-credits`.

## interact (instruct)

Control a live browser session on a scraped page — click, fill forms, paginate, handle JS-gated content. Always scrape first; `interact` needs the saved scrape ID.

```bash
firecrawl scrape "<url>"
firecrawl interact --prompt "Click the login button"
firecrawl interact --prompt "Fill in email with test@example.com"
firecrawl interact --prompt "Extract the pricing table"
firecrawl interact --code "agent-browser click @e5" --language bash
firecrawl interact stop
```

Options: `--prompt <text>` (NL), `--code <code>`, `--language <bash|python|node>`, `--timeout <seconds>` (default 30, max 300), `--scrape-id <id>` (default: last scrape), `-o <path>`. Persist browser state across scrapes with `--profile my-app` on the scrape, then `interact` reuses it. Read-only reconnect: `scrape --profile my-app --no-save-changes`.

## download

> Experimental. Combines `map` + `scrape` to save an entire site as local files under `.firecrawl/`. Always pass `-y` to skip the confirmation prompt in automation.

```bash
firecrawl download https://docs.example.com
firecrawl download https://docs.example.com --screenshot --limit 20 -y
firecrawl download https://docs.example.com --format markdown,links --screenshot --limit 20 -y
firecrawl download https://docs.example.com --include-paths "/features,/sdks"
firecrawl download https://docs.example.com --exclude-paths "/zh,/ja,/fr,/es,/pt-BR"
```

Download options: `--limit <n>`, `--search <query>`, `--include-paths <paths>`, `--exclude-paths <paths>`, `--allow-subdomains`, `-y`. All scrape options work too: `-f <formats>`, `-H`, `-S`, `--screenshot`, `--full-page-screenshot`, `--only-main-content`, `--include-tags`, `--exclude-tags`, `--wait-for`, `--max-age`, `--country`, `--languages`. Multiple formats create per-page files (e.g. `index.md` + `links.txt` + `screenshot.png`).

## Shared conventions

**Output & files.** Write results to `.firecrawl/` with `-o` (add to `.gitignore`). Never read whole output files at once — use `wc -l`, `head`, `grep -n`. Single format outputs raw content; multiple formats (`--format markdown,links`) output JSON.

**Parsing JSON.** `jq -r '.data.web[].url' .firecrawl/search.json` to extract URLs; `jq -r '.data.web[] | "\(.title): \(.url)"'` for titles + URLs.

**Parallelization.** Check `firecrawl --status` for the concurrency limit, then run independent ops in parallel:

```bash
firecrawl scrape "<url-1>" -o .firecrawl/1.md &
firecrawl scrape "<url-2>" -o .firecrawl/2.md &
firecrawl scrape "<url-3>" -o .firecrawl/3.md &
wait
```

For `interact`, scrape multiple pages and target each via `--scrape-id`.

**Credit check.** `firecrawl credit-usage` (or `--json --pretty -o .firecrawl/credits.json`) before any large crawl/agent run.