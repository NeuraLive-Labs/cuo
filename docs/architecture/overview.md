# CUO Architecture Overview

## Runtime

CUO is a VS Code/Cursor extension (`src/extension.ts`) plus optional Claude Code hooks. Core logic does not require a database or backend.

- **Sidebar webview** (`cuo.sidebar`) — compact analytics surface
- **Dashboard panel** — Overview, Context, Optimize, Cross-Agent, Integrations, History, Project
- **Command Palette** — analyze, import, capture, apply, revert, export, Claude Code install
- **Status bar** — latest context total with provenance label
- **Claude Code plugin** — `integrations/claude-code` (hooks + statusLine + skills)

## Layering

```
CUO Core (metrics, telemetry files, cross-agent analytics)
   ├── Adapter: Cursor (extension host)
   ├── Adapter: Claude Code (hooks/statusline → ~/.cuo/telemetry)
   ├── Adapter: Ponytail (detect/observe only)
   └── Adapter: Graphify (detect + query existing graph)
Integration Manager → enable/disable without breaking Core
```

## Module map

| Module | Path | Responsibility |
|--------|------|----------------|
| Context Intelligence | `src/context/` | Acquire category breakdown with provenance |
| Context Optimizer | `src/context/contextOptimizer.ts` | `.cursorignore`, large/open files, Graphify-aware retrieval |
| Prompt Optimizer | `src/prompts/` | Redundancy/ambiguity; before/after estimates |
| Rules Optimizer | `src/rules/` | `.cursor/rules`, AGENTS.md duplicates/size |
| Skills Optimizer | `src/skills/` | Long/duplicate skills |
| MCP Optimizer | `src/mcp/` | Config inventory, duplicate disable (authorized) |
| Conversation Optimizer | `src/conversation/` | Transcript strategies; Graphify-aware handoffs |
| Waste Detector | `src/waste-detector/` | Merge/dedupe/prioritize findings |
| Model Advisor | `src/model-advisor/` | Advisory recommendations only |
| Optimization Engine | `src/optimization-engine/` | Coordinate analyzers + auth gate + telemetry write |
| Usage Monitor | `src/usage/` | Session stats; distinguish context vs billed vs cost |
| Local Telemetry | `src/core/localTelemetry.ts` | Shared JSONL under `~/.cuo/telemetry` |
| Cross-Agent Analytics | `src/core/crossAgentAnalytics.ts` | Normalize Cursor vs Claude Code |
| Integration Manager | `src/integrations/` | Detect/toggle Cursor, Claude Code, Ponytail, Graphify |
| Analytics | `src/analytics/` | Bundle for webviews/export (includes ecosystem) |
| Storage | `src/storage/` | `globalState` / `workspaceState` / `storageUri` |

## Metrics provenance

See [ADR-001](../decisions/ADR-001-metrics-provenance.md). Every metric carries `Real | Estimated | Imported | Unavailable`.

## Authorization

See [ADR-003](../decisions/ADR-003-authorized-mutations.md). Modes: Analysis / Recommendation / Assisted / Automatic (safe allowlist only).

## Multi-agent

See [ADR-004](../decisions/ADR-004-multi-agent-ecosystem.md) and `docs/integrations/`.
