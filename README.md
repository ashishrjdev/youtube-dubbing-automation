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

## Backend, worker, and Redis

From the repo root:

```bash
docker compose up --build
```

- API: [http://localhost:8000](http://localhost:8000)
- Health check: [http://localhost:8000/health](http://localhost:8000/health)
- Redis: `localhost:6379`

The frontend is **not** containerized so hot reload stays fast.

## Frontend

```bash
cd frontend
npm install
npm run dev
```

App: [http://localhost:3000](http://localhost:3000)

## Alembic migrations

Run against the Postgres instance in `DATABASE_URL` (typically the Supabase project database):

```bash
cd backend
python3.12 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
alembic upgrade head
```

The initial migration creates `projects`, `speakers`, `script_lines`, and `generations`.

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
