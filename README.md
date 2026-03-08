# Candle-Based Rolling Computation Engine

Production-shaped full-stack monorepo for candle rolling computations with three source modes:
- `MOCK`
- `API` (Zerodha, plain HTTP)
- `EXCEL` upload

## Stack

- Monorepo: pnpm workspaces (no Turborepo)
- Backend: NestJS + TypeScript + MongoDB Atlas + Mongoose + JWT + SSE + Multer + xlsx
- Frontend: React + TypeScript + Vite + TailwindCSS + Zustand + shadcn-style UI primitives
- Shared engine: `packages/engine` (pure TypeScript)

## Repository Structure

```text
/
  package.json
  pnpm-workspace.yaml
  .gitignore
  .env.example
  README.md

  backend/
  frontend/
  packages/
    engine/
```

## Core Features Implemented

1. User authentication
- Register/login/logout/refresh/me
- Access + refresh JWT flow
- Refresh-session persistence and rotation in MongoDB
- Password hashing via argon2

2. Workspace configuration
- Persisted mode/interval/session/variables/API config per user
- Variable config validation endpoint

3. Shared rolling computation engine
- Base row variables (rolling windows)
- Derived row variables (`-`, `/`)
- Session snapshot variables (`scope=session`, `computeMode=once`, trigger/range)
- Dependency validation + unknown refs + cycle detection

4. Candle source modes
- MOCK: seeded JSON assets (`3m`, `5m`, `15m`) and system-time derivation logic
- API: Zerodha session store, instruments CSV fetch/parse, historical candles fetch
- EXCEL: backend upload + parse + normalize + compute

5. Streaming
- Protected SSE endpoint: `GET /stream/session`
- Events: `session.status`, `candles.snapshot`, `candles.delta`, `engine.error`
- API mode emits aligned to candle boundary window

6. Frontend app
- Auth pages and guarded dashboard
- Session/source panel with mode + interval + mock anchor
- Zerodha session + instrument search/select + date range
- Variable builder (add/edit/delete)
- Candle table with dynamic variable columns
- Inspector panel with computation trace
- Excel upload panel

## Environment Variables

### Root `.env.example`
- `PORT`
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `TOKEN_ENCRYPTION_SECRET`
- `FRONTEND_URL`
- `VITE_API_BASE_URL`

### Backend `backend/.env.example`
- `PORT`
- `MONGODB_URI`
- `JWT_ACCESS_SECRET`
- `JWT_REFRESH_SECRET`
- `TOKEN_ENCRYPTION_SECRET`
- `FRONTEND_URL`

### Frontend `frontend/.env.example`
- `VITE_API_BASE_URL`

## Local Development

Prerequisites:
- Node.js 20+
- pnpm 9+
- MongoDB Atlas URI

Commands:

```bash
pnpm install
pnpm --filter @candle/engine build
pnpm --filter backend dev
pnpm --filter frontend dev
```

Or run both apps in parallel:

```bash
pnpm dev
```

Frontend default URL: `http://localhost:5173`
Backend default URL: `http://localhost:4000`

## API Endpoints

### Auth
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/logout`
- `POST /auth/refresh`
- `GET /auth/me`

### Workspace Config
- `GET /config/workspace`
- `PUT /config/workspace`

### Variables
- `POST /variables/validate`

### Candles
- `GET /candles/snapshot`
- `GET /candles/delta`
- `POST /candles/compute`

### Streaming
- `GET /stream/session` (SSE, protected)

### Uploads
- `POST /uploads/excel-candles`

### Zerodha
- `POST /zerodha/session`
- `GET /zerodha/session`
- `GET /zerodha/instruments`
- `GET /zerodha/history`

## Zerodha Notes

- Manual input in UI: `enctoken`, `user_id`
- No Zerodha Node SDK used
- Instruments fetched from `https://api.kite.trade/instruments` (CSV)
- Historical fetched from `https://kite.zerodha.com/oms/instruments/historical/{instrument_token}/{interval}minute`

## Deployment

### Frontend (Vercel)
- Root directory: `frontend`
- Build command: `pnpm build`
- Output directory: `dist`
- Env: `VITE_API_BASE_URL`

### Backend (Render)
- Root directory: `backend`
- Build command: `pnpm build`
- Start command: `pnpm start`
- Env: `PORT`, `MONGODB_URI`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `TOKEN_ENCRYPTION_SECRET`, `FRONTEND_URL`

### Database (MongoDB Atlas)
- Create DB user + network access allowlist
- Set `MONGODB_URI` in backend environment

## Required Runtime Inputs Before API Mode Production Finalization

1. `MONGODB_URI`
2. `JWT_ACCESS_SECRET`
3. `JWT_REFRESH_SECRET`
4. `TOKEN_ENCRYPTION_SECRET`
5. Frontend/backend public URLs
6. Per-user Zerodha runtime data:
   - `enctoken`
   - `user_id`
   - selected instrument
   - interval
   - date/from-to

## Notes

- Mock mode is usable without Zerodha credentials.
- Engine package includes unit tests for rolling/derived/session/cycle behavior.
