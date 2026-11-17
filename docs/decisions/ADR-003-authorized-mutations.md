# ADR-003: User-authorized file mutations with rollback

## Status
Accepted

## Date
2026-11-17

## Context
Optimizers may recommend edits to `.cursorignore`, rules, skills, and MCP configs. Silent mutation would violate trust and product rules.

## Decision
- Analysis and Recommendation modes never write files.
- Assisted mode proposes a concrete diff and requires QuickPick/modal confirmation.
- Automatic mode may only execute actions listed in `cuo.safeAutoActions` after the user configured them.
- Before any write, snapshot prior content to storage for `CUO: Revert Last Authorized Change`.

## Consequences
- Engine coordinates analyzers but owns the authorization gate.
- MCP disable/revert only touches known config files CUO can parse.
