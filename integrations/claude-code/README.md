# CUO for Claude Code

**Full install guide:** [docs/install-claude-code.md](../../docs/install-claude-code.md)

Local integration that works **without Cursor**. Uses only officially documented Claude Code surfaces:

- [Hooks](https://code.claude.com/docs/en/hooks/)
- [Status line](https://code.claude.com/docs/en/statusline)
- [Plugins / skills / commands](https://code.claude.com/docs/en/plugins/overview)

## Install

### Windows

```powershell
powershell -ExecutionPolicy Bypass -File integrations/claude-code/install.ps1
```

Or from Cursor: **CUO: Install Claude Code Integration**.

### macOS / Linux

```bash
bash integrations/claude-code/install.sh
```

### Plugin load (alternative)

If you use Claude Code plugin marketplaces / local folders, point Claude Code at this directory (`integrations/claude-code`) which contains `.claude-plugin/plugin.json` and `hooks/hooks.json`.

## What you get

| Feature | Mechanism | Provenance |
|---------|-----------|------------|
| Session tracking | SessionStart / SessionEnd hooks | Real (event occurrence) |
| Tool analysis + repetitive ops | PostToolUse hook | Real counts; Estimated for “repetitive” heuristic |
| Context tokens in/out | statusLine `context_window.*` | **Real** when present |
| Cost | statusLine `cost.total_cost_usd` | **Estimated** (client-side) |
| Recommendations | skill `/cuo` + activity heuristics | Advisory |
| Activity log | `~/.cuo/telemetry/activity/*.jsonl` | Local files |
| Core communication | Shared `~/.cuo/telemetry` read by CUO Cursor dashboard | — |

## Limitations (honest)

- No private Claude Code APIs.
- Hooks do not always include token/cost fields — statusLine is the documented source for those.
- Cost is never labeled Real.
- Cursor Context Usage composition remains unavailable even when both tools are installed.

## Optional companions

- **Ponytail** — improves agent thrift/review (install separately; MIT).
- **Graphify** — query existing `graphify-out/graph.json`; CUO will not auto-rebuild.
