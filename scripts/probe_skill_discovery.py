#!/usr/bin/env python3
"""Probe a fresh harness's skill catalog without sending a model turn or running hooks."""
import argparse
import json
import os
from pathlib import Path
import select
import shutil
import subprocess
import time


def probe(harness, cwd, expected):
    binary = shutil.which(harness)
    if not binary:
        raise RuntimeError(f'{harness} is not on PATH')
    command = [binary, '-m', 'gpt-6.1-sol', 'app-server', '--stdio'] if harness == 'codex' else [
        binary, '-p', '--input-format', 'stream-json', '--output-format', 'stream-json',
        '--verbose', '--no-session-persistence', '--tools', '',
        '--settings', '{"disableAllHooks":true}', '--strict-mcp-config',
        '--mcp-config', '{"mcpServers":{}}']
    process = subprocess.Popen(command, cwd=cwd, stdin=subprocess.PIPE,
                               stdout=subprocess.PIPE, stderr=subprocess.DEVNULL)
    buffer = b''

    def send(value):
        process.stdin.write((json.dumps(value) + '\n').encode())
        process.stdin.flush()

    def receive(predicate):
        nonlocal buffer
        deadline = time.monotonic() + 30
        while time.monotonic() < deadline:
            while b'\n' in buffer:
                line, buffer = buffer.split(b'\n', 1)
                message = json.loads(line)
                if predicate(message):
                    return message
            if not select.select([process.stdout], [], [], max(0, deadline - time.monotonic()))[0]:
                break
            chunk = os.read(process.stdout.fileno(), 65536)
            if not chunk:
                raise RuntimeError('Harness exited before catalog response')
            buffer += chunk
            if len(buffer) > 4 * 1024 * 1024:
                raise RuntimeError('Catalog response exceeds bounded read limit')
        raise RuntimeError('Catalog response timed out')

    try:
        if harness == 'codex':
            send({'id': 1, 'method': 'initialize', 'params': {
                'clientInfo': {'name': 'plays-skill-probe', 'version': '1.0'}}})
            init = receive(lambda value: value.get('id') == 1)
            if 'error' in init:
                raise RuntimeError(str(init['error']))
            send({'method': 'initialized', 'params': {}})
            send({'id': 2, 'method': 'skills/list', 'params': {'cwds': [str(cwd)], 'forceReload': True}})
            result = receive(lambda value: value.get('id') == 2)
            if 'error' in result:
                raise RuntimeError(str(result['error']))
            rows = result['result']['data']
            skills = [item for row in rows for item in row['skills']]
            matches = {item['name']: {key: item[key] for key in ('path', 'enabled', 'scope')}
                       for item in skills if item['name'] in expected}
            errors = sum(len(row['errors']) for row in rows)
            catalog_errors = [error for row in rows for error in row['errors']]
        else:
            send({'type': 'control_request', 'request_id': 'plays-skill-probe',
                  'request': {'subtype': 'initialize'}})
            result = receive(lambda value: value.get('type') == 'control_response')
            response = result['response']
            if response.get('subtype') != 'success':
                raise RuntimeError(str(response))
            commands = response['response'].get('commands', [])
            matches = {item['name']: {'discovered': True} for item in commands if item['name'] in expected}
            errors = None
            catalog_errors = []
        missing = sorted(set(expected) - set(matches))
        disabled = sorted(name for name, value in matches.items() if value.get('enabled') is False)
        return dict(harness=harness, fresh_process=True, model_turns=0, matches=matches,
                    missing=missing, disabled=disabled, other_catalog_errors=errors,
                    catalog_errors=catalog_errors[:3] if missing else [],
                    passed=not missing and not disabled)
    finally:
        process.stdin.close()
        try:
            process.wait(timeout=3)
        except subprocess.TimeoutExpired:
            process.terminate()
            try:
                process.wait(timeout=3)
            except subprocess.TimeoutExpired:
                process.kill()
                process.wait()


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--harness', choices=['codex', 'claude'], required=True)
    parser.add_argument('--cwd', type=Path, default=Path.cwd())
    parser.add_argument('skills', nargs='+')
    args = parser.parse_args()
    report = probe(args.harness, args.cwd.resolve(), args.skills)
    print(json.dumps(report, indent=2))
    raise SystemExit(0 if report['passed'] else 1)
