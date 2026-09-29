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

The frontend needs its own `frontend/.env.local`, because Next.js only reads env files from `frontend/`, not the repo root. Put **only** these three variables in it, never the service key or provider API keys:

```bash
cat > frontend/.env.local <<'EOF'
NEXT_PUBLIC_SUPABASE_URL=        # same value as SUPABASE_URL
NEXT_PUBLIC_SUPABASE_ANON_KEY=   # same value as SUPABASE_ANON_KEY
API_URL=http://localhost:8000
EOF
```

Restart `npm run dev` after editing it.

`REDIS_URL` for processes running in Compose should be `redis://redis:6379/0`. For host-side tools talking to the published Redis port, use `redis://localhost:6379/0`.

## Environments

`ENVIRONMENT` is `development`, `staging`, or `production` (defaults to `development`). It controls:

- OpenAPI docs (`/docs`, `/redoc`): on in development and staging, off in production
- CORS: origins come from `CORS_ORIGINS` (comma-separated). `*` is allowed only in development
- Log level: `DEBUG` in development, `INFO` in staging and production
- HTTPS (production only): HTTP→HTTPS redirect, security headers (HSTS, `nosniff`, `X-Frame-Options: DENY`, `Referrer-Policy`), and a startup check that refuses to boot if `CORS_ORIGINS` has an `http://` origin or `FORWARDED_ALLOW_IPS` is empty. See "Deployment Checklist".

`.env` is never committed — only `.env.example` is. Copy it to `.env` (and create `frontend/.env.local` as above) and fill in real values locally or in the host environment.

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

### Design system

Every screen uses the "Fluent Logic" design system from the Stitch mockups. Reuse these pieces instead of styling screens one by one:

- **Tokens** (`app/globals.css`): the palette is mapped onto shadcn's semantic colors (`primary`, `muted-foreground`, `border`, `destructive`, ...), so shadcn components match automatically. Extra tokens include `surface-container-*`, `primary-container` (hover blue), `on-surface-variant`, and `error-container`. The type scale is `text-h1`, `text-h2`, `text-h3`, `text-body-lg`, `text-body-md`, `text-body-sm`, `text-label-md` and `text-label-sm`, each with its line height and weight built in. The font is Inter. Radius is 8px (`rounded-lg`) for controls and 16px (`rounded-2xl`) for content cards. Elevation uses `shadow-card` (cards and outline buttons), `shadow-card-hover`, and `shadow-button` (primary buttons). Primary buttons use the blue-to-indigo gradient (`from-primary to-brand-indigo`). The sidebar is white with a right border.
- **Brand:** `lib/brand.ts` (`APP_NAME`, `APP_TAGLINE`) and `BrandLogo` / `BrandMark` (`components/brand-logo.tsx`).
- **Primitives** (`components/ui/`): `Button` (`size="lg"` for full-width form buttons), `ButtonLink` (a Next.js `Link` styled as a button), `Input`, `Label`, `Card`, `Badge` (for statuses such as "Coming soon").
- **Links:** links are always blue so they read as clickable. Use `TextLink` (`variant="primary"` for calls to action, `variant="subtle"` for secondary links like "Back to log in"); never style a link with a grey or black text color.
- **Forms:** `FormField` (label, hint, and an announced error message), `FormAlert` (form-level error), and the `useFormFields` hook (`hooks/use-form-fields.ts`), which shows inline errors after blur or submit and focuses the first invalid field.
- **Auth / centered screens:** `AuthCard` (optional icon badge, title, description, footer) inside the `(auth)` layout, a split screen with a brand panel on desktop and a single column on mobile. Use `PasswordStrengthMeter` for new-password fields.
- **App screens:** the `(app)` layout provides the sidebar (a drawer on mobile, `components/app-shell/`). Start each page with `PageHeader` (title, description, actions, optional back link), and use `EmptyState` for empty lists. Show one primary action per screen: the sidebar's "New project" is global, and page-level "New project" buttons appear only where they are the main next step (the empty dashboard).
- **"How it works" modal:** `HowItWorksProvider` (in the `(app)` layout) renders the step slider (`HowItWorks`, steps in `components/workflow-steps.tsx`) in a modal. It opens automatically once per account: `markHowItWorksSeen` stores `how_it_works_seen` in Supabase `user_metadata` plus a cookie (the JWT claims only pick up the metadata on the next token refresh). Reopen it anywhere with `useOpenHowItWorks()` or `HowItWorksButton`; the sidebar has a "How it works" link under Help.
- **Mobile:** design mobile-first; grids collapse to one column below `sm`/`md`, and the sidebar is replaced by a top bar with a menu button below `lg`.

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

## Supabase Auth Setup

One-time dashboard steps (Supabase → **Authentication**):

1. **Sign In / Providers → Email:** turn on **Confirm email**, so new accounts start unverified.
2. **Sign In / Providers → Email:** set **Minimum password length** to `8`.
3. **URL Configuration:**
   - **Site URL:** `http://localhost:3000` for now. Change it to the production frontend URL at deploy time.
   - **Redirect URLs:** add `http://localhost:3000/**`. Add the production equivalent (`https://your-domain/**`) at deploy time.

Notes:

- Supabase's built-in email sender only allows a handful of emails per hour for the whole project. Fine for local testing, but set up custom SMTP (Authentication → Emails → SMTP Settings) before real users sign up.
- **Verification links** land on `/auth/confirm` (`app/auth/confirm/route.ts`). It exchanges Supabase's `?code=` for a session cookie, then sends the user to `/verify-email?status=verified`. If the link was opened in a different browser, the email is still verified but there's no session, so it uses `status=verified-login`. Failed links go to `status=expired` or `status=invalid`. `http://localhost:3000/**` in Redirect URLs already covers this route.
- **Signup never reveals whether an email is registered.** With "Confirm email" on, Supabase answers a duplicate signup with a fake success and sends no email. The `signUp` Server Action (`lib/auth-actions.ts`) also treats `user_already_exists`, `email_exists`, and `over_email_send_rate_limit` as success, and every path ends on `/verify-email`. Keep it that way: don't add an "email already exists" message.

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
- 422 validation errors never echo submitted values (see Input Validation below).
- **Sentry (not installed yet):** when you add it, set `send_default_pii=False` on both backend and frontend SDKs and add a `before_send` hook that scrubs the fields above from `request.data`, headers, and breadcrumbs.

## Input Validation

Every request body is a Pydantic model that extends `RequestModel` (`app/core/validation.py`), and every path or query param is typed. Don't parse `await request.json()` or accept a raw `dict`.

- **Error shape.** All validation failures (wrong type, missing field, bad JSON, bad path param) return `422` with:
  ```json
  {"error": "validation_error", "details": [{"loc": ["body", "original_text"], "msg": "...", "type": "string_too_short"}]}
  ```
  Submitted values are never echoed back.
- **Unknown fields are rejected** (`extra="forbid"`), so a client can't sneak in something like `user_id`.
- **Text fields** use the shared types, which strip whitespace and then enforce length. A whitespace-only value fails as empty.
  - `Name`: 1–100 chars. Used for character names.
  - `ScriptText`: 1–5,000 chars. Used for script line text.
  - `DraftScriptText`: 0–5,000 chars. Used for `rewritten_text` on create, before the rewrite has run.
  - `SourceRef`: 1–1,024 chars.
- **YouTube URLs** must match `YOUTUBE_URL_RE` (`youtube.com/watch?v=`, `youtu.be/`, `/shorts/`, `/live/`, `/embed/`, with an 11-character video ID) before anything reaches `yt-dlp`. The match is anchored, so values like `--exec ...` or `youtube.com.evil.com` are rejected.
- **Numbers:** `speed` must be between 0.7 and 1.2 (the ElevenLabs range). `order_index` must be finite, not NaN or infinity.
- **SQL:** use the SQLAlchemy ORM or bound parameters only. Never build SQL with f-strings or `%` formatting from user input.
- **Frontend:** render user text as normal JSX children, which React escapes. Never pass user-supplied text to `dangerouslySetInnerHTML`.

## Production Secrets

**Rule: in any deployed environment, secrets are set directly in the hosting platform's environment variable settings — never via a `.env` file uploaded to a server, baked into a Docker image, or committed anywhere.** `.env` is for local development only.

| Service | Where secrets live | Variables |
| --- | --- | --- |
| Backend API + worker | Railway / Render service environment variables (set on **both** services) | `ENVIRONMENT`, `CORS_ORIGINS`, `SUPABASE_URL`, `SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_KEY`, `DATABASE_URL`, `REDIS_URL`, `TRANSCRIPTION_PROVIDER`, `ASSEMBLYAI_API_KEY`, `DEEPGRAM_API_KEY`, `OPENAI_API_KEY`, `ELEVENLABS_API_KEY`. API service only: `FORWARDED_ALLOW_IPS` |
| Frontend | Vercel project environment variables | `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `API_URL` (server-only backend URL, must be `https://`) |

- Anything prefixed `NEXT_PUBLIC_` is bundled into browser JavaScript and is public. Only the Supabase URL, the anon key, and the API URL may ever go there. The service key and all provider API keys stay on the backend.
- `backend/.dockerignore` excludes `.env`, so images never contain secrets; the platform injects them at runtime.
- `.env.example` is the source of truth for which variables exist. When you add a setting, add it there with an empty placeholder in the same change.
- If a secret is ever committed or pasted somewhere public, **rotate it at the provider**. Removing it from the repo is not enough — it stays in git history.

## Deployment Checklist

### HTTPS

TLS is terminated by the platform (Railway/Render for the API, Vercel for the frontend). The container itself only speaks plain HTTP, so the API needs to trust the platform proxy's `X-Forwarded-Proto` header to know the original request was HTTPS.

- **Backend env vars (API service):**
  - `ENVIRONMENT=production`
  - `CORS_ORIGINS=https://your-frontend-domain`: `https://` only. The API refuses to start otherwise.
  - `FORWARDED_ALLOW_IPS`: which connecting IPs uvicorn trusts to set `X-Forwarded-*`. The Dockerfile runs uvicorn with `--proxy-headers`, and uvicorn reads this variable directly. The API refuses to start in production if it's empty. Without it, every request looks like `http` and the HTTPS redirect sends the browser in a loop.
- **What value to use for `FORWARDED_ALLOW_IPS`:**
  - **Railway / Render: `*`.** Neither platform publishes its proxy IP ranges. Public traffic can only reach the container through the platform's edge proxy, which sets these headers itself, so trusting any connecting IP is safe *on these platforms*.
  - **Anything where the container port is publicly reachable (a VM, bare Docker host, etc.):** never `*`. Anyone could send `X-Forwarded-For` and spoof their IP. Set it to the reverse proxy's IP or CIDR (e.g. `10.0.0.0/8`), or `127.0.0.1` if the proxy runs on the same host.
  - Even with `*`, don't use `X-Forwarded-For` for security decisions (rate limiting, allowlists) on Railway. Use `X-Real-IP`, which Railway always overwrites.
- **Health checks:** point the platform's health check at `/health`. It's exempt from the HTTPS redirect because health checks hit the container directly over plain HTTP.
- **Frontend:** Vercel serves HTTPS and redirects HTTP itself. `next.config.ts` adds the same security headers in production builds. `API_URL` must be set, and must be `https://` on Vercel production, or backend calls fail loudly.
- **Local check of the production header logic:** no TLS needed. Use real values that pass the startup checks:
  ```bash
  cd backend
  ENVIRONMENT=production CORS_ORIGINS=https://app.example.com FORWARDED_ALLOW_IPS=127.0.0.1 \
    uvicorn app.main:app --port 8001 --proxy-headers
  curl -I http://localhost:8001/health                                  # 200 + security headers
  curl -I http://localhost:8001/me                                      # 307 -> https://localhost:8001/me
  curl -I -H 'X-Forwarded-Proto: https' http://localhost:8001/me        # 401, no redirect (trusted proxy)
  ```

**After the first real deploy**, verify HTTPS end-to-end:

```bash
curl -I http://your-api-domain/me        # expect 301/307/308 to https://
curl -I https://your-api-domain/health   # expect 200 with Strict-Transport-Security, X-Content-Type-Options, X-Frame-Options, Referrer-Policy
curl -I http://your-frontend-domain/     # expect redirect to https:// (Vercel)
curl -I https://your-frontend-domain/    # expect the same four security headers
```

## Tests

```bash
cd backend
# One-time setup. Needs Python 3.12; macOS's built-in python3 (3.9) won't work.
python3.12 -m venv .venv
.venv/bin/pip install -r requirements.txt

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
