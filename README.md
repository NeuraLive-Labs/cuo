# CUO — Context / Usage Optimizer

**CUO** is a local multi-agent usage optimizer for **Cursor** and **Claude Code**. It analyzes, explains, and reduces wasted AI context and related resources — with honest metric provenance.

CUO **coordinates, measures, and optimizes**. It does not replace companion tools:

| Tool | Role |
|------|------|
| **CUO** | Measure waste, recommend optimizations, shared local telemetry |
| **Ponytail** (optional) | Thriftier agent coding / review |
| **Graphify** (optional) | Knowledge graph for structured retrieval |

Maintained under [NeuraLive-Labs](https://github.com/NeuraLive-Labs).

---

## Quick start

| Host | Guide |
|------|--------|
| **Cursor** | [docs/install-cursor.md](docs/install-cursor.md) |
| **Claude Code** (no Cursor required) | [docs/install-claude-code.md](docs/install-claude-code.md) |
| **Ponytail / Graphify** (optional) | [docs/install-optional-tools.md](docs/install-optional-tools.md) |

### Español — instalación rápida

1. **Cursor:** construye o descarga `cuo-1.1.0.vsix` → Extensions → **Install from VSIX…** → recarga. Guía: [docs/install-cursor.md](docs/install-cursor.md).
2. **Claude Code:** `powershell -ExecutionPolicy Bypass -File integrations/claude-code/install.ps1` (o `bash integrations/claude-code/install.sh`) → reinicia Claude Code. Guía: [docs/install-claude-code.md](docs/install-claude-code.md).
3. **Opcional:** Ponytail y Graphify se detectan solos; no son obligatorios. Guía: [docs/install-optional-tools.md](docs/install-optional-tools.md).

---

## Install CUO in Cursor (summary)

1. `npm install` && `npm run package` (or use a published `cuo-1.1.0.vsix`).
2. Cursor → Extensions → `⋯` → **Install from VSIX…** → select the `.vsix`.
3. Reload the window.
4. Open the **CUO** Activity Bar icon or run **CUO: Open Dashboard**.

CLI (Windows):

```powershell
& "$env:LOCALAPPDATA\Programs\cursor\resources\app\bin\cursor.cmd" --install-extension ".\cuo-1.1.0.vsix" --force
```

Full steps & troubleshooting: **[docs/install-cursor.md](docs/install-cursor.md)**.

---

## Install CUO in Claude Code (summary)

Works **without Cursor**:

```powershell
powershell -ExecutionPolicy Bypass -File .\integrations\claude-code\install.ps1
```

```bash
bash integrations/claude-code/install.sh
```

Then restart Claude Code. Telemetry lands in `~/.cuo/telemetry/`.

Full steps & troubleshooting: **[docs/install-claude-code.md](docs/install-claude-code.md)**.

---

## What you get

- **CUO Core** — metrics, waste detection, optimizers, recommendations, file-based telemetry (no DB)
- **CUO for Cursor** — dashboard, Integration Manager, Cross-Agent Analytics
- **CUO for Claude Code** — hooks + status line + skills writing shared local telemetry
- **Optional adapters** — Ponytail & Graphify (safe when missing)

### Metric provenance

| Label | Meaning |
|-------|---------|
| **Real** | Documented local facts / Claude Code `context_window` tokens when present |
| **Estimated** | Heuristics or Claude Code `cost.total_cost_usd` |
| **Imported** | Pasted UI reports / Ponytail band files |
| **Unavailable** | No supported source |

There is **no** public Cursor Context Usage composition API. Details: [docs/context-usage-limitations.md](docs/context-usage-limitations.md).

---

## Privacy

- Local-only (`globalState` / `workspaceState` / `storageUri` + `~/.cuo/telemetry`)
- Never sends workspace code to external services
- File mutations require authorization and support revert when CUO applied them

---

## Develop

```bash
npm install
npm run check:task   # types + tests
npm run build
npm run package      # cuo-1.1.0.vsix
```

Architecture: [docs/architecture/overview.md](docs/architecture/overview.md) · [ADR-004](docs/decisions/ADR-004-multi-agent-ecosystem.md)

---

## License

MIT — see [LICENSE](LICENSE).

Ponytail and Graphify remain separate upstream projects (MIT). CUO detects/uses them; it does not vendor their code.
