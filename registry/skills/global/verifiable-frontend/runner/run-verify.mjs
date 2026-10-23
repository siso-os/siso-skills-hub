#!/usr/bin/env node
// verify-surface — drive a RUNNING app's window.__verify contract and print verdicts.
//
// Connects to an app over the Chrome DevTools Protocol (CDP), evaluates
// window.__verify.runAll(), and renders the PASS/FAIL/BLOCKED/SKIP matrix.
// DOM-only fallback: if window.__verify is absent but #verify-result-json exists,
// it reads that instead.
//
// Usage:
//   node run-verify.mjs --cdp http://127.0.0.1:9222 [--json] [--unit <id>]
//   node run-verify.mjs --url http://localhost:5199           (launches via puppeteer/playwright if available)
//
// Exit codes: 0 = all PASS (BLOCKED tolerated only with --allow-blocked),
//             1 = at least one FAIL, 2 = BLOCKED present (couldn't observe), 3 = harness not found.
//
// This script speaks raw CDP over the /json/list + websocket endpoint so it has
// ZERO npm deps — works against any Chromium target (Electron renderer included).

import { argv, exit } from "node:process";

function parseArgs() {
  const a = { cdp: null, url: null, json: false, unit: null, allowBlocked: false, timeout: 30000 };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--cdp") a.cdp = argv[++i];
    else if (k === "--url") a.url = argv[++i];
    else if (k === "--json") a.json = true;
    else if (k === "--unit") a.unit = argv[++i];
    else if (k === "--allow-blocked") a.allowBlocked = true;
    else if (k === "--timeout") a.timeout = Number(argv[++i]);
  }
  return a;
}

// Minimal CDP: discover a page target, open its devtools websocket, Runtime.evaluate.
async function connectCdp(base) {
  const list = await fetch(`${base}/json/list`).then((r) => r.json());
  const page = list.find((t) => t.type === "page" && t.webSocketDebuggerUrl);
  if (!page) throw new Error(`No page target with a debugger URL at ${base}/json/list`);
  const { WebSocket: WS } = await import("ws").catch(() => ({ WebSocket: globalThis.WebSocket }));
  if (!WS) throw new Error("No WebSocket available — install `ws` or use Node 22+ with global WebSocket.");
  const ws = new WS(page.webSocketDebuggerUrl);
  await new Promise((res, rej) => {
    ws.addEventListener("open", res, { once: true });
    ws.addEventListener("error", rej, { once: true });
  });
  let id = 0;
  const pending = new Map();
  ws.addEventListener("message", (ev) => {
    const msg = JSON.parse(typeof ev.data === "string" ? ev.data : ev.data.toString());
    if (msg.id && pending.has(msg.id)) {
      pending.get(msg.id)(msg);
      pending.delete(msg.id);
    }
  });
  const send = (method, params = {}) =>
    new Promise((res) => {
      const myId = ++id;
      pending.set(myId, res);
      ws.send(JSON.stringify({ id: myId, method, params }));
    });
  return { send, close: () => ws.close() };
}

async function evaluate(cdp, expression, timeout) {
  const r = await cdp.send("Runtime.evaluate", {
    expression,
    awaitPromise: true,
    returnByValue: true,
    timeout,
  });
  if (r.result?.exceptionDetails || r.exceptionDetails) {
    throw new Error(JSON.stringify(r.exceptionDetails || r.result.exceptionDetails));
  }
  return r.result?.result?.value;
}

const RUN_ALL = `
(async () => {
  if (window.__verify && typeof window.__verify.runAll === 'function') {
    const results = await window.__verify.runAll();
    return { source: 'handle', version: window.__verify.version, results };
  }
  const host = document.getElementById('verify-result-json');
  if (host && host.textContent && host.textContent.trim()) {
    return { source: 'dom', results: [JSON.parse(host.textContent)] };
  }
  return { source: 'none', results: null };
})()
`;

function icon(v) {
  return { PASS: "✅", FAIL: "❌", BLOCKED: "⛔", SKIP: "⏭️" }[v] || "?";
}

function render(payload, filterUnit) {
  let results = payload.results || [];
  if (filterUnit) results = results.filter((r) => r.unitId === filterUnit);
  const counts = { PASS: 0, FAIL: 0, BLOCKED: 0, SKIP: 0 };
  const lines = [];
  for (const r of results) {
    counts[r.verdict] = (counts[r.verdict] || 0) + 1;
    const probe = r.checks?.some((c) => c.status === "probe") ? " 🔍" : "";
    lines.push(`${icon(r.verdict)} ${r.unitId}::${r.fixtureId}${probe}  (${r.durationMs}ms)`);
    if (r.verdict === "FAIL") {
      for (const c of r.checks.filter((c) => c.status === "fail")) {
        lines.push(`     ↳ ${c.verifier}: ${c.label}${c.detail ? " — " + c.detail : ""}`);
      }
    }
    if (r.verdict === "BLOCKED" && r.blockedReason) {
      lines.push(`     ↳ ${r.blockedReason}`);
    }
  }
  return { counts, lines, total: results.length };
}

(async () => {
  const args = parseArgs();
  if (!args.cdp) {
    console.error("verify-surface: --cdp <http://host:port> is required (the app's remote-debugging endpoint).");
    console.error("  Electron: launch with --remote-debugging-port=9222, then: --cdp http://127.0.0.1:9222");
    exit(3);
  }
  let cdp;
  try {
    cdp = await connectCdp(args.cdp);
  } catch (e) {
    console.error(`verify-surface: cannot connect to ${args.cdp}: ${e.message}`);
    exit(3);
  }
  let payload;
  try {
    payload = await evaluate(cdp, RUN_ALL, args.timeout);
  } catch (e) {
    console.error(`verify-surface: runAll() threw: ${e.message}`);
    cdp.close();
    exit(3);
  }
  cdp.close();

  if (!payload || payload.source === "none" || !payload.results) {
    console.error("verify-surface: no window.__verify handle and no #verify-result-json host found.");
    console.error("  The app is not instrumented. See the verifiable-frontend skill.");
    exit(3);
  }

  const { counts, lines, total } = render(payload, args.unit);

  if (args.json) {
    console.log(JSON.stringify({ source: payload.source, version: payload.version, counts, total, results: payload.results }, null, 2));
  } else {
    console.log(`\nverify-surface — ${total} unit×fixture results (source: ${payload.source})\n`);
    console.log(lines.join("\n"));
    console.log(
      `\n${icon("PASS")} ${counts.PASS}  ${icon("FAIL")} ${counts.FAIL}  ${icon("BLOCKED")} ${counts.BLOCKED}  ${icon("SKIP")} ${counts.SKIP}\n`
    );
  }

  // Exit code: FAIL dominates, then BLOCKED (unless allowed), else success.
  if (counts.FAIL > 0) exit(1);
  if (counts.BLOCKED > 0 && !args.allowBlocked) exit(2);
  exit(0);
})();
