# Startup Audit

This document summarizes the project structure, tech stack, key scripts, configs, and pre‑flight observations to ensure a deterministic, secure local start.

## Project Map

- Root
  - package.json (orchestrator) + package-lock.json (npm)
  - scripts: start/dev proxies to frontend and backend shell starters
  - docker-compose.yml, deploy scripts
  - docs/* existing guidance files
  - src/
    - backendN/ (Node.js + Express 5 + TypeScript + Prisma + Socket.IO + Meilisearch)
    - frontend/ (Create React App + React 18 + TypeScript + TailwindCSS)

## Stack Detection

- Monorepo: Yes (two packages under `src/frontend` and `src/backendN`), root orchestrator
- Languages: TypeScript (both FE and BE)
- Frontend: CRA (react-scripts 5), React 18, TailwindCSS, axios, react-router-dom
- Backend: Node 20+, Express 5, Prisma ORM, Socket.IO, Zod, Meilisearch, Twilio, SendGrid
- Package Manager: npm (presence of package-lock.json files)

## Key Scripts

- Root
  - `npm run start` / `dev`: `./start-servers.sh` (starts FE+BE together)
  - `npm run backend` / `frontend`: scope-run
  - `npm run install:all`, `build:all`: monorepo helpers
- Backend (`src/backendN/package.json`)
  - `dev`: `tsx watch src/index.ts`
  - `populate`: seed via `tsx src/index.ts --populate`
  - `build`: `tsc && tsc-esm-fix dist --ext .js`
  - `start`: Node ESM runner with JSON loader registration
  - `prisma:*`: generate, migrate (CLI not listed in deps yet)
- Frontend (`src/frontend/package.json`)
  - `start`: CRA dev server (PORT overridden in script)
  - `build`, `test`, `eject`

## Configs and Conventions

- FE: `tsconfig.json` with `baseUrl: "src"` (supports absolute imports like `components/...`)
- FE: Tailwind configured (`tailwind.config.js`, `postcss.config.js`)
- BE: `tsconfig.json` with outDir `dist`, ESM module
- Env: `.env` files present under both FE and BE; `.env.example` exists but is incomplete
- Security: Root `.gitignore` does not ignore nested `.env` files (risk of leaking secrets)

## Middleware Review (Backend)

- `authGuard` (optional/required) attaches user context via JWT and Prisma lookups; used widely
- `rbac` / `adminRbac` perform role checks; `adminRbac` returns detailed error object
- `rateLimiter` + `adminApiLimiter` applied to admin routes
- `auditLog` (admin routes) records actor, entity, IP (rounded), UA to DB
- Ordering in `src/index.ts`: `helmet` -> `cors` -> `morgan` -> `json` -> static -> routers (sensible)
- CORS: allows specific local dev origins; consider env-driven origin list for prod

Observations

- Good separation of concerns; middlewares are explicit per-route where needed
- Admin routes protected by rate limits and audit logging
- Suggest: type `rateLimiter` options, and centralize allowed origins via env for prod

## Package & Version Observations

- Backend
  - `dotenv@^17.2.1` — likely invalid; latest stable is 16.x
  - `@prisma/client@^6.13.0` — Prisma v6 does not exist; use 5.x
  - Missing `prisma` CLI in devDependencies (required for generate/migrate)
- Frontend
  - CRA v5 + TS 4.9 + React 18 — OK
  - Tailwind present. No ESLint/Prettier config files checked in

## Env & Security Observations

- `src/backendN/.env` contains live secrets and is committed; must be excluded from VCS
- `GOOGLE_CLIENT_SECRET` required by Google OAuth is missing in `.env` (present only `GOOGLE_CLIENT_ID`)
- FE uses `process.env.REACT_APP_API_URL` extensively; `.env.example` lacks this

## Recommended Changes (Minimal & Safe)

1) Ignore nested `.env` files and provide complete `.env.example`
2) Fix backend dependencies: use `dotenv@^16`, `@prisma/client@^5`, add `prisma@^5` dev dep
3) Add FE `REACT_APP_API_URL` example, keep CRA port via `PORT`
4) Optional: provide shared HTTP client and minimal UI primitives as scaffolds
5) Optional: centralize allowed CORS origins via env array for production

## Run Guidance

1) npm install (root): `npm run install:all`
2) Setup envs: copy `.env.example` to `.env` in BE and FE, fill secrets
3) Backend DB: ensure Postgres running; run `npm run prisma:generate` and migrations
4) Start dev: from root `npm run start` (or `npm run start:https` with certs)
5) FE at `https://localhost:5173`, BE at `http://localhost:3000/api/v1`

## Notes

- No Next.js/Nuxt/Vite — FE is CRA
- SSR/SSG not applicable
- Socket.IO namespace `/chat` initialized in server

