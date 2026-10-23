---
name: prove-model-routing
description: Prove the provider and model that served a request from the gateway's read-only request log; use when runtime labels or fallback warnings are ambiguous.
disable-model-invocation: true
---

# prove-model-routing

A banner is intent, not proof. Inspect the gateway's read-only request artifact
and report the observed provider, model, request count, and token totals. Never
change routing or credentials from this skill.

```bash
python3 -c "
import sqlite3
c=sqlite3.connect('file:$HOME/.config/bifrost/logs.db?mode=ro',uri=True)
for row in c.execute('select provider,model,count(*) from (select * from logs order by rowid desc limit 200) group by 1,2 order by 3 desc'):
    print(row)
"
```

The result is evidence only. If the expected approved lane is absent, report
BLOCKED and preserve the artifact. Native Codex work is Luna, deliberate review
is Sol, and cheap semantic bulk from Claude uses only the Haiku transport.
