# Claude Code integration

## Official surfaces used

| Surface | Doc | CUO use |
|---------|-----|---------|
| Hooks | https://code.claude.com/docs/en/hooks/ | SessionStart/End, UserPromptSubmit, PostToolUse, Stop → activity + session state |
| Status line | https://code.claude.com/docs/en/statusline | `context_window.*` (Real), `cost.total_cost_usd` (Estimated) |
| Plugins / skills / commands | https://code.claude.com/docs/en/plugins/overview | Bundled under `integrations/claude-code` |

## Install without Cursor

```powershell
powershell -ExecutionPolicy Bypass -File integrations/claude-code/install.ps1
```

Telemetry: `~/.cuo/telemetry/`.

## Limitations

- Hook stdin does not reliably include token/cost fields; statusLine is the documented source.
- Cost is client-side Estimated and may differ from billing.
- No private Claude Code APIs are used or claimed.
