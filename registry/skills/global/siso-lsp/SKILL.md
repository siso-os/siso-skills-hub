---
name: siso-lsp
description: Find definition, find references, hover/type info, workspace symbols, diagnostics, and call hierarchy via real language-servers — without MCP. Use when you need to navigate code by symbol instead of grepping. Triggers — "find definition", "find references", "lsp", "navigate symbol", "where is X defined", "who calls X", "type of X", "go to definition", "jump to symbol".
trigger: /siso-lsp
---

# /siso-lsp

Plain CLI (`siso-lsp`) that wraps `typescript-language-server`, `pyright-langserver`,
`gopls`, and `rust-analyzer` over JSON-RPC. Output is `path:line:col  signature`,
one result per line. No MCP, no daemon, fresh-spawn per invocation.

The CLI lives at `~/.claude/bin/siso-lsp`.

## When to use

Use `siso-lsp` whenever you would otherwise:

- Grep the codebase for a symbol name to find where it's defined
- Read a file just to find the signature of one function
- Glob for files to find call sites
- Read 200 lines of context just to learn a type

Tokens saved (vs Grep + Read for the same outcome):

| Op                | Grep+Read | siso-lsp | Saved |
|-------------------|-----------|----------|-------|
| find definition   | ~6500     | ~580     | 91%   |
| find references   | ~1500     | ~150     | 90%   |
| hover / type      | ~2500     | ~60      | 98%   |
| who-calls (calls) | ~7500     | ~700     | 91%   |

Do NOT use `siso-lsp` for:
- Reading docs / markdown / config (no LSP)
- Free-text search across non-code (use Grep)
- Small files where you already need the body — just Read it

## Subcommands

```bash
# definitions and references — by symbol name
siso-lsp def TaskList                       # → file:line:col  signature
siso-lsp refs TaskList                      # all call sites + decl

# precise type / signature at a cursor (1-indexed line, col)
siso-lsp hover src/components/Foo.tsx:42:15

# workspace symbol search (fuzzy)
siso-lsp symbols TaskList
siso-lsp symbols "use*Auth"

# diagnostics for one file (errors + warnings the LSP reports)
siso-lsp diag src/lib/parse.ts

# incoming + outgoing call hierarchy for a symbol
siso-lsp calls processOrder
```

## Flags

```
--root <dir>    project root (auto-detected by walking up for
                package.json / pyproject.toml / go.mod / Cargo.toml / .git)
--lang <name>   force language: typescript | python | go | rust
--limit <n>     cap output rows (default: 50 symbols / 200 refs)
-h, --help      help
```

## Language detection

Walks up from CWD to find the nearest project root, then picks an LSP:

| Marker                                    | LSP                              |
|-------------------------------------------|----------------------------------|
| `go.mod`                                  | `gopls`                          |
| `Cargo.toml`                              | `rust-analyzer`                  |
| `pyproject.toml` / `setup.py` / `*.py`    | `pyright-langserver`             |
| `package.json` / `*.ts` / `*.tsx` / `*.js`| `typescript-language-server`     |

Override with `--lang` for monorepos or mixed-stack folders.

## Graceful degradation

If the required LSP isn't installed, exits 2 with a one-line install hint:

```
siso-lsp: typescript-language-server not found on PATH.
Install: npm install -g typescript typescript-language-server
```

Install commands per language:
- TS/JS  — `npm install -g typescript typescript-language-server`
- Python — `npm install -g pyright`  (or `pip install pyright`)
- Go     — `go install golang.org/x/tools/gopls@latest`
- Rust   — `rustup component add rust-analyzer`

## Output format

One result per line, machine-friendly:

```
src/lib/orders.ts:42:15  export function processOrder(o: Order): Promise<Receipt> {
src/api/checkout.ts:101:7    await processOrder(cart);
```

`hover` output is two-section: a header location line, then indented type info.
`calls` output groups `## incoming` and `## outgoing`.

## What you must do when invoked

1. Confirm the project root (CLI auto-detects, but pass `--root` if working
   inside a monorepo subtree where the wrong root would be chosen).
2. Pick the smallest subcommand that answers the question:
   - "Where is X?" → `def`
   - "Who uses X?" → `refs`
   - "What's the type of X here?" → `hover` (need file:line:col)
   - "Anything matching pattern Y?" → `symbols`
   - "What does the LSP think is broken in F?" → `diag`
   - "Who calls X / what does X call?" → `calls`
3. Read only the lines the CLI returns. Do not Grep or Read more files unless
   the LSP output is empty or insufficient.
4. If the CLI exits 2 with a missing-binary hint, surface it to the user once
   — do not retry, do not silently fall back to Grep.

## See also

- `EXAMPLES.md` in this skill folder — 5 worked examples of when to reach for
  `siso-lsp` instead of Grep / Read.
- Phase 2 of the token-savings plan — the LSP CLI replaces cclsp / Serena MCP
  for SISO; nothing here goes through MCP.
