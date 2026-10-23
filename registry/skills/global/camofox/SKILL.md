---
name: camofox
description: Use when reading, navigating or taking screenshots of a web page headlessly through the local Camofox REST API without opening a browser on Shaan's screen.
---

# camofox — headless browsing that never steals the screen

**Why this exists:** Playwright launches a visible Chrome window. Running it
repeatedly takes over Shaan's laptop while he is working. Camofox is a REST
API wrapping Camoufox (a Firefox fork with C++-level fingerprint spoofing).
Nothing ever appears on screen.

Server: `http://localhost:9377` · repo `~/SISO_Workspace/SISO_Agents/camofox-browser`

## Before anything else

```bash
curl -s --max-time 5 http://localhost:9377/health
```

`{"ok":true,...}` means ready. If it fails or hangs:

```bash
cd ~/SISO_Workspace/SISO_Agents/camofox-browser && nohup npm start > /tmp/camofox.log 2>&1 &
until curl -s --max-time 3 localhost:9377/health >/dev/null; do sleep 2; done
```

`browserConnected:false` in health is normal — the browser launches lazily on
first use and shuts down when idle (~40MB at rest).

If the log says `manifest.json is missing`, the browser binary was never
downloaded: `npm run fetch-bin` (several hundred MB, one time).

## Core usage

Open a tab and read a page as an accessibility snapshot — roughly 90% smaller
than raw HTML, and each element carries a stable ref (`e1`, `e2`) you can click.

**Every call needs `userId` and `sessionKey`** — POST them in the body, pass
them as query params on GET/DELETE. Omitting them returns
`400 {"error":"userId and sessionKey required"}`. Reusing the same pair keeps
cookies and storage across tabs; a new pair is a clean profile.

```bash
U="userId=siso&sessionKey=default"

# open
TAB=$(curl -s -X POST localhost:9377/tabs -H 'content-type: application/json' \
  -d '{"url":"https://example.com","userId":"siso","sessionKey":"default"}' \
  | python3 -c "import sys,json;print(json.load(sys.stdin)['tabId'])")

# read — returns refs like [e1] you can click
curl -s "localhost:9377/tabs/$TAB/snapshot?$U" | head -c 2000

# click by ref, then re-snapshot
curl -s -X POST "localhost:9377/tabs/$TAB/click" -H 'content-type: application/json' \
  -d '{"ref":"e12","userId":"siso","sessionKey":"default"}'

# screenshot
curl -s "localhost:9377/tabs/$TAB/screenshot?$U" -o shot.png

# close when done — tabs hold memory
curl -s -X DELETE "localhost:9377/tabs/$TAB?$U"
```

First tab after an idle period takes ~2s while the browser warms. Later calls
are fast.

Full endpoint list: `curl -s localhost:9377/openapi.json | python3 -m json.tool | head -80`
Interactive docs: `http://localhost:9377/docs`

## Authenticated browsing

Two routes, in order of preference.

**Cookie import** — export Netscape-format cookies from Chrome, then
`POST /sessions` with the file. Best when Shaan already has a logged-in
session and the task just needs to read behind it.

**VNC interactive login** — `POST /interactive/start` opens a noVNC session
Shaan logs into himself; export the storage state afterward and reuse it.
Use when there is no exportable cookie file. Ask before starting one; it
needs him at the keyboard.

Never ask Shaan for a password to type into a form. Import his session
instead.

## Rules

1. **Default to this over Playwright** for fetching, scraping, screenshots and
   click-throughs. Reach for Playwright only when the task genuinely needs
   Chrome specifically — and even then pass `headless: true`.
2. **Close every tab** you open. Tabs are not garbage collected.
3. **Snapshots, not HTML.** Use `/snapshot` and element refs. Pulling raw HTML
   into context wastes tokens for no gain.
4. **Anti-detection is for access, not abuse.** Use it to read pages an agent
   should reasonably reach — competitor research, a client's own site, a
   Cloudflare-fronted doc. Do not use it to evade rate limits at scale, break
   a paywall, or defeat a login you have no right to.
5. **Never log in as someone else** or enter payment details. Reading a
   checkout to the card form is fine; completing a purchase is not.

## Search macros

Instead of building search URLs by hand:
`@google_search`, `@youtube_search`, `@amazon_search`, `@reddit_subreddit`,
plus ~10 more. Pass as the `url` when opening a tab, e.g.
`{"url":"@google_search dankie sounds tickets"}`.

## YouTube transcripts

`POST /youtube/transcript` with a video URL. Needs `yt-dlp` on PATH
(`brew install yt-dlp`) for the fast path; falls back to a slower
browser-based extraction without it.

## Optional Jev browser decisions

When choosing among page links would require reading a large snapshot in the
parent agent, load the installed `jev-judgment` skill and its
`references/browser.md`. Its `browser.py` reads this Camofox tab directly, selects
one observed link within caller-reviewed URL prefixes and can navigate with
compact readback. Its `browser_loop.py` also runs a bounded search/navigation flow:
the caller supplies field text, specifically permitted buttons, URL scope, step
budget and a URL-plus-text success condition. It uses fresh observed refs, never
guessed selectors. Supply your task-owned user, session and tab. Use direct
Camofox calls for exact known URLs, unsupported controls, screenshots and
uncertainty; do not add a per-click hook. Read `references/browser.md` for both
packet formats. Jev selection does not establish overall task completion.
