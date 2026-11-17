# Install CUO in Claude Code

This guide installs **CUO for Claude Code** so it works **even when Cursor is closed**.

CUO uses only documented Claude Code features:

- Hooks
- Status line
- Skills / commands
- Optional local plugin folder

Official references:

- https://code.claude.com/docs/en/hooks/
- https://code.claude.com/docs/en/statusline
- https://code.claude.com/docs/en/plugins/overview

## Prerequisites

- [Claude Code](https://claude.ai/code) installed and working in a terminal
- [Node.js](https://nodejs.org/) 18+ available as `node` on your PATH (hooks/statusline scripts are Node)
- This CUO repository (or the files under `integrations/claude-code/` from a Cursor VSIX install)

Cursor is **optional**. Shared telemetry lives in `~/.cuo/telemetry/` (Windows: `C:\Users\<you>\.cuo\telemetry\`).

## What gets installed

| Piece | Purpose |
|-------|---------|
| Hooks (`SessionStart`, `SessionEnd`, `UserPromptSubmit`, `PostToolUse`, `Stop`) | Session + tool activity log |
| Status line script | Context tokens (**Real** when present) + cost (**Estimated**) |
| Skill `/cuo` and command `/cuo-status` | In-session guidance |
| Files under `~/.cuo/claude-code/` | Local copy of scripts |

## Install (Windows)

1. Open PowerShell.
2. Go to the CUO repo (or the extension’s `integrations/claude-code` folder):
   ```powershell
   cd C:\path\to\CUO
   ```
3. Run:
   ```powershell
   powershell -ExecutionPolicy Bypass -File .\integrations\claude-code\install.ps1
   ```
4. Confirm the script printed paths for:
   - Plugin copy → `~\.cuo\claude-code`
   - Settings → `~\.claude\settings.json`
   - Telemetry → `~\.cuo\telemetry`
5. **Fully restart Claude Code** (quit and open a new session).

### From Cursor (same machine)

1. Install the CUO Cursor extension.
2. Command Palette → **CUO: Install Claude Code Integration**.
3. Approve/watch the terminal that runs `install.ps1`.
4. Restart Claude Code.

## Install (macOS / Linux)

1. Open a terminal in the CUO repo.
2. Run:
   ```bash
   bash integrations/claude-code/install.sh
   ```
3. Restart Claude Code.

## Verify it works

1. Start a new Claude Code session in any project.
2. Look for a status line fragment like: `[CUO] … · ctx N% · $… est`
3. Check that files appear under:
   - `~/.cuo/telemetry/sessions/`
   - `~/.cuo/telemetry/activity/`
4. In Claude Code, try:
   - `/cuo` — usage / waste guidance
   - `/cuo-status` — where telemetry lives and provenance rules
5. If Cursor is also installed, open **CUO → Cross-Agent** to see Claude Code sessions next to Cursor.

## How to use day-to-day

1. Work normally in Claude Code.
2. CUO hooks record session/tool activity locally (no cloud upload by CUO).
3. When context feels bloated:
   - run `/cuo`
   - prefer a short handoff summary over pasting huge transcripts
   - if Graphify exists, query the graph instead of re-reading whole folders
4. Optional: install Ponytail for thriftier edits (see [install-optional-tools.md](install-optional-tools.md)).

## Honest limitations

| Topic | Reality |
|-------|---------|
| Tokens | Status-line `context_window.*` fields are **Real** when Claude Code provides them |
| Cost | `cost.total_cost_usd` is **Estimated** (client-side; may differ from your bill) |
| Hooks vs tokens | Hook events alone often lack token/cost fields — that is why the status line script exists |
| Private APIs | CUO does not use undocumented Claude Code APIs |
| Cursor Context Usage | Still unavailable as a public composition API, even with both tools installed |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Status line never shows `[CUO]` | Confirm `statusLine.command` in `~/.claude/settings.json` points at `cuo-statusline.mjs`; restart Claude Code |
| `node` not found | Install Node.js 18+ and reopen the terminal |
| Hooks do nothing | Ensure `hooks` entries reference `cuo-hook.mjs`; exit code must stay 0 (scripts are non-blocking) |
| Settings merge failed | Open `~/.cuo/claude-code/cuo-settings.snippet.json` if created and merge manually into `settings.json` |
| No files in `~/.cuo/telemetry` | Trigger a prompt or tool use after restart; check write permissions on `~/.cuo` |
| Cursor Cross-Agent empty for Claude | Confirm both tools write to the same user home `~/.cuo/telemetry` |

## Uninstall / disable

1. Remove CUO hook blocks and `statusLine` from `~/.claude/settings.json` (or restore a backup).
2. Delete `~/.claude/skills/cuo/` if present.
3. Optional: delete `~/.cuo/claude-code/` and `~/.cuo/telemetry/`.

## Related docs

- Package details: [`../integrations/claude-code/README.md`](../integrations/claude-code/README.md)
- Technical notes: [integrations/claude-code.md](integrations/claude-code.md)
- Cursor install: [install-cursor.md](install-cursor.md)
