# Han Note API

## Local Setup

1. Start PostgreSQL from repo root:

   `docker-compose up -d`

2. Create the local virtual environment with a clean CPython runtime.

   On this workstation, prefer the bundled Codex Python instead of the machine Anaconda runtime:

   `C:\Users\sonnt\.cache\codex-runtimes\codex-primary-runtime\dependencies\python\python.exe -m venv .venv`

3. Install dependencies from the local environment:

   `.venv\Scripts\python -m pip install -e .[dev]`

4. Copy environment variables:

   `copy .env.example .env`

   For the default local fallback AI path, keep:

   - `AI_PROVIDER=dev`
   - `AUTH_TOKEN_SECRET=<long random secret before sharing the app>`

   To enable a live OpenAI-compatible provider later, update `.env` with:

   - `AI_PROVIDER=openai_compatible`
   - `AI_API_URL=<provider chat completions endpoint>`
   - `AI_API_KEY=<provider secret>`
   - `AI_MODEL=<provider model id>`
   - optional: `AI_TIMEOUT_SECONDS=20`
   - optional: `AI_MAX_RETRIES=1`

   The backend keeps the local fallback path when `AI_PROVIDER=openai_compatible` is selected but the remote endpoint or model is still missing.

   Auth defaults for local development:

   - `AUTH_ACCESS_TOKEN_TTL_MINUTES=720`
   - `AUTH_REFRESH_TOKEN_TTL_DAYS=30`

5. Run the first migration:

   `.venv\Scripts\python -m alembic upgrade head`

6. Start the API:

   `.venv\Scripts\python -m uvicorn app.main:app --host 0.0.0.0 --port 8011 --reload`

## Contract Export

Export OpenAPI JSON into `packages/shared/openapi/`:

`python scripts/export_openapi.py`
