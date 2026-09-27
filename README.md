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
