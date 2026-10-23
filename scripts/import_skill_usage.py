#!/usr/bin/env python3
"""Import structured Claude/Codex observations into the existing Hub counter.

No transcript content or arguments are stored. Explicit Skill/use_skill calls
are invocations; Codex SKILL.md reads are separately labelled observations.
Stable IDs deduplicate repeated scans and assistant streaming updates.
"""
import argparse
from datetime import datetime, timezone
import hashlib
import json
from pathlib import Path
import re
import time
from skills_telemetry import track, get_db

NAME = re.compile(r'^[A-Za-z0-9][A-Za-z0-9_.:-]{0,199}$')
DEFINITION = re.compile(r'(?:^|[/\\])skills[/\\]([^/\\\s"\x27]+)[/\\]SKILL\.md')


def observations(record, harness):
    if harness == 'claude':
        if record.get('type') != 'assistant':
            return []
        parts = record.get('message', {}).get('content', [])
    else:
        if record.get('type') != 'response_item':
            return []
        parts = [record.get('payload', {})]
    found = []
    for part in parts:
        if not isinstance(part, dict) or part.get('type') not in {'tool_use', 'function_call', 'custom_tool_call'}:
            continue
        tool = part.get('name', '')
        args = part.get('input', part.get('arguments', {}))
        if tool.rsplit('__', 1)[-1] in {'Skill', 'use_skill'}:
            if isinstance(args, str):
                try:
                    args = json.loads(args)
                except ValueError:
                    continue
            if not isinstance(args, dict):
                continue
            name = args.get('skill', args.get('name', ''))
            if isinstance(name, str) and NAME.fullmatch(name):
                found.append((part.get('id', part.get('call_id', '')), name, 'invocation'))
        elif harness == 'codex' and tool.rsplit('__', 1)[-1] in {'exec', 'exec_command', 'shell', 'read_file', 'Read'}:
            # A read proves a load attempt, not successful application of a skill.
            text = args if isinstance(args, str) else json.dumps(args)
            try:
                parsed = json.loads(text)
            except ValueError:
                parsed = None
            commands = []
            if isinstance(parsed, dict):
                commands = [parsed.get('cmd', parsed.get('command', ''))]
            elif tool.endswith('exec'):
                for match in re.finditer(r'(?:cmd|command)["\x27]?\s*:\s*("(?:\\.|[^"\\])*")', text):
                    try:
                        commands.append(json.loads(match[1]))
                    except ValueError:
                        pass
            for command in commands:
                # Do not count quoted examples inside patches or Python heredocs.
                if not isinstance(command, str) or '<<' in command or not re.search(r'(?:^|[;\n]|&&)\s*(?:cat|sed|head)\s', command):
                    continue
                for name in sorted(set(DEFINITION.findall(command))):
                    if NAME.fullmatch(name):
                        found.append((part.get('id', part.get('call_id', '')), name, 'definition_read'))
    return found


def import_file(path, harness, cutoff):
    count = 0
    stat = path.stat()
    source_hash = hashlib.sha256(str(path.resolve()).encode()).hexdigest()
    conn = get_db()
    cursor = conn.execute('SELECT inode, byte_offset FROM skill_import_cursors WHERE source_hash=?', (source_hash,)).fetchone()
    conn.close()
    offset = cursor[1] if cursor and cursor[0] == stat.st_ino and cursor[1] <= stat.st_size else 0
    if offset == stat.st_size:
        return 0
    with path.open('rb') as source:
        source.seek(offset)
        while True:
            number = source.tell()
            line = source.readline()
            if not line:
                offset = source.tell()
                break
            if not line.endswith(b'\n'):
                offset = number  # A live writer may not have finished this record yet.
                break
            try:
                row = json.loads(line)
            except ValueError:
                continue
            stamp = row.get('timestamp')
            try:
                at = datetime.fromisoformat(stamp.replace('Z', '+00:00')).timestamp() if stamp else path.stat().st_mtime
            except (ValueError, TypeError, AttributeError):
                continue
            if at < cutoff:
                continue
            for call_id, name, kind in observations(row, harness):
                identity = f'{path.resolve()}:{call_id or number}:{name}:{kind}' + (':v2' if kind == 'definition_read' else '')
                event_id = 'transcript:' + hashlib.sha256(identity.encode()).hexdigest()
                agent = harness+':'+kind + (':v2' if kind == 'definition_read' else '')
                track(name, agent_id=agent, error_type=None if kind == 'invocation' else kind,
                      event_id=event_id, timestamp=at)
                count += 1
    conn = get_db()
    conn.execute('INSERT OR REPLACE INTO skill_import_cursors VALUES (?,?,?)', (source_hash,stat.st_ino,offset))
    conn.commit()
    conn.close()
    return count


def usage_summary(days=7):
    conn = get_db()
    rows = conn.execute('''SELECT skill_id, agent_id, COUNT(*) FROM skill_events
        WHERE timestamp >= ? AND agent_id IN ('claude:invocation', 'codex:invocation', 'codex:definition_read:v2')
        GROUP BY skill_id, agent_id ORDER BY skill_id, agent_id''', (time.time()-days*86400,)).fetchall()
    conn.close()
    result = {'days': days, 'observed_skill_invocations': 0, 'codex_definition_reads': 0, 'by_skill': {}}
    for name, agent, count in rows:
        key = 'definition_reads' if ':definition_read' in agent else 'invocations'
        result['by_skill'].setdefault(name, {}).setdefault(agent.split(':')[0], {})[key] = count
        result['codex_definition_reads' if key == 'definition_reads' else 'observed_skill_invocations'] += count
    return result


def refresh_usage(days=7, claude_root=None, codex_root=None):
    cutoff = time.time()-days*86400
    files, candidates, unavailable = 0, 0, 0
    for harness, root in [('claude', claude_root or Path.home()/'.claude/projects'), ('codex', codex_root or Path.home()/'.codex/sessions')]:
        for path in root.glob('**/*.jsonl'):
            try:
                if path.stat().st_mtime < cutoff:
                    continue
                files += 1
                candidates += import_file(path, harness, cutoff)
            except OSError:
                unavailable += 1
    return {'files': files, 'unavailable_files': unavailable, 'candidate_observations': candidates, 'usage': usage_summary(days)}


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--days', type=int, default=7)
    parser.add_argument('--claude-root', type=Path)
    parser.add_argument('--codex-root', type=Path)
    args = parser.parse_args()
    print(json.dumps(refresh_usage(args.days,args.claude_root,args.codex_root), sort_keys=True))


if __name__ == '__main__':
    main()
