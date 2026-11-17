# ADR-002: Persistence via VS Code extension storage only

## Status
Accepted

## Date
2026-11-17

## Context
Requirements forbid databases, Docker, backends, and external dashboards. History, analytics, and rollback snapshots must survive reloads.

## Decision
Use only:

- `ExtensionContext.globalState` — global preferences, cross-workspace history summaries
- `ExtensionContext.workspaceState` — project analysis cache
- `ExtensionContext.storageUri` / `globalStorageUri` — larger JSON snapshots and rollback payloads via `vscode.workspace.fs`
- **Shared local files** under `~/.cuo/telemetry/` (JSON/JSONL) for cross-tool telemetry so Claude Code hooks can write without the VS Code extension host (still no DB)

## Consequences
- No SQLite/Postgres/Mongo dependencies
- Rollback limited to changes CUO itself applied and snapshotted
- Storage size managed with configurable history limits
- Cross-agent analytics read the same file tree Cursor and Claude Code write
