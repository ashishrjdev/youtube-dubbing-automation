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
- **Auth / centered screens:** `AuthCard` (optional icon badge, title, description, footer) inside the `(auth)` layout: a 50/50 split screen on desktop (gradient brand panel left, plain white form area right; no card around the form) and a single white column on mobile. Use `PasswordStrengthMeter` for new-password fields.
- **App screens:** the `(app)` layout (`components/app-shell/`) provides:
  - a sidebar with the logo, the Workspace nav, and the app version (`APP_VERSION` in `lib/brand.ts`) at the bottom (a drawer on mobile);
  - `AppHeader`, a sticky top bar with the page title, description and back link, a help icon (tooltip "How it works") and the avatar user menu (email, Account, Log out), plus the menu button below `lg`;
  - `AppFooter`, with the copyright and the Terms / Privacy links.

  Page titles live in the header, not the page: add each new route to `pageHeading()` in `lib/page-headings.ts` (title, optional description and back link), and don't render another `<h1>` in the page. Use `EmptyState` for empty lists. Show one primary action per screen: "New project" appears on the page where it's the main next step (the empty dashboard now), not in the shell.
- **"How it works" modal:** `HowItWorksProvider` (in the `(app)` layout) renders the step slider (`HowItWorks`, steps in `components/workflow-steps.tsx`) in a modal. It opens automatically once per account: `markHowItWorksSeen` stores `how_it_works_seen` in Supabase `user_metadata`, read back fresh through `getCurrentUser()` (`supabase.auth.getUser()`). Reopen it anywhere with `useOpenHowItWorks()` or `HowItWorksButton`; the header's help icon opens it.
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
   - **Redirect URLs:** add `http://localhost:3000/**`. Add the production equivalent (`https://your-domain/**`) at deploy time. That wildcard already covers `/auth/confirm`, `/reset-password`, and `/verify-email`.
4. **Sessions / OTP expiry (Authentication → Settings → Email OTP Expiration):** set to **3600 seconds (1 hour)** so password-reset and verification links match the product rule. Confirmed in this project’s dashboard.
5. **JWT expiry (Authentication → Sessions → JWT expiry limit):** set to **900 seconds (15 minutes)**. The dashboard minimum recommended value is **300 seconds (5 minutes)** — do not go lower. Measured issued tokens currently use **3600 seconds** until this is changed.
6. **Refresh token rotation** (Authentication → Sessions): leave **enabled**, and leave **Detect and revoke potentially compromised refresh tokens** (reuse detection) **on**. Default reuse interval is **10 seconds**. Confirmed by reuse-detection test (reusing a rotated token after the grace window fails and revokes the session family).
7. **Refresh token / session lifetime (~30 days):** **Time-box user sessions** and **Inactivity timeout** are **Pro plans and up**, not available on Free. On Free, refresh tokens do not expire by time; a session lasts until sign-out, password change, or reuse-detection revocation. Accept that default and treat “30 days” as a Pro-era product rule, not something this project can enforce on Free.
8. **Require current password when changing password** (Authentication → Providers → Email, under password / security options; also documented as “Secure password change” / CLI `auth.email.secure_password_change`): **turn this on**. The Account page sends `current_password` on `updateUser`; without this toggle Supabase ignores it and a stolen session can change the password via the Auth API directly. Available on Free (unlike leaked-password protection). Until it is on, the app still verifies the current password with an ephemeral `signInWithPassword` client (no cookie writes) before calling `updateUser` — that protects the `/account` form only.
9. **Password changed notification** (Authentication → Emails → security notification templates → **Password changed**, or Auth config `mailer_notifications_password_changed_enabled`): **enable it**. Supabase then emails the user whenever their password changes — a cheap signal if a session was abused. Customize the subject/body under the same Emails templates list.

### Rate limits (AUTH-10)

Supabase Auth enforces these limits — the FastAPI backend does not (SEC-05 is deferred). Read the project values in the dashboard under **Authentication → Rate Limits** and fill in the “This project” column; do not copy the docs defaults into it.

| Limit | Limited by | Supabase docs default | This project (dashboard) |
| --- | --- | --- | --- |
| Emails sent per hour | Project | 2/hour on the built-in email provider; configurable only with custom SMTP or a Send Email hook | _TBD — owner to fill in_ |
| Email sender | — | Built-in sender unless custom SMTP is configured (Authentication → Emails → SMTP Settings) | _TBD — built-in or custom SMTP?_ |
| Sign-ups and sign-ins per 5 minutes | IP address | 30 requests / 5 min, bursts up to 30 (covers `/signup`, `/recover`, `/resend`, `/magiclink`, `/otp`, `/user`) | _TBD — owner to fill in_ |
| Token refreshes per 5 minutes | IP address | 150 requests / 5 min, bursts up to 30 (`/token`, all grant types) | _TBD — owner to fill in_ |
| Verification / OTP requests per 5 minutes | IP address | 30 requests / 5 min, bursts up to 30 (`/verify`; `/otp` also has a per-user 60-second resend window) | _TBD — owner to fill in_ |
| Password reset / signup confirmation resend window | Per user (email) | 60 seconds before the same user may request another email | _TBD — owner to confirm_ |
| CAPTCHA protection | — | Available (Authentication → Bot and Abuse Protection) | _TBD — available? currently off?_ |

Observed in live tests (scripted, throwaway account; see the AUTH-10 report — numbers are recorded in the PR/chat, not hardcoded into UI text, since dashboard limits can change):

- _Email limit: with the project email cap available, the same-user reset requests returned `429 over_email_send_rate_limit` (“email rate limit exceeded”) from the 3rd rapid request; afterwards, first requests for two brand-new users also returned the same 429, confirming the sending cap is project-wide (not per email) once exhausted. Re-test after the hourly window / with custom SMTP for a clean per-user number._
- _Login brute force (throwaway account, scripted): 33 wrong-password attempts returned `400 invalid_credentials`; attempt 34 returned `429 over_request_rate_limit` (“Request rate limit reached”), as did the next attempt. A correct login succeeded on the first recovery poll 15 seconds later (token-bucket refill — the wait after a small burst is seconds, not minutes; a deeper burst would take longer)._

Notes on scope: most endpoint limits are **per IP**, not per email address. The only per-email behaviour is the 60-second window before the same user can be sent another signup-confirmation, password-reset, or OTP email, plus the project-wide email-sending cap. A “5 failed attempts per email per 15 minutes”-style rule is not something Supabase Auth offers; do not promise it in the spec.

Every auth form (login, signup, forgot password, resend verification, change password) surfaces the shared message “Too many attempts, please try again in a few minutes.” for HTTP 429 / `over_request_rate_limit` / `over_email_send_rate_limit` via `rateLimitMessage()` in `frontend/lib/auth-rate-limit.ts` (covered by `frontend/lib/auth-rate-limit.test.mts`, run with `npm test`). Two deliberate exceptions keep the anti-enumeration behaviour: on signup, forgot-password, and resend, a *per-email* `over_email_send_rate_limit` is still treated as success, because reporting it would reveal whether the address is registered; the IP-wide limit still surfaces the shared message.

Notes:

- Supabase's built-in email sender only allows a handful of emails per hour for the whole project. Fine for local testing, but set up custom SMTP (Authentication → Emails → SMTP Settings) before real users sign up.
- **Verification links** land on `/auth/confirm` (`app/auth/confirm/route.ts`). It exchanges Supabase's `?code=` for a session cookie, then sends the user to `/verify-email?status=verified`. If the link was opened in a different browser, the email is still verified but there's no session, so it uses `status=verified-login`. Failed links go to `status=expired` or `status=invalid`. `http://localhost:3000/**` in Redirect URLs already covers this route. On success, `/verify-email` shows "Email verified!" and redirects to the dashboard after 2.5 seconds.
- **Resending verification emails.** `/verify-email` (pending, expired, or invalid link) and the in-app banner call the `resendVerificationEmail` Server Action, which uses `supabase.auth.resend({ type: "signup" })`. It sends to the signed-in user's address, or the one remembered in the httpOnly `pending_verification_email` cookie (set by signup and by a login blocked with `email_not_confirmed`), so the address never goes in the URL. With neither, the form asks for the email. After each send the button is disabled for 60 seconds, matching Supabase's per-address limit. Like signup, the response never reveals whether the address has an account.
- **Unverified users can't create projects.** The `(app)` layout shows a "Please verify your email" banner whenever `email_confirmed_at` is null (read with `supabase.auth.getUser()`, because it isn't a JWT claim), and `/projects/new` redirects to the dashboard. The backend enforces the same rule: `POST /projects` depends on `require_verified_email` (`VerifiedUser` in `app/core/auth.py`), which returns `403 Email not verified`. Use `VerifiedUser` on any future route that creates projects or spends credits.
- **When does the banner show?** With **Confirm email** on, an unverified user can't log in at all: Supabase answers the correct password with `email_not_confirmed`, and the login form shows "Please verify your email first" with a resend button. A wrong password returns `invalid_credentials`, exactly like an unknown email, so this message never reveals which addresses are registered. The banner mainly covers sessions that exist while the email is unconfirmed. To see it locally, sign up without clicking the link, turn **Confirm email** off, log in, then turn it back on.
- **Full name** is stored in Supabase `user_metadata.full_name`. It's set at signup through `signUp({ options: { data } })` and edited on the Account page by the `updateProfile` Server Action (`updateUser({ data })`). It's read with `getUser()` in `getCurrentUser()`, and the avatar initials come from it (falling back to the email). Users can change their own metadata, so never use it for authorization.
- **Login errors.** "Invalid email or password." for any `invalid_credentials`. "Too many attempts, please try again in a few minutes." for rate limits (shared helper, see Rate limits above). "Something went wrong, please try again." for anything else, including network failures.
- **Route protection** lives in `proxy.ts` (Next.js 16's name for `middleware.ts`). Public pages: `/login`, `/signup`, `/forgot-password`, `/reset-password`, `/verify-email`, `/terms`, `/privacy`. `/auth/*` and `/api/*` handle auth themselves. Everything else needs a session, and signed-out visitors go to `/login?next=<path>`. Signed-in visitors to `/login` or `/signup` go to `next` (or `/dashboard`), and `/` goes to `/dashboard` or `/login`.
- **`next` is only followed if it's a same-origin path** (`safeRedirectPath` in `lib/auth-validation.ts`). Absolute URLs, `//host`, `/\host`, and tab or newline tricks all fall back to `/dashboard`. The login page and the `signIn` action both check it.
- **Signup never reveals whether an email is registered.** With "Confirm email" on, Supabase answers a duplicate signup with a fake success and sends no email. The `signUp` Server Action (`lib/auth-actions.ts`) also treats `user_already_exists`, `email_exists`, and `over_email_send_rate_limit` as success, and every path ends on `/verify-email`. Keep it that way: don't add an "email already exists" message.
- **Logout.** Sidebar and the avatar menu call `logout()` → `GET /auth/logout`, which runs `signOut({ scope: "local" })` (revokes this session's refresh token on the server, leaves other devices alone). Account → "Log out of all devices" uses `scope=global`. Cookies are cleared even if the Supabase call fails, then the browser is sent to `/login`. Other open tabs are notified with a `SIGNED_OUT` BroadcastChannel / `localStorage` event (sessions are httpOnly, so a browser `onAuthStateChange` listener cannot see cookie changes). Protected responses set `Cache-Control: no-store` so the back button cannot revive a logged-in page from cache.
- **Silent token refresh.** There is no browser Supabase client (httpOnly cookies). `@supabase/ssr`'s server client keeps `autoRefreshToken: false` by design; refresh happens in two places: (1) `proxy.ts` calls `getUser()` on each navigation and writes rotated cookies, (2) `backendFetch` (`lib/backend.ts`), used by `/api/backend/*`, attaches `Authorization: Bearer <access>`, and on **401 only** runs one deduplicated `refreshSession()` then retries once. Parallel 401s share a single in-flight refresh so rotation/reuse detection is not tripped. `useApiFetch()` is the Client Component helper: it calls the proxy and, if a 401 still comes back, runs local logout → `/login`. Non-401 errors never refresh.
- **Password reset.** `/forgot-password` calls `resetPasswordForEmail` with `redirectTo=/auth/confirm?flow=recovery`. Supabase returns success for unknown emails too (verified), so the UI always shows "If an account exists for that email, we've sent a reset link" and never reveals whether the address is registered. The per-address email rate limit is also treated as success for the same reason; IP-wide limits show the shared rate-limit message (see Rate limits above). The Send button has a 60-second cooldown. `/auth/confirm?flow=recovery` exchanges the PKCE `?code=` into httpOnly cookies and sends the user to `/reset-password`, which shows the new-password form only when a session exists. Invalid, expired, or already-used links show a clear error with "Request a new link". On success, `updateUser({ password })` runs, then `signOut({ scope: "others" })` drops every other device; this browser stays signed in and redirects to `/dashboard`.
- **Change password (logged in).** `/account` → Change password verifies the current password on an ephemeral Supabase client (`signInWithPassword`, no session persistence), then calls `updateUser({ password, current_password })` on the real cookie session and `signOut({ scope: "others" })` so this browser stays signed in and every other session is revoked. Wrong current password returns "Current password is incorrect." New password must meet the same strength rules as signup and must differ from the current one. Enable dashboard steps 8–9 for Auth-side enforcement and the password-changed email. Passwords are never logged (SEC-01).

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

- Passwords go from the login/signup/change-password/reset forms to a Next.js Server Action, which passes them straight to Supabase Auth (`signUp` / `signInWithPassword` / `updateUser`). The FastAPI backend has no password endpoints and only ever sees Supabase JWTs.
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
