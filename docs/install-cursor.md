# Install CUO in Cursor

This guide installs the **CUO** extension in Cursor (or VS Code-compatible hosts) from a `.vsix` file.

## Prerequisites

- [Cursor](https://cursor.com/) installed (or VS Code 1.85+)
- Windows, macOS, or Linux
- To **build** from source: Node.js 18+ and npm

You do **not** need Claude Code, Ponytail, or Graphify for the Cursor extension to work.

## Option A — Install a prebuilt `.vsix` (fastest)

1. Get `cuo-1.1.0.vsix` (from a release, clone, or after you run `npm run package`).
2. Open Cursor.
3. Open the Extensions view (`Ctrl+Shift+X` / `Cmd+Shift+X`).
4. Open the `⋯` menu at the top of Extensions.
5. Choose **Install from VSIX…**.
6. Select `cuo-1.1.0.vsix`.
7. When prompted, **Reload** the window.

### CLI alternative (Windows example)

```powershell
& "$env:LOCALAPPDATA\Programs\cursor\resources\app\bin\cursor.cmd" --install-extension "C:\path\to\cuo-1.1.0.vsix" --force
```

Then reload Cursor (`Developer: Reload Window` from the Command Palette).

## Option B — Build the `.vsix` yourself

1. Clone this repository and open a terminal in the project root.
2. Install dependencies:
   ```bash
   npm install
   ```
3. Run checks (optional but recommended):
   ```bash
   npm run check:task
   ```
4. Package:
   ```bash
   npm run package
   ```
5. Install the generated `cuo-1.1.0.vsix` using Option A.

## Verify it works

1. Confirm the extension is listed as `cuo.cuo` (version `1.1.0` or later).
2. Open the **CUO** icon in the Activity Bar, **or** run **CUO: Open Dashboard** from the Command Palette (`Ctrl+Shift+P`).
3. Run **CUO: Analyze Workspace**.
4. Open the **Integrations** and **Cross-Agent** tabs in the dashboard.

You should see metric badges labeled `Real`, `Estimated`, `Imported`, or `Unavailable`. CUO never invents a “Real” total for Cursor Context Usage composition (there is no public API for that).

## First-time tips

| Goal | What to do |
|------|------------|
| Import numbers from the Cursor UI | **CUO: Import Context Report** or **CUO: Capture Manual Context Snapshot** |
| Apply a file change | Review a recommendation → authorize when asked → use **Revert Last** if needed |
| Connect Claude Code telemetry later | See [install-claude-code.md](install-claude-code.md) |
| Optional tools | See [install-optional-tools.md](install-optional-tools.md) |

## Troubleshooting

| Problem | Fix |
|---------|-----|
| Extension not listed after install | Reload window; confirm you picked the new `.vsix` (`1.1.0`, not an old `1.0.0`) |
| Dashboard stays empty | Run **CUO: Analyze Workspace**; open a folder workspace first |
| Status bar missing | Settings → search `cuo.statusBarEnabled` → enable |
| CLI `cursor` not found | Use the full path under `%LOCALAPPDATA%\Programs\cursor\resources\app\bin\` on Windows |
| Types/tests fail while packaging | Run `npm install` again, then `npm run check:task` |

## Uninstall

1. Extensions → find **CUO**.
2. Uninstall.
3. Optional: delete local shared telemetry at `~/.cuo/telemetry` (also used by Claude Code integration).

## Related docs

- [Install Claude Code](install-claude-code.md)
- [Optional: Ponytail & Graphify](install-optional-tools.md)
- [Architecture](architecture/overview.md)
- [Context usage limitations](context-usage-limitations.md)
