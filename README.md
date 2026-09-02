# ed-tech

A classroom app with a FastAPI backend and a React/TypeScript frontend. Two roles:

- **Teacher** — posts warmups and daily summaries, grades submissions, controls the class timer
- **Student** — submits warmups, views summaries, sees a timer synced across the whole class

## Stack

- **Backend**: FastAPI + SQLAlchemy (PostgreSQL), Google OAuth2 → JWT auth, WebSockets for the live timer
- **Frontend**: React 18 + React Router v6, TypeScript, Vite, no UI component library

## Getting started

### Backend

```bash
cd backend
cp .env.example .env        # fill in values before first run
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Required env vars (see `backend/.env.example`):

| Variable | Description |
|---|---|
| `DATABASE_URL` | PostgreSQL connection string |
| `GOOGLE_CLIENT_ID` / `GOOGLE_CLIENT_SECRET` | Google OAuth2 credentials |
| `JWT_SECRET` | Secret used to sign session JWTs |
| `BACKEND_URL` / `FRONTEND_URL` | Used to build OAuth redirect URLs |

Tables are created automatically at startup (`Base.metadata.create_all`) — no migration step is needed.

### Frontend

```bash
cd frontend
cp .env.example .env        # set VITE_API_URL
npm install
npm run dev                 # dev server at localhost:5173
npm run build                # tsc + vite build
```

## Architecture

### Backend (`backend/app/`)

- Auth flow: `GET /auth/login?role=` → Google → `/auth/callback` → redirect to frontend with `?token=`. The JWT is then sent as `Authorization: Bearer <token>` on every request.
- `dependencies.py` exposes `get_db` (DB session) and `get_current_user` (decodes the JWT into a `User`).
- `models/user.py` defines both `User` and `Classroom` together, since they have a circular relationship.
- The class timer is **in-memory only** (`routers/timer.py`, not persisted to the DB). A background task ticks every second and broadcasts state over a WebSocket to all clients connected to a given `classroom_id`.

### Frontend (`frontend/src/`)

- `useAuth.tsx` — `AuthProvider` stores the JWT in `localStorage`, fetches `/auth/me` on load, and exposes `{ token, user, loading }`.
- `App.tsx` — role-based routing: authenticated teachers land on `TeacherPage`, students on `StudentPage`.
- `api.ts` — every API call goes through a single `req<T>()` helper; all API types are defined here.
- `useTimer.ts` — WebSocket hook that connects to `/timer/ws/{classroom_id}`.

### Data model

- A `Classroom` belongs to one teacher; students have a nullable `classroom_id` FK.
- A `Warmup` has an `is_active` flag — only one should be active per classroom at a time.
- A `WarmupSubmission` links a student to a warmup and has a nullable `grade`.
- A `DailySummary` is scoped per-classroom, per-date.
