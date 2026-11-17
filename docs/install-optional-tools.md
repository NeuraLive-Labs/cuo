# Optional tools: Ponytail and Graphify

CUO works without these. When present, CUO **detects** them and recommends using their strengths. CUO does **not** replace them and does **not** redistribute their code.

| Tool | Role | CUO role |
|------|------|----------|
| **Ponytail** | Makes the agent write less unnecessary code; review/audit | Detect install; optionally read local band files as **Imported** |
| **Graphify** | Builds a queryable knowledge graph | Detect CLI / `graphify-out/graph.json`; prefer query over mass re-reads |

## Ponytail (optional)

### Prerequisites

- A skill-capable agent host (Claude Code recommended for full commands/band)
- Install only from the upstream project: https://github.com/dietrichgebert/ponytail (MIT)

### Install (Claude Code)

From upstream docs:

```text
/plugin marketplace add DietrichGebert/ponytail
/plugin install ponytail@ponytail
```

For other hosts, follow upstream `INSTALL.md` (copy skill / `AGENTS.md` as documented there).

### How CUO uses it

1. Open CUO dashboard → **Integrations**.
2. Look for **Ponytail** status: `detected` / `missing` / `disabled`.
3. If band metrics exist under `~/.config/ponytail/band/`, CUO may show artifact counts as **Imported**.

### Limitations

- No live public metrics API is assumed.
- Band UI needs Claude Code ≥ 2.1.290 and does not appear in the VS Code chat panel (per upstream).
- Disable detection anytime: setting `cuo.integrations.ponytail` = `false`.

### Troubleshooting

| Problem | Fix |
|---------|-----|
| Always `missing` | Confirm plugin/skill install; or `AGENTS.md` / skill path contains Ponytail |
| Want CUO only | Leave Ponytail uninstalled — CUO keeps working |

---

## Graphify (optional)

### Prerequisites

- Python **3.10+**
- Upstream: https://github.com/Graphify-Labs/graphify (MIT)
- PyPI package name is currently **`graphifyy`**; the CLI command is still **`graphify`**

### Install

```bash
pip install graphifyy
graphify install
```

On Windows, if `graphify` is not found, add your Python `Scripts` folder to PATH, or use `pipx install graphifyy`.

### Create a graph once (manual)

In your project:

```text
/graphify .
```

or use the CLI as documented upstream. Output typically includes `graphify-out/graph.json`.

### How CUO uses it

1. CUO looks for an existing `graphify-out/graph.json` and/or `graphify` on PATH.
2. Context / Conversation optimizers recommend **querying** that graph instead of dumping large file sets into chat.
3. CUO **does not** regenerate the graph on every analysis.
4. If the graph looks older than ~7 days, CUO may *suggest* a manual `graphify --update` — it will not run a rebuild for you.

Useful upstream commands:

```bash
graphify query "what connects A to B?"
graphify explain "SomeSymbol"
```

### Limitations

- Without `graph.json`, Graphify features in CUO stay `Unavailable` / advisory only.
- Neo4j/MCP extras are optional upstream features; CUO does not require them.
- Disable detection: setting `cuo.integrations.graphify` = `false`.

### Troubleshooting

| Problem | Fix |
|---------|-----|
| `graphify` not recognized | Fix PATH / reinstall with `pipx`; confirm Python ≥ 3.10 |
| CUO says no graph | Run `/graphify .` once in the project; confirm `graphify-out/graph.json` exists |
| Fear of accidental rebuilds | CUO only peeks/queries; rebuilds are always your explicit action |

---

## Related docs

- [Install Cursor](install-cursor.md)
- [Install Claude Code](install-claude-code.md)
- [Ponytail notes](integrations/ponytail.md)
- [Graphify notes](integrations/graphify.md)
