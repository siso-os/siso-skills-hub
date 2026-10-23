#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { spawnSync } from "node:child_process";

const REQUIRED_SCALARS = ["TO", "FROM", "THREAD", "OBJ", "STATE", "MODE"];
const REQUIRED_SECTIONS = [
  "ANCHORS",
  "FACTS",
  "DECISIONS",
  "CONSTRAINTS",
  "TODO",
  "VERIFY",
  "OPEN",
];
const STATES = new Set(["new", "working", "handoff", "blocked", "review", "done", "restart"]);
const DEFAULT_HERDR = (process.env.HOME + '/.local/bin/herdr');

function usage() {
  console.log(`agent-packet.mjs

Usage:
  node agent-packet.mjs template [--to X] [--from X] [--thread X] [--obj X] [--state new]
  node agent-packet.mjs check <packet.md|-> [--json]
  node agent-packet.mjs send --pane <pane-id> --file <packet.md|-> [--herdr /path/herdr] [--no-readback]

The packet format is AGENT_PACKET v1. Use it for real inter-agent handoffs,
reviews, blockers, restart prompts, and completion reports.`);
}

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (!arg.startsWith("--")) {
      args._.push(arg);
      continue;
    }
    const key = arg.slice(2);
    if (key === "json" || key === "no-readback") {
      args[key] = true;
      continue;
    }
    const val = argv[i + 1];
    if (val == null || val.startsWith("--")) {
      throw new Error(`Missing value for --${key}`);
    }
    args[key] = val;
    i += 1;
  }
  return args;
}

function readInput(path) {
  if (!path || path === "-") return readFileSync(0, "utf8");
  return readFileSync(path, "utf8");
}

function fieldValue(text, name) {
  const re = new RegExp(`^${name}:\\s*(.*)$`, "m");
  return text.match(re)?.[1]?.trim() ?? "";
}

function sectionItems(text, name) {
  const headers = new Set([...REQUIRED_SCALARS, ...REQUIRED_SECTIONS]);
  const lines = text.split(/\r?\n/);
  const start = lines.findIndex((line) => line.trim() === `${name}:`);
  if (start === -1) return [];
  const body = [];
  for (const line of lines.slice(start + 1)) {
    const header = line.match(/^([A-Z_]+):(?:\s*.*)?$/)?.[1];
    if (header && headers.has(header)) break;
    body.push(line);
  }
  return body
    .map((line) => line.trim())
    .filter((line) => line.startsWith("-") && line.replace(/^-\s*/, "").trim());
}

function validatePacket(text) {
  const errors = [];
  const warnings = [];
  const normalized = text.trim();

  if (!normalized.startsWith("AGENT_PACKET v1")) {
    errors.push("packet must start with `AGENT_PACKET v1`");
  }

  for (const name of REQUIRED_SCALARS) {
    if (!fieldValue(normalized, name)) errors.push(`${name} is required`);
  }

  const state = fieldValue(normalized, "STATE");
  if (state && !STATES.has(state)) {
    errors.push(`STATE must be one of: ${[...STATES].join(", ")}`);
  }

  for (const name of REQUIRED_SECTIONS) {
    const items = sectionItems(normalized, name);
    if (items.length === 0) errors.push(`${name} needs at least one bullet`);
  }

  if (normalized.length > 6000) {
    warnings.push("packet is over 6000 chars; prefer evidence handles over pasted transcript");
  }
  if (/API Error:|^\s*⎿|^\s*⏺|^\s*✻/m.test(normalized)) {
    warnings.push("packet appears to include raw TUI/transcript text; summarize unless the transcript is evidence");
  }
  if (!/VERIFY:\n- /m.test(normalized)) {
    warnings.push("VERIFY should include concrete commands, artifact paths, or observable states");
  }

  return { ok: errors.length === 0, errors, warnings };
}

function makeTemplate(args) {
  const state = args.state || "new";
  return `AGENT_PACKET v1
TO: ${args.to || ""}
FROM: ${args.from || ""}
THREAD: ${args.thread || ""}
OBJ: ${args.obj || ""}
STATE: ${state}
MODE: ${args.mode || ""}
ANCHORS:
- A1: ${args.anchor || ""}
FACTS:
- F1: ${args.fact || ""}
DECISIONS:
- D1: ${args.decision || ""}
CONSTRAINTS:
- C1: ${args.constraint || ""}
TODO:
- T1: ${args.todo || ""}
VERIFY:
- V1: ${args.verify || ""}
OPEN:
- O1: ${args.open || "none"}
`;
}

function runHerdr(herdr, args, input) {
  const result = spawnSync(herdr, args, {
    input,
    encoding: "utf8",
    stdio: input == null ? ["inherit", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
  });
  if (result.error) throw result.error;
  if (result.status !== 0) {
    const detail = result.stderr || result.stdout || `exit ${result.status}`;
    throw new Error(`herdr ${args.join(" ")} failed: ${detail.trim()}`);
  }
  return result.stdout || "";
}

function sendPacket(args) {
  if (!args.pane) throw new Error("send requires --pane <pane-id>");
  if (!args.file) throw new Error("send requires --file <packet.md|->");
  const text = readInput(args.file);
  const verdict = validatePacket(text);
  if (!verdict.ok) {
    console.error(`packet invalid:\n- ${verdict.errors.join("\n- ")}`);
    process.exit(2);
  }
  for (const warning of verdict.warnings) console.error(`warning: ${warning}`);

  const herdr = args.herdr || DEFAULT_HERDR;
  runHerdr(herdr, ["pane", "run", args.pane, text]);
  if (!args["no-readback"]) {
    Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, 1500);
    const readback = runHerdr(herdr, ["pane", "read", args.pane, "--source", "visible", "--lines", "8"]);
    console.error(readback.trim());
  }
}

function main() {
  const [cmd, ...rest] = process.argv.slice(2);
  if (!cmd || cmd === "help" || cmd === "--help") {
    usage();
    return;
  }
  const args = parseArgs(rest);

  if (cmd === "template") {
    process.stdout.write(makeTemplate(args));
    return;
  }

  if (cmd === "check") {
    const file = args._[0];
    if (!file) throw new Error("check requires <packet.md|->");
    const verdict = validatePacket(readInput(file));
    if (args.json) {
      console.log(JSON.stringify(verdict, null, 2));
    } else if (verdict.ok) {
      console.log(verdict.warnings.length ? `PASS with warnings:\n- ${verdict.warnings.join("\n- ")}` : "PASS");
    } else {
      console.log(`FAIL:\n- ${verdict.errors.join("\n- ")}`);
      if (verdict.warnings.length) console.log(`Warnings:\n- ${verdict.warnings.join("\n- ")}`);
    }
    process.exit(verdict.ok ? 0 : 2);
  }

  if (cmd === "send") {
    sendPacket(args);
    return;
  }

  throw new Error(`Unknown command: ${cmd}`);
}

try {
  main();
} catch (err) {
  console.error(err.message);
  process.exit(1);
}
