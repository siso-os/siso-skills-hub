---
name: headroom
description: "Headroom \u2014 measured, opt-in context compaction"

  Use the SISO Agent Base Headroom sidecar for an explicit, reversible,
  loopback-only worker launch when context compaction is worth measuring.
  Trigger for headroom, context compression, compact tool output, or a
  sidecar pilot. Do not enable it automatically or change persistent routing.
---

# Headroom — measured, opt-in context compaction

Headroom is an operational sidecar, not a prompt rule. The owned harness is
`~/bin/siso-headroom` and the implementation is `integrations/headroom/`. It
binds `127.0.0.1:18790`, preserves the existing upstream, disables telemetry
and learning, and keeps the pilot stateless and lossless.

```bash
siso-headroom enable
siso-headroom status
siso-headroom minimax -p 'RETURN: one line. STOP: after answer.'
siso-headroom codex exec --ephemeral 'Return OK only.'
siso-headroom disable
```

Run the Oracle proof before making a routing claim:

```bash
HEADROOM_BIN=/path/to/venv/bin/headroom node integrations/headroom/smoke-oracle-sidecar.mjs
```

Do not use `headroom learn`, persistent provider config, production routing, or
an MCP replacement without explicit approval and measured evidence.
