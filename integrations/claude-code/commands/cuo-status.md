---
description: Explain CUO Claude Code telemetry location, provenance rules, and optional integrations.
disable-model-invocation: true
---

Summarize how CUO is integrated in this Claude Code session:

1. Telemetry path: `~/.cuo/telemetry/` (sessions, activity, optimizations) — local files only, no database.
2. Provenance: status-line context tokens = Real when present; `cost.total_cost_usd` = Estimated; Cursor context composition = no public API.
3. Optional tools: Ponytail (thrift/review) and Graphify (query existing graph — do not rebuild unless asked).
4. If hooks/statusline are missing, point the user to `integrations/claude-code/install.ps1` or `install.sh`.
