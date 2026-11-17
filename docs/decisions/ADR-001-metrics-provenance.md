# ADR-001: Provenance-aware metrics acquisition (no invented Context Usage API)

## Status
Accepted

## Date
2026-11-17

## Context
CUO must explain Context Usage, but Cursor does not expose a public extension API for per-category context window occupancy. Official Cursor extension APIs under `vscode.cursor` cover MCP/plugin registration only. Enterprise Admin/Analytics APIs require team credentials and measure billed usage events, not live context composition. Scraping private SQLite auth tokens or undocumented HTTP endpoints is unstable, privacy-hostile, and out of product scope (local-only, no external code transmission).

## Decision
Implement a metrics acquisition architecture with explicit provenance on every numeric claim:

- **Real** — values from supported, documented local sources the user controls (e.g. file byte sizes, parsed config inventories).
- **Estimated** — local heuristics (chars/token, file relevance scores) always labeled Estimated.
- **Imported** — user-pasted or file-imported Context Usage reports / screenshots transcribed as structured data.
- **Unavailable** — category present in the model but no source; UI shows Unavailable, never zero-as-real.

Acquisition order: official/local documented inventory → imported report → manual capture → estimates → Unavailable.

## Consequences
- Dashboard and status bar must render provenance badges.
- Optimization savings are estimates unless derived from Real inventory deltas.
- Users may import Cursor UI reports to improve accuracy without CUO calling private APIs.
