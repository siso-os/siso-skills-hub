---
name: show-page
description: Use when showing Shaan a page, screenshot comparison or UI result; inspect the artifact, then return a real show-page URL or supported inline screenshot view.
---

# Show the artifact

Inspect the HTML and each screenshot yourself. Use the project screenshot command for the relevant viewport and changed states.
For an authorized public, sanitized artifact run `show-page <page.html|directory> <slug>`; the real tool scans for private patterns
and prints a URL only after HTTP 200. Preserve a refusal; do not bypass the privacy guard.
For private screenshots in SISO Code, use its `html_preview` and `html_render` tools when available, embedding local images.
Keep private pages local or use the project's authorized private preview. Do not publish private material merely to obtain a link.
Report the URL or inline view and what was visually checked. Tool source: `agents/harness/bin/show-page`.
