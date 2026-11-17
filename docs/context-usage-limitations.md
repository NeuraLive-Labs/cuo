# Context Usage API limitations

## What Cursor exposes publicly (as of 2026-11)

- Extension namespace `vscode.cursor` — MCP server registration and plugin path registration ([Cursor Extension API](https://cursor.com/docs/extension-api)).
- Enterprise Admin / Analytics APIs — team usage events and spend, not live context composition for personal extensions ([Cursor APIs](https://cursor.com/docs/api)).

## What CUO does **not** do

- Invent a fake “official Context Usage API”
- Scrape Cursor’s private SQLite auth tokens
- Call undocumented `api2.cursor.sh` dashboard RPCs
- Present Estimated category tokens as Real
- Mutate Cursor chat history without a supported API

## What CUO does instead

1. **Local inventory (Real bytes / Estimated tokens)** — rules, skills, MCP configs, open editors
2. **Imported reports** — paste JSON or key/value lines from the Cursor UI
3. **Manual capture** — enter category totals observed in the UI
4. **Unavailable** — system prompt, built-in tools, live conversation, subagents when no source exists

UI badges always show provenance.
