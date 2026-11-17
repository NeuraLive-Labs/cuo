# Graphify integration

Upstream: https://github.com/Graphify-Labs/graphify (MIT). PyPI package name: `graphifyy` (CLI: `graphify`). Requires Python ≥ 3.10.

## CUO behavior

- Detects CLI on PATH and/or existing `graphify-out/graph.json`.
- Prefers `graphify query` / local graph peek — **never** regenerates the graph on every CUO analysis.
- Suggests manual `graphify --update` only when the graph looks stale (>7 days).
- Context / Conversation optimizers recommend graph-aware retrieval when a graph exists.

## Role split

Graphify structures and retrieves knowledge. CUO uses those structures to reduce wasteful re-reads.
