# Project Rules for Codex

## Session Startup

At the start of every session, read these files in this order:

1. `AGENTS.md`
2. `PROJECT_STATE.md`
3. `NEXT_STEPS.md`
4. `DECISIONS.md`

Do this before exploring the repo or making changes so a new chat can resume work without re-reading the entire codebase.

## Continuity Files

The following files are mandatory project continuity artifacts and must live at the repo root:

- `AGENTS.md`
- `PROJECT_STATE.md`
- `NEXT_STEPS.md`
- `DECISIONS.md`

At the end of every session:

- update `PROJECT_STATE.md`
- update `NEXT_STEPS.md`
- update `DECISIONS.md` when any architectural or workflow decision changed
- update `AGENTS.md` only when project rules changed

## File Editing Rules

- Never edit files with PowerShell write commands.
- Use `apply_patch` for direct file edits whenever possible.
- If a script is needed, use `python` or `node`.
- All scripts that write files must explicitly write UTF-8.
- Prefer ASCII-only file contents unless the file already uses Unicode or Vietnamese text is materially clearer.

## Repo Shape

This repo is the canonical Hán Note workspace. Use this structure:

- `apps/web`
- `apps/mobile`
- `apps/api`
- `packages/shared`
- `docs`

Do not create a nested repo for the product.

## Definition of Done for a Session

A session is only complete when:

- code or docs for the intended change are updated
- relevant validation was attempted and results are recorded
- `PROJECT_STATE.md` reflects the new current state
- `NEXT_STEPS.md` reflects the next actionable backlog
- `DECISIONS.md` captures new decisions or explicitly notes that no new decisions were made
