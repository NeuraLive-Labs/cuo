# AGENTS

Read `CONSTRAINTS.md` before writing code. Do not weaken it to make a change pass.

CUO is a local-only multi-agent usage optimizer:

- **Core** measures/coordinates (Cursor extension + shared `~/.cuo/telemetry`)
- **Ponytail** (optional) improves how agents write code — detect only, do not redistribute
- **Graphify** (optional) structures knowledge — query existing graphs; do not auto-rebuild

Metrics must carry provenance (`Real` | `Estimated` | `Imported` | `Unavailable`). There is no public Cursor Context Usage API — do not invent one. Claude Code `cost.total_cost_usd` is Estimated.
