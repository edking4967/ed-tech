# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Ed-tech classroom app with a FastAPI backend and React/TypeScript frontend. Two user roles: **teacher** (posts warmups, summaries, grades submissions, controls timer) and **student** (submits warmups, views summaries, sees synced timer).

## Development Commands

### Backend
```bash
cd backend
cp .env.example .env        # fill in values before first run
pip install -r requirements.txt
uvicorn app.main:app --reload
```

### Frontend
```bash
cd frontend
cp .env.example .env        # set VITE_API_URL
npm install
npm run dev                 # dev server at localhost:5173
npm run build               # tsc + vite build
```

## Architecture

### Backend (`backend/app/`)
- **FastAPI** app with SQLAlchemy (PostgreSQL via `DATABASE_URL`)
- Tables are auto-created at startup via `Base.metadata.create_all`
- Auth: Google OAuth2 → JWT. Flow: `/auth/login?role=` → Google → `/auth/callback` → redirect to frontend with `?token=`. JWT is then passed as `Authorization: Bearer` on all requests.
- `dependencies.py` provides `get_db` (DB session) and `get_current_user` (JWT decode → User)
- `models/user.py` defines both `User` and `Classroom` (co-located because of circular relationships)
- Timer state is **in-memory only** (`routers/timer.py` — not persisted to DB). A background task (`tick_timers`) decrements running timers every second and broadcasts via WebSocket to all connected clients per `classroom_id`.

### Frontend (`frontend/src/`)
- React 18 + React Router v6, no UI component library (plain CSS vars)
- `useAuth.tsx`: `AuthProvider` stores JWT in `localStorage`, fetches `/auth/me` on load, exposes `{ token, user, loading }`
- `App.tsx`: role-based routing — authenticated teachers go to `TeacherPage`, students to `StudentPage`
- `api.ts`: all API calls go through a single `req<T>()` helper; all interfaces for API types are defined here
- `useTimer.ts`: WebSocket hook connecting to `/timer/ws/{classroom_id}`
- Frontend env: `VITE_API_URL` (defaults to `http://localhost:8000`)

### Key relationships
- A `Classroom` belongs to one teacher; students have a nullable `classroom_id` FK
- `Warmup` has an `is_active` flag — only one should be active at a time per classroom
- `WarmupSubmission` links a student to a warmup, has a nullable `grade` field
- `DailySummary` is per-classroom per-date
