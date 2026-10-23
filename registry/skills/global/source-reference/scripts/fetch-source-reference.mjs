#!/usr/bin/env node

import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import process from 'node:process';
import { findRepoRoot as findManifestRepoRoot, manifestPath } from '../../../../../lib/manifest-paths.mjs';

const repoRoot = findManifestRepoRoot(process.cwd());
const defaultRefsDir = process.env.SISO_SOURCE_REFERENCE_DIR ?? manifestPath('source_reference', {
  root: repoRoot,
  fallback: path.join(repoRoot, 'docs', 'reference', 'opensrc'),
});

function usage() {
  console.log(`Usage: fetch-source-reference.mjs [options] <package-or-owner/repo>...

Fetch source with npx opensrc, link it under MANIFEST.yaml paths.source_reference, and update an index.

Options:
  --cwd <path>       Working directory for opensrc lockfile resolution. Defaults to repo root.
  --refs-dir <path>  Local reference directory. Defaults to MANIFEST.yaml paths.source_reference.
  --force           Replace existing symlink entries.
  -h, --help        Show this help.
`);
}

const args = process.argv.slice(2);
let cwd = repoRoot;
let refsDir = defaultRefsDir;
let force = false;
const targets = [];

for (let index = 0; index < args.length; index += 1) {
  const arg = args[index];
  if (arg === '--cwd') {
    cwd = path.resolve(repoRoot, readValue(args, ++index, '--cwd'));
  } else if (arg === '--refs-dir') {
    refsDir = path.resolve(repoRoot, readValue(args, ++index, '--refs-dir'));
  } else if (arg === '--force') {
    force = true;
  } else if (arg === '-h' || arg === '--help') {
    usage();
    process.exit(0);
  } else if (arg.startsWith('-')) {
    fail(`Unknown option: ${arg}`);
  } else {
    targets.push(arg);
  }
}

if (targets.length === 0) {
  usage();
  process.exit(1);
}

if (!fs.existsSync(cwd)) {
  fail(`--cwd does not exist: ${cwd}`);
}

fs.mkdirSync(refsDir, { recursive: true });

const results = [];
for (const target of targets) {
  const cachePath = opensrcPath(target, cwd);
  const linkName = slugTarget(target);
  const localPath = path.join(refsDir, linkName);

  linkReference(cachePath, localPath, force);
  results.push({ target, cachePath, localPath });
}

writeIndex(refsDir, results);

for (const result of results) {
  console.log(`${result.target} -> ${path.relative(repoRoot, result.localPath)}`);
}
console.log(`Index: ${path.relative(repoRoot, path.join(refsDir, 'index.md'))}`);

function opensrcPath(target, cwdValue) {
  const result = spawnSync(
    'npx',
    ['--yes', 'opensrc', 'path', '--cwd', cwdValue, target],
    { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] },
  );

  if (result.status !== 0) {
    const detail = [result.stdout, result.stderr].filter(Boolean).join('\n').trim();
    fail(`opensrc failed for ${target}${detail ? `:\n${detail}` : ''}`);
  }

  const lines = result.stdout.trim().split(/\r?\n/).filter(Boolean);
  const sourcePath = lines.at(-1);
  if (!sourcePath || !path.isAbsolute(sourcePath)) {
    fail(`opensrc did not return an absolute path for ${target}:\n${result.stdout}`);
  }
  return sourcePath;
}

function linkReference(sourcePath, localPath, shouldForce) {
  const stat = fs.lstatSync(localPath, { throwIfNoEntry: false });
  if (stat?.isSymbolicLink()) {
    if (shouldForce) {
      fs.unlinkSync(localPath);
    } else {
      return;
    }
  } else if (stat) {
    fail(`Refusing to replace non-symlink path: ${localPath}`);
  }

  fs.symlinkSync(sourcePath, localPath, 'dir');
}

function writeIndex(refsDirectory, newResults) {
  const indexPath = path.join(refsDirectory, 'index.md');
  const existingRows = readExistingRows(indexPath);
  const now = new Date().toISOString();
  const byTarget = new Map(existingRows.map((row) => [row.target, row]));

  for (const result of newResults) {
    byTarget.set(result.target, {
      target: result.target,
      localPath: path.relative(repoRoot, result.localPath),
      cachePath: result.cachePath,
      updated: now,
    });
  }

  const rows = [...byTarget.values()].sort((a, b) => a.target.localeCompare(b.target));
  const body = [
    '# Source References',
    '',
    'Fetched source references for agent context. Treat these paths as read-only research material.',
    '',
    '| Target | Local path | Cache path | Updated |',
    '|---|---|---|---|',
    ...rows.map((row) => `| \`${escapeCell(row.target)}\` | \`${escapeCell(row.localPath)}\` | \`${escapeCell(row.cachePath)}\` | ${escapeCell(row.updated)} |`),
    '',
  ].join('\n');

  fs.writeFileSync(indexPath, body);
}

function readExistingRows(indexPath) {
  if (!fs.existsSync(indexPath)) {
    return [];
  }

  const rows = [];
  for (const line of fs.readFileSync(indexPath, 'utf8').split(/\r?\n/)) {
    if (!line.startsWith('| `')) {
      continue;
    }
    const cells = line.split('|').slice(1, -1).map((cell) => cell.trim());
    if (cells.length !== 4) {
      continue;
    }
    rows.push({
      target: unquote(cells[0]),
      localPath: unquote(cells[1]),
      cachePath: unquote(cells[2]),
      updated: cells[3],
    });
  }
  return rows;
}

function readValue(values, index, option) {
  const value = values[index];
  if (!value) {
    fail(`Missing value for ${option}`);
  }
  return value;
}

function slugTarget(target) {
  return target
    .replace(/^npm:/, '')
    .replace(/^github:/, '')
    .replace(/^pypi:/, 'pypi-')
    .replace(/^jsr:/, 'jsr-')
    .replace(/^@/, 'scope-')
    .replace(/[^a-zA-Z0-9._-]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);
}

function escapeCell(value) {
  return String(value).replaceAll('|', '\\|');
}

function unquote(value) {
  return value.replace(/^`|`$/g, '').replaceAll('\\|', '|');
}

function fail(message) {
  console.error(message);
  process.exit(1);
}
