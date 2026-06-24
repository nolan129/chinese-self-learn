# DECISIONS

## 2026-06-19

### Context

The repo started as a handoff markdown plus a UI starter extracted into a subfolder. The project needs durable continuity across Codex sessions and a single canonical implementation layout.

### Decision

- Use the repo root as the canonical Hán Note workspace.
- Normalize the repo into `apps/web`, `apps/mobile`, `apps/api`, `packages/shared`, and `docs`.
- Use `FastAPI + PostgreSQL` for the backend.
- Treat `AGENTS.md`, `PROJECT_STATE.md`, `NEXT_STEPS.md`, and `DECISIONS.md` as mandatory continuity files.
- Forbid PowerShell-based file writes; use `apply_patch` or UTF-8 `python` / `node` scripts instead.

### Consequence

- Future sessions can resume from continuity docs first instead of re-reading the full repo.
- Backend and frontend work will follow a monorepo layout instead of keeping `han-note-ui-starter` as the long-term structure.
- All Python dependency work must happen through a local virtual environment, not the global toolchain.

### Context

The first integrated validation pass exposed two environment-specific issues: Next.js 16 production builds on this Windows machine fall back to WASM bindings and fail under Turbopack, and OpenAPI export should not require a live Postgres runtime or `asyncpg` to be installed globally.

### Decision

- Use `next build --webpack` for `apps/web` production builds on this workstation.
- Allow OpenAPI export to run with `HAN_NOTE_SKIP_DB_ENGINE=1` so schema export is decoupled from database driver availability.
- Keep the current shared TS client as a temporary handwritten mirror while also exporting the canonical OpenAPI JSON artifact.

### Consequence

- Web production builds are stable on the current Windows environment.
- Contract export can be regenerated before the full backend runtime is provisioned locally.
- There is now one clear follow-up task: replace the handwritten TS contract with generated code from the exported OpenAPI artifact.

### Context

When moving from code-only validation to live runtime validation, the machine Anaconda-based Python environment caused two concrete failures: `venv` creation produced a broken environment without working `pip`, and runtime imports for `_ctypes` / `asyncpg` failed. The bundled Codex Python runtime worked cleanly, while Windows zoneinfo support also required `tzdata` for `Asia/Bangkok`.

### Decision

- Create `apps/api/.venv` from the bundled Codex Python runtime on this workstation instead of the machine Anaconda Python.
- Add explicit setuptools build metadata so editable install only packages `app*`.
- Add `tzdata` as a backend dependency for Windows-compatible `ZoneInfo` support.

### Consequence

- The backend can now install into a clean local `.venv`, run Alembic against Docker Postgres, and serve live requests successfully.
- Future sessions should treat the bundled Codex Python as the default bootstrap interpreter for this repo unless the machine Python environment changes.

### Context

The first real browser QA pass exposed two live-runtime issues that were invisible in direct HTTP validation: the backend rejected frontend preflight requests without CORS middleware, and Expo web in the managed Codex environment could not rely on its default event-log file handling.

### Decision

- Add FastAPI `CORSMiddleware` with explicit local dev origins for web and Expo clients.
- Keep a checked-in browser smoke test for the web app at `scripts/web-smoke-test.cjs`, with artifacts written to `docs/qa/web-smoke`.
- Use a custom Expo web launcher at `scripts/start-mobile-web.cjs` to bypass Expo event logger initialization in this environment, and keep a separate mobile smoke harness at `scripts/mobile-web-smoke-test.cjs`.

### Consequence

- The live web flow is now validated through a real browser against the local API and database, not just through direct HTTP calls.
- Local frontend dev now has an explicit CORS contract in backend settings instead of relying on same-origin assumptions.
- Mobile QA can run from the local preview using the custom launcher and captured smoke artifacts.

### Context

When recovering Expo web after an interrupted local package install, the reliable path on this workstation was to resolve Expo CLI from the hoisted root workspace dependencies and let `apps/mobile` reuse the root `node_modules` instead of a partially reified local copy.

### Decision

- Make `scripts/start-mobile-web.cjs` resolve `@expo/cli` from either `apps/mobile/node_modules` or the hoisted root workspace `node_modules`.
- Preserve the interrupted local install as `apps/mobile/node_modules.incomplete-20260620`.
- Point `apps/mobile/node_modules` back to the root workspace dependencies so Expo web preview can boot and smoke tests can run.

### Consequence

- Mobile web preview at `http://127.0.0.1:19006` is working again and browser smoke QA passed.
- The repo now has a temporary dependency-recovery artifact that should be normalized in a later cleanup pass instead of being treated as the desired long-term bootstrap state.

### Context

The exported OpenAPI JSON was already the canonical backend contract, but `packages/shared/src/han-note.ts` was still a handwritten mirror. That left the frontend type surface open to drift even after the backend export path was working.

### Decision

- Generate `packages/shared/src/han-note.ts` from `packages/shared/openapi/han-note.openapi.json` with a checked-in local script at `scripts/generate-shared-client.mjs`.
- Keep the app-facing shared client stable by preserving `createApiClient` and compatibility aliases such as `Token`, `Explanation`, `VocabularyItem`, and `NotificationSettings`.
- Add a root script entry, `contract:generate:shared`, so future sessions can regenerate the shared contract without re-deriving the workflow.

### Consequence

- The web and mobile apps now consume a shared client/types file whose source of truth is the exported OpenAPI artifact instead of a manually maintained mirror.
- Future API shape changes now have one explicit frontend sync path: export OpenAPI from the backend, then run the shared client generator.

### Context

The mobile preview was stable again, but only because of ad hoc recovery artifacts: a full junction from `apps/mobile/node_modules` to the root `node_modules`, plus a backup of an interrupted local install. That was enough for QA, but it was not a maintainable bootstrap state for future sessions.

### Decision

- Add `scripts/bootstrap-mobile-node-modules.cjs` to create a minimal `apps/mobile/node_modules` directory with compatibility links only for the mobile app's direct dependencies and supporting scopes.
- Add `scripts/run-mobile-expo.cjs` and route the `apps/mobile` npm scripts through it so bootstrap happens before direct Expo CLI usage.
- Remove `apps/mobile/package-lock.json` and the temporary backup directory `apps/mobile/node_modules.incomplete-20260620`.
- Keep `scripts/start-mobile-web.cjs` using the same bootstrap helper so browser QA and normal mobile startup follow one dependency path.

### Consequence

- `apps/mobile` no longer depends on a full-workspace junction or a stale interrupted install backup.
- Mobile startup is now deterministic from the repo root workspace dependencies plus a checked-in bootstrap script, and the mobile web smoke test passes against that cleaned-up structure.

## 2026-06-20

### Context

The backend analyze/explain endpoints were still powered only by a local dictionary fallback. The implementation handoff requires a real provider adapter path with JSON validation, while the repo still needs to stay runnable without external AI credentials.

### Decision

- Keep the existing local dictionary provider as the default `dev` mode path.
- Add a configurable `openai_compatible` remote provider mode driven by `AI_API_URL`, `AI_API_KEY`, `AI_MODEL`, `AI_TIMEOUT_SECONDS`, and `AI_MAX_RETRIES`.
- Normalize remote analyze/explain responses by coercing raw or fenced JSON, validating them with Pydantic models, forcing punctuation to `ignored`, and retrying once on malformed structured output before failing.
- Fall back to the local provider when the remote mode is selected but the required endpoint/model configuration is incomplete.

### Consequence

- The backend now has a real external AI integration path without losing the deterministic local fallback used by current QA and development flows.
- Frontend contracts remain stable because status normalization and response validation stay inside the backend adapter layer.
- Enabling a live AI provider now requires only environment configuration, plus a short follow-up doc/example so operators can turn it on consistently.

### Context

The mobile Settings screen still registered a fake development push token, while the cleaned-up Expo bootstrap flow was becoming the long-term path for all mobile dependencies. The next step needed a real native registration flow without breaking web preview.

### Decision

- Add `expo-notifications`, `expo-device`, and `expo-constants` to the mobile workspace and register Expo push tokens through a dedicated helper at `apps/mobile/src/lib/pushNotifications.ts`.
- Make the Settings screen persist the real token through `/api/notifications/register-push-token`, while returning a clear unsupported message on web preview where Expo push tokens cannot be issued.
- Update `scripts/bootstrap-mobile-node-modules.cjs` to derive compatibility links from `apps/mobile/package.json` instead of a hard-coded dependency list.

### Consequence

- The mobile app no longer depends on a placeholder push token path in code; native runtimes can request permission and register a real Expo token.
- Adding future direct mobile dependencies no longer requires manual edits to the bootstrap helper.
- Final verification of push registration now depends on a native device or simulator run, not the existing web preview alone.

### Context

The repo still had two small remnants from the original UI starter handoff: a root `han-note-ui-starter` folder with only a README stub, and a preview render script that still pointed at the deleted starter preview path. The backend also needed an operator-facing path to enable the new remote AI provider without re-reading code.

### Decision

- Extend `apps/api/.env.example` and `apps/api/README.md` to document `AI_MODEL`, `AI_TIMEOUT_SECONDS`, `AI_MAX_RETRIES`, and the switch from `AI_PROVIDER=dev` to `AI_PROVIDER=openai_compatible`.
- Repoint `docs/preview/render_preview.py` to `docs/preview` so preview regeneration no longer depends on the old starter location.
- Archive the remaining starter README into `docs/archive/han-note-ui-starter/README.md` and remove the root `han-note-ui-starter` folder.

### Consequence

- Future sessions now have a repeatable operator path for turning on the live remote AI provider, while still leaving actual secret injection to `.env`.
- Static preview regeneration is now self-contained under `docs/preview`.
- The repo root is cleaner and no longer carries an obsolete starter directory that could be mistaken for the active app source.

### Context

After the remote provider settings were documented, the repo still lacked a single repeatable smoke check for live analyze/explain verification. The first real outbound validation also showed that the configured provider was reachable but the chosen endpoint path could still be wrong.

### Decision

- Add `apps/api/scripts/verify_live_ai_provider.py` as the repeatable live smoke check for `AI_PROVIDER=openai_compatible`.
- Treat a live `404 Not Found` response from the configured `AI_API_URL` as an operator configuration blocker, not as a backend adapter bug.

### Consequence

- Future sessions can rerun one explicit command to validate the live provider instead of reconstructing ad hoc requests.
- The next step for remote AI activation is to correct the endpoint configured in `.env`, then rerun the same script until it produces a successful analyze/explain result.

### Context

The configured provider turned out to be OpenAI-compatible at the base-URL level, but not at the exact field-shape level. The initial live checks failed for three separate reasons: base URL vs full chat-completions endpoint, analyze payloads that omitted some expected fields, and explain payloads that came back as `results[].token_explanations[]` with variable field names and pinyin formatting.

### Decision

- Treat `AI_API_URL` as either a full endpoint or an OpenAI-style base URL; when it is empty-path or `/v1`, append `/chat/completions` automatically.
- Make the remote analyze/explain normalizers tolerant of provider-specific field aliases and partial payloads, while still preserving the public backend contract returned to web/mobile clients.
- Restore `playwright` as a root dev dependency so the checked-in mobile browser smoke harness remains runnable from the repo itself.

### Consequence

- The live provider configured in `apps/api/.env` now passes the repeatable smoke check at `apps/api/scripts/verify_live_ai_provider.py`.
- Frontend clients still receive the stable backend contract even when the upstream provider varies its structured JSON fields.
- Mobile browser QA is durable again through `scripts/mobile-web-smoke-test.cjs` and `docs/qa/mobile-web-smoke/report.json`.

### Context

The user needed the web app available immediately for manual testing, but local `next dev` startup on this Windows workspace still failed with `EPERM` inside `apps/web/.next/dev` even after precreating folders and disabling the experimental dist-dir lock.

### Decision

- Keep `experimental.lockDistDir: false` in `apps/web/next.config.mjs` because it removes the earlier lockfile failure.
- Use `next build --webpack` followed by `next start --port 3001` as the current local preview path for manual web testing on this machine.

### Consequence

- The user can continue testing the web app at `http://127.0.0.1:3001` without waiting on a full fix for Next.js dev-mode filesystem behavior.
- A follow-up task remains to restore `next dev` hot-reload on Windows, but that issue is now isolated from product QA and feature work.

### Context

The web app appeared to be ignoring the configured remote AI provider and was splitting text like the local fallback tokenizer. Investigation showed that `apps/api/.env` already pointed to the live provider, but the running API process on port `8000` was an older instance started before that config change.

### Decision

- Restart the local API instance on `127.0.0.1:8000` so `analyze` and `explain` use the current `.env` remote provider configuration.
- Add `ai_provider_mode` to `GET /healthz` and backfill known-token `pinyin` and `meaning_vi_brief` from the local dictionary when the remote analyze payload omits them.

### Consequence

- Manual QA can now distinguish between a genuinely remote-backed analyze flow and a stale local-fallback backend instance.
- The web app now returns grouped tokens from the remote provider again, while still filling small known-word gaps instead of showing blank fields when the upstream payload is incomplete.

### Context

The live provider's explain payload for tokens such as `刷新` was not actually empty; it returned useful fields, but under Vietnamese key names like `nghia_tieng_viet` and `tu_loai`. The backend normalizer only recognized English-style keys, so explanation cards and any saved review data fell back to placeholder text.

### Decision

- Extend the explain normalizer to accept Vietnamese field aliases from the live provider, including `nghia_tieng_viet`, `nghia_trong_ngu_canh`, `tu_loai`, `ghi_chu_su_dung`, and `vi_du`.
- Lock this behavior with a provider test that uses the live `刷新` payload shape.

### Consequence

- New explanation results and newly saved review items now contain the actual Vietnamese meaning, context note, part of speech, usage note, and examples instead of placeholder strings.
- Older vocabulary rows that were already saved with placeholder text remain stale until they are re-saved or repaired explicitly.

### Context

The MVP previously ran entirely on a single seed user, which was enough for demo flows but not for real cross-device learning history. This phase requires mandatory login and a way to preserve the existing seed-backed review data instead of discarding it.

### Decision

- Add email/password auth with JSON `access_token` + `refresh_token` sessions, backed by a dedicated `user_sessions` table.
- Protect all user-bound runtime APIs with bearer auth and resolve runtime state from the authenticated user instead of `default_user_id`.
- Keep the seed user as a non-login internal record and migrate its vocabulary/review/notification ownership into the first real account that registers.

### Consequence

- Web and mobile now share one real account model and can restore sessions independently while reading the same vocabulary/review state.
- The first live registration on a given environment now has data-migration side effects by design, so production-like verification of that path must be deliberate.

### Context

The requested review UX now needs a self-check step before revealing the answer, while the current spaced-repetition scheduler and four review outcomes should stay stable so review data does not drift.

### Decision

- Make `Đã biết` / `Chưa biết` a client-only pre-reveal gate in both web and mobile review sessions.
- Keep the backend review contract and scheduler unchanged: only `forgot`, `vague`, `remembered`, and `easy` are persisted review results.
- Persist only refresh tokens client-side for session restore: browser storage on web and `expo-secure-store` on mobile, with in-memory access tokens for active API calls.

### Consequence

- The review UX now forces recall before reveal without changing the spaced-repetition algorithm or review logs.
- Session restore remains simple and device-appropriate while avoiding long-lived access-token persistence on the client.

### Context

Local auth requests worked from `localhost` and `127.0.0.1`, but they failed with browser-side `Failed to fetch` when the web preview was opened from the machine's LAN URL such as `http://192.168.x.x:3001`. The backend CORS config only whitelisted fixed loopback origins.

### Decision

- Keep the explicit `CORS_ALLOW_ORIGINS` list for known local URLs.
- Add a backend CORS regex that also accepts common private-network development origins: `localhost`, `127.0.0.1`, `192.168.x.x`, `10.x.x.x`, and `172.16-31.x.x`, with optional ports.

### Consequence

- The same local web preview can now call the API whether the user opens it by loopback URL or by the machine's LAN IP.
- The fix stays scoped to private-network development origins instead of broad public-domain CORS access.

### Context

The earlier review gate asked the user only whether they knew the word, then showed the meaning and delayed the actual 4-level review result until after the reveal. The requested UX is stricter: choose the real review score first, and reveal meaning only for difficult cards.

### Decision

- Remove the default sample sentence from the web analyze textarea so the user always starts from a blank input.
- Change both web and mobile review cards so the first screen shows the 4 final outcomes immediately: `Chưa nhớ`, `Cần ôn tập`, `Nhớ`, `Dễ`.
- Submit `Nhớ` and `Dễ` directly without revealing the answer, while `Chưa nhớ` and `Cần ôn tập` reveal the meaning and example before final confirmation.

### Consequence

- The review flow now better matches real recall testing: easy cards move faster, while hard cards still expose meaning before commit.
- Web and mobile stay behaviorally aligned instead of drifting into different review semantics.

### Context

After the LAN-origin CORS fix, the web auth gate could still get stuck on "Đang khôi phục phiên đăng nhập" when the app was opened from a non-loopback URL. The default client API base was still hard-coded to `http://127.0.0.1:8000`, which is wrong whenever the browser is not running on the same loopback host.

### Decision

- Make the web client use `NEXT_PUBLIC_API_BASE_URL` when explicitly configured.
- Otherwise, derive the default API base from `window.location.hostname` and port `8000`, keeping the current page protocol.
- Add a short timeout around refresh-token restore so the auth gate falls back to signed-out instead of waiting indefinitely on a broken network path.

### Consequence

- The same built web client now works whether the user opens it as `localhost`, `127.0.0.1`, or a LAN IP, as long as the backend is reachable on the same host at port `8000`.
- Auth restore failures now degrade to the login screen quickly instead of looking like a frozen app shell.

## 2026-06-23

### Context

After the client-side API host fallback and LAN CORS fixes were in place, `Failed to fetch` still reappeared on analyze when the user opened the web preview from `http://192.168.1.9:3001`. Runtime inspection showed the backend process itself was only listening on `127.0.0.1:8000`, so requests to `http://192.168.1.9:8000` could never connect even though the frontend URL logic was now correct.

### Decision

- Standardize the local API dev bind host to `0.0.0.0` on port `8000`.
- Add a root `npm run dev:api` command that starts `apps/api` with `uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload`.
- Update the backend README so the documented local startup command matches the LAN-capable runtime.

### Consequence

- The same running API instance is now reachable through both `127.0.0.1:8000` and the machine LAN IP, which matches the web client's hostname-derived API base behavior.
- Local browser QA from a LAN URL no longer depends on a manually remembered alternate backend startup command.

### Context

Even after the LAN-bind cleanup, the user still saw `Failed to fetch` while using the web app from localhost. Direct checks on this workstation showed that `http://localhost:8000` failed while `http://127.0.0.1:8000` succeeded, so the remaining bug was the web client preserving `window.location.hostname === "localhost"` when deriving the default API base.

### Decision

- Normalize `localhost`, `::1`, and `[::1]` to `127.0.0.1` inside `apps/web/lib/api.ts` when `NEXT_PUBLIC_API_BASE_URL` is unset.
- Rebuild and restart the production-style web preview on `127.0.0.1:3001` after this change so the running bundle actually contains the host normalization.

### Consequence

- Opening the web app from `http://localhost:3001` no longer forces API calls to the failing `http://localhost:8000` path on this machine.
- The default frontend API-host logic now tolerates the workstation's current IPv4-only loopback behavior without requiring the user to remember a different browser URL.

### Context

The `localhost -> 127.0.0.1` normalization fixed the most obvious loopback mismatch, but the user still reported an intermittent browser-side `Failed to fetch` after finishing a review session and returning to analyze. Direct backend verification of `register -> analyze -> save vocabulary -> review -> analyze again` stayed healthy, so the remaining fault domain was the web client's network path selection in the browser rather than review/session state on the API.

### Decision

- Wrap the web `api` client in a local network fallback layer that retries browser-side network failures across a short ordered list of candidate roots.
- Keep the candidate list limited to local-development roots: the currently preferred successful root, `127.0.0.1`, `localhost`, and the current browser hostname when relevant.
- Update the preferred root in memory whenever one candidate succeeds so later requests keep using the working endpoint.

### Consequence

- Intermittent loopback/hostname fetch failures in the browser can recover automatically without forcing the user to reload or switch URLs manually.
- The fix stays inside `apps/web` and does not change the shared OpenAPI-generated client contract used by mobile.

### Context

The user needed Hán Note to stop using port `8000` because another local app already occupied that port. During the same debugging pass, a full browser repro finally showed the real root cause of the post-review analyze failure: the request did reach `/api/analyze`, but the backend's remote AI call sometimes failed with `httpx.ConnectError`, which then surfaced to the browser as another broken analyze action.

### Decision

- Move Hán Note's checked-in local API default from port `8000` to `8010` in the root dev command and frontend defaults.
- Keep the web preview on `127.0.0.1:3001`.
- Make `AiProvider.analyze_text()` and `AiProvider.explain_tokens()` fall back to the local provider whenever the remote provider raises transport or structured-output errors, instead of propagating a `500`.
- Fix the shared client error parser so non-JSON server error bodies no longer throw a misleading JSON parse exception.

### Consequence

- Hán Note no longer conflicts with another app on port `8000`.
- The browser flow `analyze -> review -> analyze` now keeps working even when the remote AI provider is temporarily unreachable; the trade-off is lower-quality local segmentation until the upstream connectivity issue is solved.

### Context

After the port move and fallback patch, the user still reported that analyze looked like character-by-character local tokenization instead of real model output. Direct comparison showed the difference clearly: the backend process started inside Codex's sandbox served `POST /api/analyze` but could not reach the external AI provider, while the same `AiProvider().analyze_text(...)` call succeeded with grouped tokens when run outside the sandbox on the same machine.

### Decision

- Treat the live-remote-AI backend as an unsandboxed local process requirement for this repo.
- Keep the local fallback behavior in code as a resilience path, but do not treat it as equivalent to the intended remote-provider UX during manual QA.
- Restart the production-style local API on `127.0.0.1:8010` outside the sandbox whenever the user wants to verify real provider-backed tokenization.

### Consequence

- Manual QA can now reliably distinguish "remote AI really working" from "backend is only alive but silently degraded to fallback segmentation".
- The current web preview at `127.0.0.1:3001` now talks to an API instance that can reach the configured remote provider and returns grouped tokens again.

### Context

During one more browser-level check, the in-app browser's generic DOM snapshot still showed the Analyze button as `Đang phân tích...` even though the backend had already returned `200 OK`. A narrower DOM inspection of the live page state showed the rendered result card and grouped tokens, so the misleading signal came from the browser-runtime snapshot rather than from the app itself.

### Decision

- When debugging Hán Note in the in-app browser, treat targeted DOM reads plus backend request logs as the authoritative signals if a broad `domSnapshot()` conflicts with the visible runtime state.

### Consequence

- Future sessions should not reopen the same backend/debug path just because one snapshot still looks stale; they should confirm with focused DOM state or API logs first.

## 2026-06-24

### Context

The user's longer work-style paragraph about `陪玩师` did not exceed the API input limit, but the live remote provider still fell back to the local tokenizer. Direct provider checks showed the real failure mode: the configured remote model could process each long sentence, but only when given more than the base 20-second timeout, and concurrent per-sentence requests were less reliable than sequential calls.

### Decision

- For remote analyze, split multiline input into sentence-sized chunks locally before calling the provider.
- Use a larger per-request timeout for longer or clause-heavy sentences instead of keeping every analyze call at the flat 20-second timeout.
- Process those sentence chunks sequentially rather than concurrently, because the current provider/runtime combination is more stable that way for long work-style text.

### Consequence

- The exact long paragraph reported by the user now returns provider-backed grouped tokens through the live API instead of falling straight to the local character-by-character fallback.
- Analyze for heavy paragraphs can take noticeably longer than short chat sentences, but the behavior is now stable and deterministic instead of silently degrading.

### Context

After the API default moved from `8010` to `8011`, the source code and the running browser UI diverged: `apps/web/lib/api.ts` already targeted `8011`, but the production-style Next.js bundle serving `http://127.0.0.1:3001` was still an older build that had `8010` baked into the client code. That created a misleading browser symptom where analyze looked stuck even though the source patch was already correct.

### Decision

- Treat API-port changes in `apps/web/lib/api.ts` as bundle-affecting changes that require `npm run build --workspace apps/web` plus a restart of the local `next start --port 3001` preview before browser QA is trusted.
- Keep the checked-in local API default on `127.0.0.1:8011` for this repo.

### Consequence

- Future sessions should verify the served bundle, not just the source file, whenever local API root changes are involved.
- Browser QA on `127.0.0.1:3001` is now aligned with the actual local API port instead of silently calling an outdated port from a stale bundle.

### Context

The provider-backed explain flow for `连续` was not actually empty. A direct payload inspection showed the upstream model returning usable data under a different structure: `results[]` contained direct explanation items rather than `results[].token_explanations[]`, the part-of-speech key was `loai_tu`, and example translations could arrive under `meaning_vi`. The previous normalizer rejected or ignored that shape, causing the backend to fall back to the local placeholder explanation.

### Decision

- Extend remote explain normalization to accept direct explanation objects inside `results[]` as well as the earlier nested `token_explanations[]` form.
- Accept `loai_tu` as an additional part-of-speech alias and `meaning_vi` as an example-level Vietnamese translation alias.
- Lock this compatibility with a provider test that mimics the live `连续` payload shape.

### Consequence

- The web explanation screen now shows provider-backed meaning/context for tokens like `连续` instead of local fallback placeholders when the upstream provider uses that alternate JSON shape.
- The backend explain layer is more tolerant of upstream shape variation without changing the stable API contract returned to web/mobile clients.

### Context

After long-sentence analyze became stable, the next friction point moved to token marking itself: for work-style paragraphs, selecting many words one by one and then choosing `Đã biết` / `Chưa biết` / `Muốn ôn lại` each time created too much repeated interaction on web.

### Decision

- Keep the existing per-token picker for precise single-word inspection.
- Add a web quick-selection toolbar above the token row where the learner can arm one status (`known`, `unknown`, `review`, or `ignored`) and then click multiple tokens in sequence to apply that status immediately.
- Make quick mode reversible by clicking the active status button again, instead of forcing a separate reset control.

### Consequence

- Long-sentence marking on web is faster without removing the more detailed single-token flow.
- The UI now supports two complementary selection styles: inspect-then-mark for careful study, and armed bulk marking for fast passes over long paragraphs.

### Context

During live QA of the explanation screen, several cards incorrectly showed `Provider chưa trả ví dụ cho từ này.` even though direct provider inspection proved that example data was present. The missing piece was another upstream key variant inside `vi_du[]`: some responses use `cau_trung` for the Chinese sentence and `nghia_vi` for the Vietnamese translation, not only the earlier `chinese` / `translation_vi` or `meaning_vi` forms.

### Decision

- Extend `_RemoteExplanationExample` parsing to accept `cau_trung` and `nghia_vi` as additional example aliases.
- Add a provider regression test that mimics the live `吗` payload shape using those keys.

### Consequence

- The web explanation screen now preserves provider-backed examples for this additional payload variant instead of falling back to the placeholder text.
- Future explain-parser work should treat direct payload inspection as the source of truth whenever the UI claims examples are missing.

### Context

Even after the earlier `cau_trung` / `nghia_vi` fix, the browser still showed `Provider chưa trả ví dụ cho từ này.` for some live explanation cards such as `连续`. Direct provider inspection from the same project sentence showed that this remaining variant sends the Chinese example sentence in `vi_du[].hanzi`, not `zh`, `chinese`, or `cau_trung`.

### Decision

- Extend `_RemoteExplanationExample` parsing to accept `hanzi` as another Chinese example sentence alias.
- Add a provider regression test that mimics the live `连续` payload shape using `hanzi` + `nghia_vi`.

### Consequence

- The web explanation screen now preserves provider-backed examples for this additional live payload variant instead of falling back to the placeholder text.
- Future explain-parser debugging should keep testing against the exact live token payload seen in the browser, because upstream example keys are not stable across responses.

### Context

The user created a GitHub repository for Hán Note and wants future Codex sessions to be able to push project updates there. This workspace already had a local `.git` directory, but Git commands from Codex initially failed because Windows reported the repo as `dubious ownership` under the sandbox account.

### Decision

- Keep the existing local Git repository and branch `main` instead of reinitializing the workspace.
- Add `E:/AI design/Chinese-self-learn` to Git `safe.directory` for this machine's Codex environment.
- Standardize `origin` on `https://github.com/nolan129/chinese-self-learn.git`.

### Consequence

- Future Codex sessions can interact with the local Git repository without hitting the ownership guard first.
- The remaining prerequisite for automated push flows is GitHub authentication on this workstation, not repo wiring.
