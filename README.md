# Dubbing Platform

Monorepo for the dubbing-platform web app: a Next.js frontend and a FastAPI backend that transcribes, rewrites, and generates dubbed audio.

**Build order follows `feature-spec.md`, starting with the Foundation and Auth sections.** Do not build pipeline logic (transcription, rewrite, generation) before auth and project CRUD work end-to-end. The workers and third-party clients in this scaffold are stubs on purpose.

## Prerequisites

- Docker (for Redis, the API, and the RQ worker)
- Node.js 20+
- Python 3.12

## Environment variables

```bash
cp .env.example .env
```

Fill in every value in `.env`. Comments in `.env.example` point to the dashboard where each key is issued (Supabase, AssemblyAI or Deepgram, OpenAI, ElevenLabs).

Copy the `NEXT_PUBLIC_*` values into `frontend/.env.local` as well:

```bash
cp .env.example frontend/.env.local
```

`REDIS_URL` for processes running in Compose should be `redis://redis:6379/0`. For host-side tools talking to the published Redis port, use `redis://localhost:6379/0`.

## Environments

`ENVIRONMENT` is `development`, `staging`, or `production` (defaults to `development`). It controls:

- OpenAPI docs (`/docs`, `/redoc`): on in development and staging, off in production
- CORS: origins come from `CORS_ORIGINS` (comma-separated). `*` is allowed only in development
- Log level: `DEBUG` in development, `INFO` in staging and production

`.env` is never committed — only `.env.example` is. Copy it to `.env` (and `frontend/.env.local`) and fill in real values locally or in the host environment.

## Running locally

Postgres is **not** part of local Docker. The database is hosted Supabase, and both `backend` and `worker` connect to it via `DATABASE_URL` in `.env`. Local Compose only runs Redis, the API, and the RQ worker.

From the repo root (after `.env` is filled in, including a real `DATABASE_URL`):

```bash
# 1. Apply DB migrations (required on every fresh setup)
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
cd ..

# 2. Start Redis + API + worker
docker compose up --build
```

- API: [http://localhost:8000](http://localhost:8000)
- Health check: [http://localhost:8000/health](http://localhost:8000/health) (includes the active `environment`)
- Redis: `localhost:6379`

The API container runs as a non-root user and mounts `backend/app` so uvicorn `--reload` picks up code changes without rebuilding. After changing `backend/Dockerfile` or `requirements.txt`, rebuild with `docker compose up --build`.

The frontend is **not** containerized so its hot reload stays fast.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

## Background Jobs

Long-running work (transcription, rewrite, audio generation) runs as RQ jobs on Redis, executed by the `worker` container. Job functions live in `backend/app/workers/`.

**Enqueueing.** API code gets the shared queue from `app.core.queue.get_queue()` (connected via `REDIS_URL`) and calls `queue.enqueue(job_function, *args)`. `enqueue` returns immediately with a job ID; the worker picks the job up in the background.

**Checking status.** `rq.job.Job.fetch(job_id, connection=queue.connection)` returns the job. `job.get_status()` is one of `queued`, `started`, `finished`, or `failed`. `job.return_value()` holds the result once finished, and `job.exc_info` holds the traceback if it failed.

**Failures.** An exception inside a job marks that job `failed`; the worker keeps processing the rest of the queue. If the worker process dies mid-job (crash, container restart), the job is **not** silently dropped: once its heartbeat expires, the worker moves it to `failed` with `AbandonedJobError` — within about 2 minutes with the worker settings in `app/workers/worker.py`. Such jobs are not retried automatically; pass `retry=Retry(max=N)` to `enqueue` for jobs that should be re-run instead.

**Debug endpoints (development only).** When `ENVIRONMENT=development`, the API also exposes:

```bash
# Enqueue the three stub jobs; add include_failure=true and/or sleep_seconds=N for testing
curl -X POST "http://localhost:8000/debug/test-job"

# Check a job's status, result, and error
curl http://localhost:8000/debug/test-job/<job_id>
```

These routes are not registered at all in staging or production. Watch the worker with `docker compose logs -f worker`.

## Database Migrations

Schema changes always go through Alembic against the Supabase Postgres URL in `DATABASE_URL`. **Never hand-edit the Supabase schema directly — every change goes through a migration, even small ones.**

From `backend/` (with the venv activated):

```bash
# Generate a migration from model changes
alembic revision --autogenerate -m "description"

# Apply all pending migrations
alembic upgrade head

# Roll back the most recent migration
alembic downgrade -1
```

Review the generated file under `alembic/versions/` before applying. The initial migration creates `projects`, `speakers`, `script_lines`, and `generations`.

## Storage

Audio files (uploaded source audio and generated clips) live in Supabase Storage. **Nothing is publicly accessible** — the bucket is private and every read goes through a short-lived signed URL.

**One-time setup (per Supabase project).** In the Supabase dashboard: **Storage → New bucket**, name it `audio-files`, and leave **"Public bucket" OFF**. Don't add any public Storage policies.

**Folder convention** (helpers in `app/services/storage.py`):

| What | Path |
| --- | --- |
| User-uploaded source audio | `uploads/{project_id}/{filename}` |
| Generated audio | `generations/{project_id}/{generation_id}.mp3` |

**Backend API.** `app/services/storage.py` exposes `upload_file(path, file_bytes, content_type)`, `get_signed_url(path, expires_in=3600)`, and `delete_file(path)`. All three use the **service role key** server-side and raise `StorageError` on failure rather than failing silently.

**The frontend never talks to Supabase Storage directly** and never sees `SUPABASE_SERVICE_KEY`. Uploads and downloads go through backend endpoints, which hand the browser signed URLs.

**Verify (development only):**

```bash
# Uploads a test WAV, fetches it via a signed URL (should work) and via the
# unsigned public/direct URLs (should be denied), then deletes it.
curl -X POST "http://localhost:8000/debug/storage-test"

# Same, but keeps the file and returns the signed URL so you can try both in a browser
curl -X POST "http://localhost:8000/debug/storage-test?keep=true"
```

`private_bucket_verified: true` in the response means the signed URL worked and both unsigned URLs were rejected.

## Auth and Sessions

Supabase Auth issues and signs the access and refresh tokens. This project signs with ES256 (asymmetric keys), so there is no shared JWT secret.

**Backend.** `app/core/auth.py` validates every token by calling Supabase Auth (`auth.get_user`), which checks the signature, the `exp` claim, and that the session hasn't been signed out.
- The JWT is never just decoded locally, since that would miss revoked sessions.
- Missing, malformed, forged, expired, or revoked tokens get a clean `401`. A Supabase outage gets `503`.
- Handlers take the verified user with `user: CurrentUser` (see `GET /me`). Routers are protected with `dependencies=[Depends(get_current_user)]` when included in `app/main.py`.
- `tests/test_auth.py` walks every route in the OpenAPI schema and fails if any non-public route answers without a token.

**Frontend: httpOnly cookie sessions and a backend proxy.**
- `@supabase/ssr` keeps the session in **httpOnly**, `SameSite=Lax` (and `Secure` in production) cookies, so page JavaScript and any XSS can't read the tokens. For the same reason there is **no browser Supabase client**: sign-in, sign-up, and sign-out run as Server Actions (`lib/auth-actions.ts`).
- `proxy.ts` refreshes an expired access token on each request and writes the rotated cookies.
- Client Components call `const apiFetch = useApiFetch(); apiFetch("/projects")` (`lib/api.ts`), which hits the same-origin route handler `/api/backend/*`. That handler reads the session server-side, adds `Authorization: Bearer <token>`, and forwards to FastAPI at `API_URL`.
- On a `401` the proxy refreshes the session once through the Supabase SDK and retries. If it's still `401`, `apiFetch` redirects to `/login`.
- Server Components can call `backendFetch()` (`lib/backend.ts`) directly.
- **Trade-off:** every API call takes one extra hop through Next.js, and client-side Supabase features (Realtime, direct Storage) are unavailable. That's intended, since data and storage go through FastAPI anyway.
- Because auth rides on a cookie, the proxy rejects cross-origin non-GET requests (CSRF). Keep GET endpoints free of side effects.

**Logout** calls `supabase.auth.signOut({ scope: "global" })` on the server. That revokes the session at Supabase, so the backend rejects the old access token immediately, and it clears the cookies.

## Passwords and Credentials

**Password hashing is handled entirely by Supabase Auth — the app must never log, store, or transmit raw passwords beyond the initial signup/login request to Supabase.**

- Passwords go from the login/signup form to a Next.js Server Action, which passes them straight to Supabase Auth (`signUp` / `signInWithPassword`). The FastAPI backend has no password endpoints and only ever sees Supabase JWTs.
- Never `print`, `logger.*`, or `console.log` a request body, form values, auth payload, or auth response.
- Don't add request/response-body logging middleware. If you ever need it, it must redact `password`, `confirm_password`, `new_password`, `token`, `access_token`, `refresh_token`, and `authorization` first.
- `app/core/logging.py` caps `hpack`, `h2`, and `httpcore` at WARNING. At DEBUG they log raw HTTP headers, which include the Supabase service key and users' Bearer tokens. Don't lower them.
- 422 validation errors never echo submitted values (the `input` field is stripped in `app/main.py`).
- **Sentry (not installed yet):** when you add it, set `send_default_pii=False` on both backend and frontend SDKs and add a `before_send` hook that scrubs the fields above from `request.data`, headers, and breadcrumbs.

## Production Secrets

**Rule: in any deployed environment, secrets are set directly in the hosting platform's environment variable settings — never via a `.env` file uploaded to a server, baked into a Docker image, or committed anywhere.** `.env` is for local development only.

| Service | Where secrets live | Variables |
| --- | --- | --- |
| Backend API + worker | Railway / Render service environment variables (set on **both** services) | `ENVIRONMENT`, `CORS_ORIGINS`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `DATABASE_URL`, `REDIS_URL`, `TRANSCRIPTION_PROVIDER`, `ASSEMBLYAI_API_KEY`, `DEEPGRAM_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY` |
| Frontend | Vercel project environment variables | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `API_URL` (server-only backend URL) |

- Anything prefixed `NEXT_PUBLIC_` is bundled into browser JavaScript and is public. Only the Supabase URL, the anon key, and the API URL may ever go there. The service key and all provider API keys stay on the backend.
- `backend/.dockerignore` excludes `.env`, so images never contain secrets; the platform injects them at runtime.
- `.env.example` is the source of truth for which variables exist. When you add a setting, add it there with an empty placeholder in the same change.
- If a secret is ever committed or pasted somewhere public, **rotate it at the provider**. Removing it from the repo is not enough — it stays in git history.

## Tests

```bash
cd backend
source .venv/bin/activate
pytest
```

## CI

Every push and pull request targeting `main` runs lint (`ruff check backend/`) and unit tests (`pytest backend/tests/`) automatically via GitHub Actions (`backend-ci`). The job does not start Docker, the frontend, Redis, Postgres, or any live external APIs.

A `backend-ci` check must pass before merging.

## Layout

```
frontend/          Next.js App Router, Tailwind CSS, shadcn/ui
backend/           FastAPI, SQLAlchemy, Alembic, RQ workers
docker-compose.yml Redis + API + worker
```
