#!/usr/bin/env python3
"""Regression checks for module projections, aliases, and dormant discovery."""
import contextlib
import importlib.machinery
import importlib.util
import io
import json
from pathlib import Path
import tempfile
from types import SimpleNamespace
import unittest
from unittest.mock import patch

HERE = Path(__file__).resolve().parent
spec = importlib.util.spec_from_loader('audit_cli', importlib.machinery.SourceFileLoader('audit_cli', str(HERE / 'skills')))
cli = importlib.util.module_from_spec(spec)
spec.loader.exec_module(cli)


class AuditContract(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix='skills-audit-test-')
        self.addCleanup(self.temp.cleanup)
        self.repo = Path(self.temp.name).resolve()
        self.hub = self.repo / 'agents/skills/hub'
        self.hub.mkdir(parents=True)
        self.source = self.repo / 'module/skill'
        self.source.mkdir(parents=True)
        (self.source / 'SKILL.md').write_text('---\nname: fixture\ndescription: selected module source\n---\n')
        (self.source / 'support.txt').write_text('required support')
        (self.source / 'private.db').write_bytes(b'must never be projected')
        self.entry = {'skill_id': 'fixture', 'name': 'fixture', 'category': 'code', 'description': 'fixture',
                      'source_path': 'module/skill', 'aliases': ['fixture-alias'],
                      'files': {'required': ['SKILL.md', 'support.txt']}, 'metadata': {'status': 'active'}}
        for attr, value in [('HUB_ROOT', self.hub), ('SKILLS_DIR', self.hub / 'registry/skills'),
                            ('TELEMETRY_ENABLED', False), ('load_registry', lambda: {'skills': [self.entry]})]:
            patcher = patch.object(cli, attr, value)
            patcher.start()
            self.addCleanup(patcher.stop)

    def args(self, dry=False):
        return SimpleNamespace(skill_id='fixture-alias', target=str(self.repo / 'installed'), agent=None, link=False, dry_run=dry)

    def test_alias_module_dry_run_and_selected_support(self):
        self.assertEqual(cli.cmd_install(self.args(True)), 0)
        self.assertFalse((self.repo / 'installed').exists())
        self.assertEqual(cli.cmd_install(self.args()), 0)
        target = self.repo / 'installed/fixture-alias'
        self.assertEqual(sorted(p.name for p in target.iterdir()), ['SKILL.md', 'support.txt'])
        self.assertEqual(cli.cmd_install(self.args()), 0)
        (target / 'support.txt').write_text('another writer')
        self.assertEqual(cli.cmd_install(self.args()), 1)
        self.assertEqual((target / 'support.txt').read_text(), 'another writer')

    def test_module_traversal_refused(self):
        self.entry['source_path'] = '../escape'
        with self.assertRaises(ValueError):
            cli.source_root(self.entry)

    def test_required_parent_symlink_refused(self):
        outside = self.repo / 'outside'
        outside.mkdir()
        (outside / 'support').write_text('outside')
        (self.source / 'link').symlink_to(outside)
        self.entry['files']['required'].append('link/support')
        with self.assertRaises(ValueError):
            cli._validate_source('fixture', self.entry, self.source)

    def test_dormant_filtered_without_destroying_source(self):
        self.entry['metadata']['status'] = 'dormant'
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            self.assertEqual(cli.cmd_list(SimpleNamespace(category=None, json=True)), 0)
        self.assertEqual(json.loads(out.getvalue()), [])
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            self.assertEqual(cli.cmd_search(SimpleNamespace(query='fixture')), 0)
        self.assertNotIn('fixture: fixture', out.getvalue())
        self.assertEqual(cli.cmd_install(self.args()), 0)
        self.assertTrue((self.source / 'SKILL.md').is_file())

    def test_null_metadata_remains_discoverable(self):
        self.entry['metadata'] = None
        out = io.StringIO()
        with contextlib.redirect_stdout(out):
            cli.cmd_list(SimpleNamespace(category=None, json=True))
        self.assertEqual(len(json.loads(out.getvalue())), 1)


if __name__ == '__main__':
    unittest.main()
