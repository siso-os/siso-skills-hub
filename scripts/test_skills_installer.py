#!/usr/bin/env python3
"""Focused safety regression tests for the Skills Hub installer."""
import importlib.util
from importlib.machinery import SourceFileLoader
import os
import subprocess
import sys
import tempfile
import time
from unittest.mock import patch
from types import SimpleNamespace
from pathlib import Path


HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_loader("skills_cli", SourceFileLoader("skills_cli", str(HERE / "skills")))
skills = importlib.util.module_from_spec(spec)
spec.loader.exec_module(skills)


def source(root, skill_id="fixture-skill"):
    path = root / "registry" / "skills" / "code" / skill_id
    path.mkdir(parents=True)
    (path / "SKILL.md").write_text("---\nname: fixture\ndescription: fixture\n---\n# Fixture\n")
    (path / "support.txt").write_text("support")
    return path


def entry(skill_id="fixture-skill"):
    return {"skill_id": skill_id, "category": "code", "files": {"required": ["SKILL.md"]}}


def main():
    with tempfile.TemporaryDirectory(prefix="skills-installer-test-") as raw:
        root = Path(raw).resolve()
        src = source(root)
        skills.SKILLS_DIR = root / "registry" / "skills"
        skills._validate_source("fixture-skill", entry(), src)

        bad_required = entry(); bad_required["files"] = {"required": ["../escape"]}
        try: skills._validate_source("fixture-skill", bad_required, src)
        except ValueError: pass
        else: raise AssertionError("path traversal should be refused")
        (src / "SKILL.md").write_text("---\nname: fixture\ndescription: \n---\n")
        try: skills._validate_source("fixture-skill", entry(), src)
        except ValueError: pass
        else: raise AssertionError("empty frontmatter should be refused")
        (src / "SKILL.md").write_text("---\nname: fixture\ndescription: fixture\n---\n# Fixture\n")
        (src / "state.json").write_text("runtime")
        try: skills._validate_source("fixture-skill", entry(), src)
        except ValueError: pass
        else: raise AssertionError("runtime payload should be refused")
        (src / "state.json").unlink()

        # CLI dry-run must not even create the target parent directory.
        target_root = root / "dry-run-target"
        original_registry, original_find = skills.load_registry, skills.find_skill_dir
        skills.load_registry = lambda: {"skills": [entry()]}
        skills.find_skill_dir = lambda skill_id: src
        assert skills.cmd_install(SimpleNamespace(skill_id="fixture-skill", target=str(target_root),
                                                  agent=None, link=False, dry_run=True)) == 0
        assert not target_root.exists()
        skills.load_registry, skills.find_skill_dir = original_registry, original_find

        # Remote pins and dry-run are decided before any subprocess/network call.
        remote = {"skill_id": "remote-skill", "category": "code", "remote_url": "https://example.invalid/repo", "commit_hash": None}
        skills.load_registry = lambda: {"skills": [remote]}
        skills.find_skill_dir = lambda skill_id: None
        args = SimpleNamespace(skill_id="remote-skill@main", target=str(root / "remote"), agent=None, link=False, dry_run=True)
        assert skills.cmd_install(args) == 1 and not (root / "remote").exists()
        args.skill_id = "remote-skill"
        assert skills.cmd_install(args) == 1
        remote["commit_hash"] = "a" * 40
        with patch('subprocess.run', side_effect=AssertionError('dry-run must not launch a process')):
            assert skills.cmd_install(args) == 0 and not (root / "remote").exists()
            args.agent = 'fixture-agent'
            assert skills.cmd_install(args) == 1
            args.agent = None; args.link = True
            assert skills.cmd_install(args) == 1
        skills.load_registry, skills.find_skill_dir = original_registry, original_find

        target = root / "target" / "fixture-skill"
        target.mkdir(parents=True)
        (target / "keep.txt").write_text("do not delete")
        try:
            skills._materialize(src, target)
        except FileExistsError:
            pass
        else:
            raise AssertionError("collision should be refused")
        assert (target / "keep.txt").read_text() == "do not delete"

        # Exclusive copy and identical repeat preserve all source support files.
        fresh = root / "fresh"
        assert skills._materialize(src, fresh) == "installed"
        assert skills._materialize(src, fresh) == "unchanged"
        assert (fresh / "support.txt").read_text() == "support"

        # Real independent processes racing for one target cannot replace it.
        concurrent = root / 'concurrent'
        program = """
import importlib.util, sys
from importlib.machinery import SourceFileLoader
from pathlib import Path
s=importlib.util.spec_from_loader('cli',SourceFileLoader('cli',sys.argv[1])); m=importlib.util.module_from_spec(s); s.loader.exec_module(m)
try: print(m._materialize(Path(sys.argv[2]),Path(sys.argv[3])))
except FileExistsError: sys.exit(2)
"""
        children = [subprocess.Popen([sys.executable, '-c', program, str(HERE/'skills'), str(src), str(concurrent)], stdout=subprocess.PIPE, stderr=subprocess.PIPE) for _ in range(2)]
        codes=[]
        for child in children: child.communicate(timeout=10); codes.append(child.returncode)
        assert all(code in (0,2) for code in codes) and 0 in codes
        assert (concurrent/'SKILL.md').read_bytes() == (src/'SKILL.md').read_bytes()

        # A copy failure never deletes another writer's new file; no discoverable
        # SKILL.md is exposed before all support resources are installed.
        incomplete=root/'incomplete'
        def failed_copy(*args, **kwargs):
            (incomplete/'other-owner.txt').write_text('preserve me')
            raise OSError('injected copy failure')
        with patch.object(skills.shutil, 'copy2', side_effect=failed_copy):
            try: skills._materialize(src, incomplete)
            except OSError as exc: assert 'retained' in str(exc)
            else: raise AssertionError('copy failure must surface')
        assert (incomplete/'other-owner.txt').read_text() == 'preserve me'
        assert not (incomplete/'SKILL.md').exists()

        escaped = src / "escape"
        escaped.symlink_to(Path(raw) / "outside")
        (Path(raw) / "outside").write_text("outside")
        try:
            skills._validate_source("fixture-skill", entry(), src)
        except ValueError as exc:
            assert "symlink" in str(exc)
        else:
            raise AssertionError("escaping symlink should be refused")

        link = root / "link"
        assert skills._materialize(src, link, link=True) == "installed"
        assert link.is_symlink() and link.resolve() == src.resolve()
        assert skills._materialize(src, link, link=True) == "unchanged"

        # --refresh archives an outdated copy of the same skill, then installs current source.
        # A different skill or a directory that is not a skill copy is refused and left in place.
        refresh_src = source(root, "refresh-skill")
        (refresh_src / "SKILL.md").write_text("---\nname: refresh-skill\ndescription: refresh\n---\n# New\n")
        (refresh_src / "support.txt").write_text("new support")
        other_target, bare_target, outdated_target = root / "other-target", root / "bare-target", root / "outdated-target"
        archive_root = root / "refresh-archive"
        archived = archive_root / f"skills-refresh-{time.strftime('%Y%m%d')}" / "refresh-skill"
        original_registry, original_find, original_archive = skills.load_registry, skills.find_skill_dir, skills.REFRESH_ARCHIVE
        skills.load_registry = lambda: {"skills": [entry("refresh-skill")]}
        skills.find_skill_dir = lambda skill_id: refresh_src
        skills.REFRESH_ARCHIVE = archive_root

        def install(target, refresh=False, dry_run=False):
            return skills.cmd_install(SimpleNamespace(skill_id="refresh-skill", target=str(target), agent=None,
                                                      link=False, dry_run=dry_run, refresh=refresh))

        with patch.object(skills, 'TELEMETRY_ENABLED', False):
            other = other_target / "refresh-skill"
            other.mkdir(parents=True)
            (other / "SKILL.md").write_text("---\nname: other-skill\ndescription: other\n---\n# Other\n")
            assert install(other_target, refresh=True) == 1
            assert "# Other" in (other / "SKILL.md").read_text() and not archive_root.exists()

            (bare_target / "refresh-skill").mkdir(parents=True)
            (bare_target / "refresh-skill" / "notes.txt").write_text("not a skill copy")
            assert install(bare_target, refresh=True) == 1
            assert (bare_target / "refresh-skill" / "notes.txt").read_text() == "not a skill copy" and not archive_root.exists()

            old = outdated_target / "refresh-skill"
            old.mkdir(parents=True)
            (old / "SKILL.md").write_text("---\nname: refresh-skill\ndescription: refresh\n---\n# Old\n")
            (old / "support.txt").write_text("old support")
            assert install(outdated_target) == 1 and "# Old" in (old / "SKILL.md").read_text()
            assert install(outdated_target, refresh=True, dry_run=True) == 0
            assert "# Old" in (old / "SKILL.md").read_text() and not archived.exists()

            assert install(outdated_target, refresh=True) == 0
            assert "# Old" in (archived / "SKILL.md").read_text() and (archived / "support.txt").read_text() == "old support"
            assert "# New" in (old / "SKILL.md").read_text() and (old / "support.txt").read_text() == "new support"

            # A second outdated copy on the same day never overwrites the first archive.
            (old / "SKILL.md").write_text("---\nname: refresh-skill\ndescription: refresh\n---\n# Older\n")
            assert install(outdated_target, refresh=True) == 1
            assert "# Older" in (old / "SKILL.md").read_text() and "# Old" in (archived / "SKILL.md").read_text()
        skills.load_registry, skills.find_skill_dir, skills.REFRESH_ARCHIVE = original_registry, original_find, original_archive

    print("SKILLS_INSTALLER_TEST_OK (validation, no-network dry-run, collision, concurrent no-clobber, incomplete-copy retention, idempotence, link, refresh archive)")


if __name__ == "__main__":
    main()
