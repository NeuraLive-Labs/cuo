# ADR-004: Multi-agent ecosystem via Core + adapters

## Status
Accepted

## Date
2026-11-17

## Context
CUO must coordinate Cursor, Claude Code, optional Ponytail, and optional Graphify without inventing APIs or requiring databases.

## Decision
1. Keep editor-agnostic telemetry, aggregation, and detection in Core (`src/core/*`, `src/adapters/*`, `src/integrations/*`).
2. Persist cross-tool telemetry as JSON/JSONL under `~/.cuo/telemetry/` (files only — extends ADR-002 for non-VS-Code writers).
3. Claude Code uses official Hooks + statusLine + plugin/skills only.
4. Ponytail and Graphify are optional adapters: detect, observe, recommend — never redistribute or replace them.
5. Cross-Agent Analytics refuses to invent totals when any contributor is null; aggregate provenance is the weakest contributor.

## Consequences
- Claude Code works without Cursor open.
- Missing Ponytail/Graphify does not break CUO.
- Cost from Claude Code status-line remains Estimated.
- Cursor Context Usage composition remains Unavailable / Estimated / Imported as before.
