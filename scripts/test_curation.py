import json
import os
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch
import import_skill_usage as usage
import skills_telemetry as telemetry

HUB = Path(__file__).resolve().parents[1]


class CurationTests(unittest.TestCase):
    def test_budget_coverage_and_preloads(self):
        policy = json.loads((HUB/'registry/curation-20261021.json').read_text())
        registry = json.loads((HUB/'registry/skills_registry.json').read_text())['skills']
        entries = {e['skill_id']:e for e in registry}
        keepers = policy['install_ids']
        self.assertLessEqual(len(keepers), 21)  # +1, 23 Oct (BRAVE): research-first
        self.assertEqual(set(keepers), {v['name'] for v in policy['verdicts'] if v['verdict']=='keep'})
        self.assertTrue(set(entries) <= {v['name'] for v in policy['verdicts']})
        baseline=json.loads((HUB.parents[2]/'_archive/2026-10-21-skills/audit-baseline/INDEX.json').read_text())
        accounted={v['name'] for v in policy['verdicts']+policy['source_only_verdicts']}
        self.assertTrue({v['name'] for v in baseline['skills']} <= accounted)
        # Conservative character upper bound; report token estimates separately.
        self.assertLessEqual(sum(len(n)+len(entries[n]['description'])+100 for n in keepers)/3, 3000)
        for n in keepers:
            self.assertTrue(entries[n]['description'].startswith('Use when'))
            self.assertLessEqual(len(entries[n]['description']), 300)
        for name in ['scout','runner','checker','librarian','upgrader','researcher','senior-engineer']:
            text=(HUB.parents[2]/'agents/harness/stack/profiles/agents'/f'{name}.md').read_text()
            line=next(l for l in text.splitlines() if l.startswith('skills: ['))
            skills=[s.strip() for s in line[9:-1].split(',')]
            self.assertTrue(1<=len(skills)<=3)
            self.assertTrue(set(skills)<=set(keepers))

    def test_structured_only_and_codex_read_distinction(self):
        row={'type':'assistant','message':{'content':[{'type':'tool_use','name':'Skill','id':'a','input':{'skill':'librarian','prompt':'private'}}]}}
        self.assertEqual(usage.observations(row,'claude'),[('a','librarian','invocation')])
        row['type']='user'
        self.assertEqual(usage.observations(row,'claude'),[])
        row={'type':'response_item','payload':{'type':'function_call','name':'exec_command','call_id':'b','arguments':json.dumps({'cmd':'cat /repo/.agents/skills/land/SKILL.md'})}}
        self.assertEqual(usage.observations(row,'codex'),[('b','land','definition_read')])
        row['payload']['arguments']=json.dumps({'cmd':'echo land'})
        self.assertEqual(usage.observations(row,'codex'),[])
        row['payload']['name']='apply_patch'
        row['payload']['arguments']='cat /repo/.agents/skills/land/SKILL.md'
        self.assertEqual(usage.observations(row,'codex'),[])

    def test_idempotent_existing_counter(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(telemetry,'DB_PATH',Path(directory)/'telemetry.db'):
            for _ in range(2):
                telemetry.track('librarian',agent_id='codex:invocation',event_id='same')
            summary=usage.usage_summary()
            self.assertEqual(summary['observed_skill_invocations'],1)
            conn=telemetry.get_db()
            self.assertEqual(conn.execute('SELECT COUNT(*) FROM skill_events').fetchone()[0],1)
            conn.close()

    def test_incremental_import_and_incomplete_live_record(self):
        with tempfile.TemporaryDirectory() as directory, patch.object(telemetry,'DB_PATH',Path(directory)/'telemetry.db'):
            path=Path(directory)/'synthetic.jsonl'
            row={'type':'assistant','message':{'content':[{'type':'tool_use','name':'Skill','id':'one','input':{'skill':'librarian'}}]}}
            path.write_text(json.dumps(row)+'\n'+json.dumps(row))
            self.assertEqual(usage.import_file(path,'claude',0),1)
            self.assertEqual(usage.import_file(path,'claude',0),0)
            with path.open('a') as out:
                out.write('\n')
            self.assertEqual(usage.import_file(path,'claude',0),1)
            self.assertEqual(usage.usage_summary()['observed_skill_invocations'],1)


if __name__=='__main__':
    unittest.main()
