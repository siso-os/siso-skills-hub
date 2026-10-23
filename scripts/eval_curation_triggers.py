#!/usr/bin/env python3
"""Bounded Skill-tool trigger eval, adapted from anthropics/skills skill-creator.

Uses real descriptions and inert project fixtures. Personal skills can outrank
those fixtures, so the after arm verifies the installed descriptions. No workflow mutation tools,
hooks, MCP servers or persisted transcripts. Only aggregate evidence is saved.
Global skills remain competing candidates, as in skill-creator's run_eval.py.
"""
import argparse
from concurrent.futures import ThreadPoolExecutor, as_completed
import json
import os
from pathlib import Path
import re
import subprocess
import tempfile

HUB = Path(__file__).resolve().parents[1]
REPO = HUB.parents[2]


def run_query(root, case, phase, query, expected):
    name = case['name'] if phase == 'before' else case['after_name']
    settings = {'disableAllHooks':True, 'disableSkillShellExecution':True}
    if phase == 'after':
        policy = json.loads((HUB/'registry/curation-20261021.json').read_text())
        settings['skillOverrides'] = {v['name']:('on' if v['verdict']=='keep' else 'off') for v in policy['verdicts']}
        settings['skillOverrides'].update(policy['native_visibility'])
    command = ['claude', '-p', query, '--model', 'claude-haiku-5-5',
               '--output-format', 'stream-json', '--verbose', '--no-session-persistence',
               '--max-turns', '2', '--tools', 'Skill', '--allowedTools', 'Skill',
               '--settings', json.dumps(settings), '--strict-mcp-config',
               '--mcp-config', '{"mcpServers":{}}']
    env = dict(os.environ)
    env.pop('CLAUDECODE', None)
    try:
        process = subprocess.run(command, cwd=root, env=env, capture_output=True, text=True, timeout=100)
    except subprocess.TimeoutExpired:
        return {'skill': case['name'], 'phase': phase, 'expected': expected, 'status': 'blocked', 'reason': 'timeout'}
    calls, models, errors = [], set(), []
    for line in process.stdout.splitlines():
        try:
            event = json.loads(line)
        except ValueError:
            continue
        if event.get('type') == 'assistant':
            message = event.get('message', {})
            if message.get('model'):
                models.add(message['model'])
            for part in message.get('content', []):
                if part.get('type') == 'tool_use' and part.get('name') == 'Skill':
                    calls.append(part.get('input', {}).get('skill', ''))
        if event.get('type') == 'result' and event.get('is_error'):
            errors.append(event.get('subtype', 'error'))
    # Tool execution errors after the first Skill call do not erase the observed trigger.
    status = 'observed' if calls or (process.returncode == 0 and not errors) else 'blocked'
    return {'skill': case['name'], 'phase': phase, 'expected': expected, 'status': status,
            'triggered': name in calls, 'called_skills': calls, 'models': sorted(models),
            'exit_code': process.returncode, 'errors': errors}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--output', type=Path, required=True)
    parser.add_argument('--workers', type=int, default=2)
    parser.add_argument('--phase', choices=['both','after'], default='both')
    args = parser.parse_args()
    cases = json.loads((HUB / 'evals/curation-trigger-cases.json').read_text())
    entries = json.loads((HUB / 'registry/skills_registry.json').read_text())['skills']
    entries = {entry['skill_id']: entry for entry in entries}
    installed_descriptions = {}
    if args.phase == 'after':
        policy = json.loads((HUB/'registry/curation-20261021.json').read_text())
        for name in policy['install_ids']:
            text=(Path.home()/'.claude/skills'/name/'SKILL.md').read_text()
            description=re.search(r'^description: (.*)$',text,re.M)[1]
            if description != entries[name]['description']:
                raise RuntimeError('Installed description differs from evaluated source: '+name)
            installed_descriptions[name]=description
    results = []
    if args.phase == 'after' and args.output.exists():
        results = [r for r in json.loads(args.output.read_text())['results'] if r['phase']=='before']
    with tempfile.TemporaryDirectory(prefix='siso-trigger-eval-') as directory:
        roots = {}
        for phase in (['before', 'after'] if args.phase=='both' else ['after']):
            root = Path(directory) / phase
            roots[phase] = root
            if phase == 'after':
                policy = json.loads((HUB/'registry/curation-20261021.json').read_text())
                for name in policy['install_ids']:
                    folder = root/'.claude/skills'/name
                    folder.mkdir(parents=True, exist_ok=True)
                    (folder/'SKILL.md').write_text(
                        f'---\nname: {name}\ndescription: {json.dumps(entries[name]["description"])}\n---\n\n'
                        'Trigger evaluation fixture. Reply CURATE_TRIGGERED. Do not run the real workflow.\n')
            for case in cases:
                name = case['name'] if phase == 'before' else case['after_name']
                if phase == 'before':
                    description = case['before_description']
                else:
                    description = entries[name]['description']
                folder = root / '.claude/skills' / name
                folder.mkdir(parents=True, exist_ok=True)
                (folder / 'SKILL.md').write_text(
                    f'---\nname: {name}\ndescription: {json.dumps(description)}\n---\n\n'
                    'Trigger evaluation fixture. Reply CURATE_TRIGGERED. Do not run the real workflow.\n')
                if phase == 'after' and name != case['name']:
                    old = root / '.claude/skills' / case['name']
                    old.mkdir(parents=True, exist_ok=True)
                    (old / 'SKILL.md').write_text(
                        f'---\nname: {case["name"]}\ndescription: Archived alias\ndisable-model-invocation: true\n---\n')
        with ThreadPoolExecutor(max_workers=args.workers) as pool:
            futures = []
            for phase in roots:
                for case in cases:
                    for expected, queries in [(True, case['positive_queries']), (False, case['negative_queries'])]:
                        for query in queries:
                            futures.append(pool.submit(run_query, roots[phase], case, phase, query, expected))
            for future in as_completed(futures):
                result = future.result()
                results.append(result)
                print(f'{len(results)}/60 {result["phase"]} {result["skill"]} {result["status"]}', flush=True)
                args.output.parent.mkdir(parents=True, exist_ok=True)
                args.output.write_text(json.dumps({'method': 'real Skill tool; two positive and one negative query per skill per arm; final after arm validates all 20 installed personal descriptions; mutation tools, hooks, MCP and skill shell execution disabled; personal bodies may outrank inert project fixtures',
                    'model_requested': 'claude-haiku-5-5', 'after_installed_descriptions':installed_descriptions,
                    'results': results}, indent=2)+'\n')


if __name__ == '__main__':
    main()
