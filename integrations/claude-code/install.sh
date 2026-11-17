#!/usr/bin/env bash
# CUO for Claude Code — local install (macOS/Linux)
set -euo pipefail

ROOT="$(cd "$(dirname "$0")" && pwd)"
DEST="${HOME}/.cuo/claude-code"
CLAUDE_DIR="${HOME}/.claude"
SETTINGS="${CLAUDE_DIR}/settings.json"

mkdir -p "$DEST" "$CLAUDE_DIR"
cp -R "$ROOT"/. "$DEST"/

HOOK="$DEST/scripts/cuo-hook.mjs"
STATUS="$DEST/scripts/cuo-statusline.mjs"

python3 - <<PY
import json, os
settings_path = os.path.expanduser("~/.claude/settings.json")
hook = os.path.expanduser("~/.cuo/claude-code/scripts/cuo-hook.mjs")
status = os.path.expanduser("~/.cuo/claude-code/scripts/cuo-statusline.mjs")

def entry(event):
    cmd = f'node "{hook}" {event}'
    item = {"hooks": [{"type": "command", "command": cmd}]}
    if event == "SessionEnd":
        item["hooks"][0]["timeout"] = 5
    return item

data = {}
if os.path.exists(settings_path):
    try:
        with open(settings_path, "r", encoding="utf-8") as f:
            data = json.load(f)
    except Exception:
        data = {}

hooks = data.setdefault("hooks", {})
for event in ["SessionStart", "SessionEnd", "UserPromptSubmit", "PostToolUse", "Stop"]:
    existing = hooks.get(event, []) or []
    filtered = []
    for block in existing:
        cmds = " ".join(h.get("command", "") for h in block.get("hooks", []))
        if "cuo-hook.mjs" in cmds:
            continue
        filtered.append(block)
    hooks[event] = filtered + [entry(event)]

data["statusLine"] = {"type": "command", "command": f'node "{status}"', "padding": 2}

os.makedirs(os.path.dirname(settings_path), exist_ok=True)
with open(settings_path, "w", encoding="utf-8") as f:
    json.dump(data, f, indent=2)
    f.write("\n")
print(f"Updated {settings_path}")
PY

mkdir -p "${CLAUDE_DIR}/skills/cuo"
cp -f "$DEST/skills/cuo/SKILL.md" "${CLAUDE_DIR}/skills/cuo/SKILL.md"

echo "CUO Claude Code integration installed."
echo "  Plugin copy: $DEST"
echo "  Settings:    $SETTINGS"
echo "  Telemetry:   ${HOME}/.cuo/telemetry"
echo "Restart Claude Code (or start a new session) to load hooks/statusline."
