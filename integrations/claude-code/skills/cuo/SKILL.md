---
name: cuo
description: CUO usage optimizer guidance for Claude Code — track context waste, prefer Graphify queries, respect Ponytail thrift, and write local telemetry.
disable-model-invocation: false
---

# CUO for Claude Code

You are working with **CUO** (Context / Usage Optimizer). CUO coordinates and measures; it does not replace Ponytail or Graphify.

## Principles

1. Prefer the smallest correct change (Ponytail-compatible thrift). Never skip validation, security, or tests for risky logic.
2. If `graphify-out/graph.json` exists, prefer `graphify query` / `graphify explain` over re-reading large directories. Do **not** regenerate the graph unless the user asks or it is clearly stale.
3. Track waste: repetitive tool loops, oversized file dumps, redundant instructions.
4. Never claim Real metrics for Estimated or Unavailable values. Claude Code status-line `cost.total_cost_usd` is **Estimated**; `context_window` token fields are **Real** when present.

## When invoked (`/cuo`)

1. Summarize the current task goal in ≤5 bullets.
2. List likely context waste (files, tools, repeats).
3. Recommend: compact handoff, Graphify query, or Ponytail review/audit if installed.
4. Remind that telemetry lands in `~/.cuo/telemetry/` via CUO hooks/statusline (no Cursor required).

## Commands the user may also run

- `/cuo-status` — how to read local telemetry
- Ponytail (if installed): `/ponytail-review`, `/ponytail-audit`
- Graphify (if installed): `/graphify query "…"`
