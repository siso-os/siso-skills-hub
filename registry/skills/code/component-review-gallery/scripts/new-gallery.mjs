#!/usr/bin/env node
import { cp, mkdir, readdir, readFile, writeFile, chmod } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join, resolve } from 'node:path';

/* Scaffold a component review gallery into a target directory.

     node scripts/new-gallery.mjs <target-dir> --client "BykonzYard" --project bykonzyard-variants
     optional: --credentials <env-file> --account-var CF_X_ACCOUNT_ID --token-var CF_X_TOKEN --force

   The scaffold is deliberately complete: index, gallery shell, renderer, header
   rules, the pre-deploy check, the screenshot runner and the deploy script. The
   only thing left to write is the component data file. */

const here = dirname(fileURLToPath(import.meta.url));
const skillRoot = join(here, '..');
const templateDir = join(skillRoot, 'assets', 'template');

function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith('--')) args[key] = true;
      else {
        args[key] = next;
        i += 1;
      }
    } else {
      args._.push(token);
    }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
const targetArg = args._[0];
const client = args.client;
const project = args.project;

if (!targetArg || !client || !project) {
  console.error('usage: new-gallery.mjs <target-dir> --client "Client Name" --project pages-project-name');
  process.exit(1);
}

const target = resolve(targetArg);
if (existsSync(target) && !args.force) {
  const entries = await readdir(target);
  if (entries.length) {
    console.error('refusing to overwrite ' + target + ': it already has ' + entries.length + ' entries');
    console.error('pass --force if that is really what you want');
    process.exit(1);
  }
}

const slug = client
  .toLowerCase()
  .replace(/[^a-z0-9]+/g, '-')
  .replace(/^-|-$/g, '');
const envPrefix = 'CF_' + slug.replace(/-/g, '_').toUpperCase();

const tokens = {
  '{{CLIENT}}': client,
  '{{PROJECT}}': project,
  '{{CREDENTIALS}}': args.credentials ?? '~/.siso/credentials/' + slug + '.env',
  '{{ACCOUNT_ID_VAR}}': args['account-var'] ?? envPrefix + '_ACCOUNT_ID',
  '{{TOKEN_VAR}}': args['token-var'] ?? envPrefix + '_TOKEN',
};

await mkdir(target, { recursive: true });
await cp(templateDir, target, { recursive: true });

const TEXT_EXTENSIONS = /\.(html|css|js|mjs|json|md|sh|txt|yml|yaml)$/;
const touched = [];

async function walk(dir) {
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) {
      await walk(full);
      continue;
    }
    if (!TEXT_EXTENSIONS.test(entry.name)) continue;
    const before = await readFile(full, 'utf8');
    let after = before;
    for (const [token, value] of Object.entries(tokens)) {
      after = after.split(token).join(value);
    }
    if (after !== before) {
      await writeFile(full, after);
      touched.push(full.replace(target + '/', ''));
    }
  }
}
await walk(target);
await chmod(join(target, 'deploy.sh'), 0o755);

console.log('scaffolded ' + client + ' gallery at ' + target);
console.log('  pages project : ' + project);
console.log('  credentials   : ' + tokens['{{CREDENTIALS}}']);
console.log('                  ' + tokens['{{ACCOUNT_ID_VAR}}'] + ' + ' + tokens['{{TOKEN_VAR}}']);
console.log('  filled tokens : ' + touched.length + ' file(s)');
console.log('');
console.log('next:');
console.log('  1. copy the client logo, social icons and background art into site/assets/');
console.log('  2. rewrite site/components/example.js into the real component');
console.log('     (method: references/writing-variants.md in this skill)');
console.log('  3. node scripts/check.mjs');
console.log('  4. serve site/ locally, run node scripts/shots.mjs, then look at the PNGs');
console.log('  5. ./deploy.sh');
