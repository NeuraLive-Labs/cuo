# Constraints

Last reviewed: 2026-11-17 by CUO engineering

## Floor (always enforced, no setup required)

- No new suppression comments: `@ts-ignore`, `eslint-disable`, `# noqa`, `# type: ignore`
- No unimplemented stubs: `throw new Error("Not implemented")`, empty `catch {}`
- No skipped or deleted tests without a reason in the commit message
- No secrets in source
- This file does not get weakened to make a change pass
- Never present Estimated/Imported metrics as Real
- Never modify workspace files without an explicit user authorization flow
- Never send workspace code to external services

## Enforced with numbers

| Dimension | Rule | Checked by | Runs at |
|-----------|------|------------|---------|
| Types | Zero type errors | `npm run check:types` | every edit / task end |
| Tests | Full suite green | `npm test` | task end |
| Packaging | Installable VSIX builds | `npm run package` | ship |

## Measured, not yet enforced

| Metric | Today | Direction |
|--------|-------|-----------|
| Project coverage | establish after first green suite | must not fall |

## Exceptions

None.
