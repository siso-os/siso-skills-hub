#!/usr/bin/env node
import assert from "node:assert/strict";
import { existsSync, lstatSync, readFileSync, realpathSync } from "node:fs";
import { homedir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..", "..", "..", "..");
const args = parseArgs(process.argv.slice(2));
const pack = args.pack || "implement";
const packRoot = path.join(repoRoot, "templates", "profile", "skills", pack);

const failures = [];

check(`pack root exists: ${pack}`, () => assert.equal(existsSync(packRoot), true));
check("SKILL.md exists", () => assert.equal(existsSync(path.join(packRoot, "SKILL.md")), true));

if (pack === "implement") {
  validateImplement();
} else {
  validateGenericPack();
}

validateProjection(pack);

if (failures.length > 0) {
  console.error(`PLAYBOOK_PACK_VALIDATION_FAIL pack=${pack}`);
  for (const failure of failures) {
    console.error(`- ${failure}`);
  }
  process.exit(1);
}

console.log(`PLAYBOOK_PACK_VALIDATION_PASS pack=${pack} rating=100/100`);

function validateImplement() {
  const required = [
    "routing.json",
    "BEST-PRINCIPLES.html",
    "framework/tier-router.md",
    "framework/execution-framework.md",
    "framework/rating-contract.md",
    "framework/workflow-composition.md",
    "tools/codex-exec-adapter.mjs",
    "tools/workflow-implement-sweep.js",
    "tools/validate-playbook-pack.mjs",
    "ledger/runs.jsonl",
    "reports/.gitkeep",
  ];

  for (const relative of required) {
    check(`${relative} exists`, () => assert.equal(existsSync(path.join(packRoot, relative)), true));
  }

  const skill = read("SKILL.md");
  for (const needle of ["XS", "Super", "/100", "haiku", "codex exec", "Workflow", "checkpoint"]) {
    check(`SKILL.md mentions ${needle}`, () => assert.match(skill, new RegExp(escapeRegExp(needle), "i")));
  }

  const routing = JSON.parse(read("routing.json"));
  check("routing glue default is haiku", () => assert.equal(routing.modelRouting.glue.default, "haiku"));
  check("routing cognition is headless codex exec", () => assert.equal(routing.modelRouting.cognition.engine, "headless_codex_exec"));
  check("routing pass floor is 85", () => assert.equal(routing.ratings.passFloor, 85));
  check("routing max cycles is 3", () => assert.equal(routing.ratings.maxCyclesPerItem, 3));
  check("routing has six tiers", () => assert.deepEqual(routing.tiers.map((tier) => tier.id), ["XS", "S", "M", "L", "XL", "Super"]));

  const adapter = read("tools/codex-exec-adapter.mjs");
  check("adapter invokes codex exec", () => assert.match(adapter, /"exec"/));
  check("adapter bypass flag is explicit", () => assert.match(adapter, /--dangerously-bypass-approvals-and-sandbox/));
  check("adapter supports output-last-message", () => assert.match(adapter, /--output-last-message|-o/));

  const workflow = read("tools/workflow-implement-sweep.js");
  const banned = [
    /new\s+Date\s*\(/,
    /Date\.now\s*\(/,
    /Math\.random\s*\(/,
    /readFile\s*\(/,
    /from\s+['"]node:fs['"]/,
    /\bfs\./,
  ];
  for (const pattern of banned) {
    check(`workflow avoids banned pattern ${pattern}`, () => assert.equal(pattern.test(workflow), false));
  }
  check("workflow uses agent", () => assert.match(workflow, /agent\s*\(/));
  check("workflow uses parallel", () => assert.match(workflow, /parallel\s*\(/));
  check("workflow uses pipeline", () => assert.match(workflow, /pipeline\s*\(/));
  check("workflow defaults glue agents to haiku", () => assert.match(workflow, /model:\s*'haiku'/));
  check("workflow has one synthesis model escape", () => assert.equal((workflow.match(/model:\s*args\.synthesisModel\s*\|\|\s*'opus'/g) || []).length, 1));
}

function validateGenericPack() {
  const skill = read("SKILL.md");
  check("generic pack declares /100 ratings", () => assert.match(skill, /\/100|100/));
  check("generic pack declares routing or workflow policy", () => assert.match(skill, /haiku|codex exec|Workflow|workflow/i));
}

function validateProjection(skillName) {
  const source = path.join(repoRoot, "templates", "profile", "skills", skillName);
  const targets = [
    path.join(homedir(), ".claude", "skills", skillName),
    path.join(homedir(), ".codex", "skills", skillName),
    path.join(homedir(), ".siso", "agent", "profile", "skills", skillName),
    path.join(homedir(), ".agents", "skills", skillName),
  ];

  for (const target of targets) {
    check(`projected symlink ${target}`, () => {
      const stat = lstatSync(target, { throwIfNoEntry: false });
      assert.ok(stat, `missing ${target}`);
      assert.equal(stat.isSymbolicLink(), true, `${target} is not a symlink`);
      assert.equal(realpathSync(target), realpathSync(source));
    });
  }
}

function read(relative) {
  return readFileSync(path.join(packRoot, relative), "utf8");
}

function check(label, fn) {
  try {
    fn();
  } catch (error) {
    failures.push(`${label}: ${error.message}`);
  }
}

function parseArgs(values) {
  const parsed = {};
  for (let index = 0; index < values.length; index += 1) {
    const arg = values[index];
    if (arg === "--pack") {
      parsed.pack = values[++index];
    } else if (arg === "-h" || arg === "--help") {
      console.log("Usage: validate-playbook-pack.mjs [--pack implement]");
      process.exit(0);
    } else {
      throw new Error(`unknown argument: ${arg}`);
    }
  }
  return parsed;
}

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}
