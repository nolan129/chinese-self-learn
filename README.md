# Hán Note

Hán Note is a personal AI-assisted Chinese learning system for Vietnamese speakers. The product turns pasted Chinese work chat into learnable vocabulary, spaced review sessions, and reminder workflows across web and mobile.

## Workspace Layout

- `apps/web`: Next.js web client
- `apps/mobile`: Expo mobile client
- `apps/api`: FastAPI backend
- `packages/shared`: shared contract artifacts
- `docs/handoff`: implementation handoff documents
- `docs/preview`: static design previews

## Session Continuity

Before doing any work, read:

1. `AGENTS.md`
2. `PROJECT_STATE.md`
3. `NEXT_STEPS.md`
4. `DECISIONS.md`

## Local Infrastructure

- PostgreSQL is provided through `docker-compose.yml`.
- Backend Python must use `apps/api/.venv`.
- Do not write files with PowerShell commands; use `apply_patch` or UTF-8 `python` / `node` scripts.
