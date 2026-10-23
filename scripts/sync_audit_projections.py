#!/usr/bin/env python3
"""Back up, archive, install and byte-verify the bounded skills-audit fixes."""
import hashlib
import importlib.machinery
import importlib.util
import json
import os
from pathlib import Path
import shutil
import socket
import subprocess
import sys
from datetime import datetime, timezone

HUB = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_loader('hub_cli', importlib.machinery.SourceFileLoader('hub_cli', str(HUB / 'scripts/skills')))
cli = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli)


def fingerprint(path):
    if path.is_symlink():
        return 'symlink:' + os.readlink(path)
    if path.is_file():
        return hashlib.sha256(path.read_bytes()).hexdigest()
    if path.is_dir():
        return {str(p.relative_to(path)): fingerprint(p) for p in sorted(path.rglob('*')) if p.is_file() or p.is_symlink()}
    return 'absent'


def main():
    if (HUB / 'registry/curation-20261021.json').is_file():
        subprocess.run([sys.executable, str(HUB/'scripts/apply_curation.py')], check=True)
        return
    policy = json.loads((HUB / 'registry/audit-policy.json').read_text())
    registry = cli.load_registry()['skills']
    entries = {s['skill_id']: s for s in registry}
    for entry in registry:
        for alias in entry.get('aliases', []):
            entries[alias] = entry
    # Validate every source before touching an installed target.
    for name in policy['install_ids']:
        entry = entries[name]
        cli._validate_source(entry['skill_id'], entry, cli.find_skill_dir(entry['skill_id']))
    home = Path.home()
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ')
    backup = home / '.claude/backups/skills-fix-20261021'
    archive = home / 'SISO_Workspace/_archive/2026-10-21-skills' / socket.gethostname() / stamp
    backup.mkdir(parents=True, exist_ok=True)
    manifest = backup / 'MANIFEST.txt'

    def preserve(target):
        if not target.exists() and not target.is_symlink():
            return
        rel = target.relative_to(home)
        saved = backup / stamp / rel
        saved.parent.mkdir(parents=True, exist_ok=True)
        before = fingerprint(target)
        if target.is_symlink():
            # Keep the original link and its readable payload, so restoring does
            # not depend on a source checkout remaining at the same revision.
            saved.symlink_to(os.readlink(target))
            if target.is_dir():
                shutil.copytree(target.resolve(), saved.with_name(saved.name + '.payload'), symlinks=True)
        elif target.is_dir():
            shutil.copytree(target, saved, symlinks=True)
        else:
            shutil.copy2(target, saved)
        assert fingerprint(saved) == before, f'backup mismatch: {target}'
        with manifest.open('a') as out:
            out.write(json.dumps({'original': str(target), 'backup': str(saved), 'fingerprint': before, 'restore': 'archive replacement, then copy backup to original; symlink payload saved beside link'}, sort_keys=True) + '\n')
            out.flush()
            os.fsync(out.fileno())
        retired = archive / rel
        retired.parent.mkdir(parents=True, exist_ok=True)
        # Rename only this exact backed-up projection. No delete or overwrite.
        target.rename(retired)
        with (archive / 'MANIFEST.txt').open('a') as out:
            out.write(f'{target}\t{retired}\tbackup={saved}\n')

    checked = 0
    from types import SimpleNamespace
    for name in policy['install_ids']:
        result = cli.cmd_install(SimpleNamespace(skill_id=name, agent=None, target=None, link=False, dry_run=False))
        if result:
            raise RuntimeError(f'canonical install failed: {name}')
        entry = entries[name]
        source = cli.find_skill_dir(entry['skill_id'])
        expected = {str(p.relative_to(source)): hashlib.sha256(p.read_bytes()).hexdigest()
                    for p in cli.source_files(entry, source) if p.is_file()}
        for harness in ['.agents', '.claude']:
            target = home / harness / 'skills' / name
            actual = {str(p.relative_to(target)): hashlib.sha256(p.read_bytes()).hexdigest()
                      for p in target.rglob('*') if p.is_file()}
            assert actual == expected, f'projection mismatch: {target}'
            checked += 1
        assert not (home / '.codex/skills' / name).exists(), f'Codex duplicate: {name}'
    for harness in ['.agents', '.claude', '.codex']:
        for name in policy['archive_unavailable']:
            preserve(home / harness / 'skills' / name)
    receipt = {'machine': socket.gethostname(), 'checked_at': stamp, 'verified_projections': checked,
               'names': policy['install_ids'], 'backup_manifest': str(manifest), 'archive': str(archive)}
    (backup / 'receipt.json').write_text(json.dumps(receipt, indent=2) + '\n')
    print(f'SKILLS_PROJECTIONS_OK machine={receipt["machine"]} projections={checked} broken=0 manifest={manifest}')


if __name__ == '__main__':
    main()
