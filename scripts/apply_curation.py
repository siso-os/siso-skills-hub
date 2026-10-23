#!/usr/bin/env python3
"""Apply the Hub keep/cut policy using the existing shared-home installer.

Archive receipts come from agents/harness/stack/lib/skill-home.mjs; no second installer,
event counter or source directory is created. Settings/agent files are backed up
before their narrow owned fields are refreshed.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import importlib.machinery
import importlib.util
import json
from pathlib import Path
import shutil
import socket
import subprocess
import sys

HUB = Path(__file__).resolve().parents[1]
REPO = HUB.parents[2]
HELPER = REPO/'agents/harness/stack/lib/skill-home.mjs'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--dry-run', action='store_true')
    args = parser.parse_args()
    policy = json.loads((HUB/'registry/curation-20261021.json').read_text())
    keepers = set(policy['install_ids'])
    reviewed = {v['name'] for v in policy['verdicts']}
    home = Path.home()
    roots = [home/tool/'skills' for tool in ['.claude', '.codex', '.agents']]
    installed = {p.name for root in roots if root.exists() for p in root.iterdir()
                 if not p.name.startswith('.') and (p/'SKILL.md').is_file()}
    unknown = installed-reviewed
    if unknown:
        raise RuntimeError('Unreviewed installed names retained: '+', '.join(sorted(unknown)))
    spec = importlib.util.spec_from_loader('curation_cli', importlib.machinery.SourceFileLoader('curation_cli', str(HUB/'scripts/skills')))
    cli = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(cli)
    entries = {e['skill_id']:e for e in cli.load_registry()['skills']}
    for name in sorted(keepers):
        entry = entries[name]
        cli._validate_source(name, entry, cli.find_skill_dir(name))
    plan = {'keep': sorted(keepers), 'archive': sorted(installed-keepers),
            'native_visibility': policy['native_visibility'], 'machine': socket.gethostname()}
    if args.dry_run:
        print(json.dumps(plan, sort_keys=True))
        return
    if not HELPER.is_file():
        raise RuntimeError('Shared-home installer landing is required before applying curation')
    from types import SimpleNamespace
    for name in sorted(keepers):
        if cli.cmd_install(SimpleNamespace(skill_id=name, agent=None, target=None, link=False, dry_run=False)):
            raise RuntimeError('keeper installation failed: '+name)
    # Claude links must be archived before their canonical payloads.
    archive_count = 0
    for root in roots:
        for name in sorted(installed-keepers):
            target = root/name
            if not target.exists() and not target.is_symlink():
                continue
            command = ['node','--input-type=module','-e',
                       'const {archive}=await import(process.argv[1]); archive(process.argv[2],process.argv[3]);',
                       HELPER.as_uri(),str(target),str(home)]
            subprocess.run(command, check=True, capture_output=True, text=True)
            archive_count += 1
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup = home/'.claude/backups/skills-curate-20261021'/stamp
    backup.mkdir(parents=True)
    manifest = backup/'MANIFEST.txt'

    def save_before(path):
        if path.exists():
            relative = path.relative_to(home)
            target = backup/relative
            target.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(path, target, follow_symlinks=True)
            with manifest.open('a') as out:
                out.write(f'{path}\t{target}\tsha256={hashlib.sha256(target.read_bytes()).hexdigest()}\n')

    # Preserve auth, hooks, permissions and all other settings. Do not print them.
    settings_paths = {home/'.claude/settings.json'}
    settings_paths.update((home/'.config').glob('claude-*/settings.json'))
    for path in settings_paths:
        if not path.exists() and path.parent != home/'.claude':
            continue
        settings = json.loads(path.read_text()) if path.exists() else {}
        overrides = settings.setdefault('skillOverrides', {})
        desired = dict(policy['native_visibility'])
        desired.update({n:'on' for n in keepers})
        desired.update({n:'off' for n in installed-keepers})
        if any(overrides.get(k)!=v for k,v in desired.items()):
            save_before(path)
            overrides.update(desired)
            path.write_text(json.dumps(settings, indent=2)+'\n')
    for name in ['scout','runner','checker','librarian','upgrader','researcher','senior-engineer']:
        source = REPO/'agents/harness/stack/profiles/agents'/f'{name}.md'
        target = home/'.claude/agents'/f'{name}.md'
        if target.exists() and target.read_bytes()==source.read_bytes():
            continue
        save_before(target)
        if target.is_symlink():
            subprocess.run(['node','--input-type=module','-e',
                            'const {archive}=await import(process.argv[1]); archive(process.argv[2],process.argv[3]);',
                            HELPER.as_uri(),str(target),str(home)], check=True, capture_output=True, text=True)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(source.read_bytes())
    result = subprocess.run(['node',str(HELPER),'doctor',str(home)], check=True, capture_output=True, text=True)
    doctor = json.loads(result.stdout)
    if doctor['skills']!=len(keepers) or doctor['issues']:
        raise RuntimeError('installed curation readback failed')
    receipt = {'status':'CURATION_INSTALLED','machine':socket.gethostname(),'keepers':len(keepers),
               'archived_copies':archive_count,'claude_links':doctor['claude_links'],
               'native_overrides':len(policy['native_visibility']), 'preloaded_agents':7,
               'issues':doctor['issues'],'source_sha':subprocess.check_output(['git','rev-parse','HEAD'],cwd=REPO,text=True).strip()}
    (backup/'receipt.json').write_text(json.dumps(receipt,indent=2)+'\n')
    print(json.dumps(receipt,sort_keys=True))


if __name__=='__main__':
    main()
