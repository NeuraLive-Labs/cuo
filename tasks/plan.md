# Implementation Plan: CUO

## Overview
Ship a complete local-only Cursor/VS Code extension that analyzes and reduces wasted AI context with honest provenance.

## Architecture Decisions
- Provenance-aware metrics (ADR-001)
- VS Code storage only (ADR-002)
- Authorized mutations with rollback (ADR-003)

## Task List
### Phase 1: Foundation — complete
### Phase 2: Analyzers + engine — complete
### Phase 3: Webview dashboard — complete
### Phase 4: Tests + packaging — in progress

## Risks
| Risk | Impact | Mitigation |
|------|--------|------------|
| No Context Usage API | High | Provenance model + import/manual |
| Accidental file writes | High | Auth modal + backups |
