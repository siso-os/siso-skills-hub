#!/usr/bin/env node
import { spawn } from "node:child_process";
import { appendFileSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const args = parseArgs(process.argv.slice(2));

if (args.help) {
  usage();
  process.exit(0);
}

const cwd = resolve(args.cwd || process.cwd());
const prompt = readPrompt(args);
const outFile = args.out ? resolve(cwd, args.out) : "";
const ledgerFile = args.ledger ? resolve(cwd, args.ledger) : "";
const label = args.label || "codex-exec";
const model = args.model || "";
const jsonEvents = Boolean(args.json);
const startedAt = new Date().toISOString();

if (!prompt.trim()) {
  fail("prompt is required; pass --prompt or --prompt-file");
}

if (outFile) {
  mkdirSync(dirname(outFile), { recursive: true });
}
if (ledgerFile) {
  mkdirSync(dirname(ledgerFile), { recursive: true });
}

const codexArgs = [
  "exec",
  "--dangerously-bypass-approvals-and-sandbox",
  "-C",
  cwd,
];

if (model) {
  codexArgs.push("-m", model);
}
if (jsonEvents) {
  codexArgs.push("--json");
}
if (outFile) {
  codexArgs.push("-o", outFile);
}
codexArgs.push("-");

const child = spawn("codex", codexArgs, {
  cwd,
  env: process.env,
  stdio: ["pipe", "pipe", "pipe"],
});

let stdout = "";
let stderr = "";

child.stdout.on("data", (chunk) => {
  stdout += chunk.toString();
  process.stdout.write(chunk);
});

child.stderr.on("data", (chunk) => {
  stderr += chunk.toString();
  process.stderr.write(chunk);
});

child.on("error", (error) => {
  writeLedger({
    label,
    startedAt,
    finishedAt: new Date().toISOString(),
    status: "ERROR",
    exitCode: null,
    rating: 0,
    error: error.message,
  });
  fail(error.message);
});

child.stdin.end(prompt);

child.on("close", (code) => {
  const finishedAt = new Date().toISOString();
  const lastMessage = outFile ? safeRead(outFile) : stdout;
  const rating = extractRating(lastMessage) ?? extractRating(stdout);
  const status = code === 0 ? "DONE" : "FAILED";

  writeLedger({
    label,
    startedAt,
    finishedAt,
    status,
    exitCode: code,
    rating,
    outFile: outFile || null,
    stderrTail: tail(stderr, 2000),
  });

  if (args.requireRating && rating === null) {
    console.error("codex-exec-adapter: missing /100 rating in final output");
    process.exit(2);
  }

  process.exit(code ?? 1);
});

function readPrompt(options) {
  const parts = [];
  if (options.promptFile) {
    parts.push(readFileSync(resolve(process.cwd(), options.promptFile), "utf8"));
  }
  if (options.prompt) {
    parts.push(options.prompt);
  }
  return parts.join("\n\n");
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const arg = values[index];
    if (arg === "--help" || arg === "-h") {
      parsed.help = true;
    } else if (arg === "--json") {
      parsed.json = true;
    } else if (arg === "--require-rating") {
      parsed.requireRating = true;
    } else if (arg === "--cwd") {
      parsed.cwd = readValue(values, ++index, arg);
    } else if (arg === "--prompt") {
      parsed.prompt = readValue(values, ++index, arg);
    } else if (arg === "--prompt-file") {
      parsed.promptFile = readValue(values, ++index, arg);
    } else if (arg === "--out") {
      parsed.out = readValue(values, ++index, arg);
    } else if (arg === "--ledger") {
      parsed.ledger = readValue(values, ++index, arg);
    } else if (arg === "--label") {
      parsed.label = readValue(values, ++index, arg);
    } else if (arg === "--model") {
      parsed.model = readValue(values, ++index, arg);
    } else {
      fail(`unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function readValue(values, index, option) {
  const value = values[index];
  if (!value) {
    fail(`missing value for ${option}`);
  }
  return value;
}

function extractRating(text) {
  const jsonMatch = text.match(/"rating"\s*:\s*(\d{1,3})/);
  if (jsonMatch) {
    return clampRating(Number(jsonMatch[1]));
  }
  const slashMatch = text.match(/(?:rating|score|aggregateRating)[^0-9]{0,20}(\d{1,3})\s*\/\s*100/i);
  if (slashMatch) {
    return clampRating(Number(slashMatch[1]));
  }
  return null;
}

function clampRating(value) {
  if (!Number.isFinite(value)) {
    return null;
  }
  return Math.max(0, Math.min(100, Math.round(value)));
}

function writeLedger(entry) {
  if (!ledgerFile) {
    return;
  }
  appendFileSync(ledgerFile, `${JSON.stringify(entry)}\n`);
}

function safeRead(file) {
  try {
    return readFileSync(file, "utf8");
  } catch {
    return "";
  }
}

function tail(value, max) {
  return value.length > max ? value.slice(value.length - max) : value;
}

function usage() {
  const script = fileURLToPath(import.meta.url);
  console.log(`Usage: node ${script} --prompt "..." [options]

Options:
  --cwd <dir>              Workspace for codex exec. Defaults to the current directory.
  --prompt <text>          Prompt to send to headless Codex.
  --prompt-file <file>     Prompt file to append before --prompt.
  --out <file>             Write Codex's last message to this file.
  --ledger <file>          Append a JSONL run entry.
  --label <name>           Ledger label.
  --model <model>          Optional Codex model override.
  --json                   Stream Codex JSONL events.
  --require-rating         Exit 2 when the final output lacks a /100 rating.
`);
}

function fail(message) {
  console.error(`codex-exec-adapter: ${message}`);
  process.exit(1);
}
