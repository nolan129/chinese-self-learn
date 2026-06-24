# OpenAPI Artifacts

This directory is the canonical location for exported OpenAPI artifacts from `apps/api`.

Use `apps/api/scripts/export_openapi.py` from the backend environment to export `app.openapi()` into this directory as UTF-8 JSON.
Then run `node scripts/generate-shared-client.mjs` from the repo root to regenerate `packages/shared/src/han-note.ts`.
