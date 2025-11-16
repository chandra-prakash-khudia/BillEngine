# BillEngine

A TypeScript/Express + Prisma (PostgreSQL) billing engine scaffold.

## Current Status
- Prisma client generation fixed: uses `prisma-client-js` and outputs to `node_modules/@prisma/client`.
- Dev runtime aligned to CommonJS (per `tsconfig.json`):
  - `package.json` `dev` script: `ts-node-dev --respawn --transpile-only src/index.ts`
  - Removed ESM loader and project-level `type: module`.
- Dev server starts successfully and listens on `PORT` (defaults to `4000`).
- Routes wired:
  - `GET /api/health` — simple heartbeat.
  - `POST /api/auth/signup`, `POST /api/auth/login` — basic auth flows.
  - `POST /api/tenants`, `GET /api/tenants` — create/list tenants.
- Seed script available: `npm run seed`.
- Prisma schema models: `User`, `Tenant`, `TenantUser`, `Plan`, `Subscription`, `Invoice`, `Payment`, `RefreshToken` with enums for roles/statuses.

## Requirements
- Node.js 18+ (LTS recommended).
- PostgreSQL and a valid `DATABASE_URL`.

## Environment
Create `.env` in project root with at least:

```
DATABASE_URL="postgresql://USER:PASSWORD@HOST:PORT/DB?schema=public"
JWT_SECRET="dev_secret" # set a strong value in non-dev
PORT=4000              # optional; defaults to 4000
```

## Install & Setup
```bash
npm install
npm run prisma:generate
# First-time DB setup or after schema changes:
npm run prisma:migrate
# Optional seed data:
npm run seed
```

## Run
```bash
npm run dev
```
Open:
- Health: http://localhost:4000/api/health
- Auth:   POST http://localhost:4000/api/auth/signup | /login
- Tenants: POST/GET http://localhost:4000/api/tenants

If you export `PORT`, adjust the URLs accordingly.

## Useful Scripts
- `npm run dev`: Start dev server with ts-node-dev.
- `npm run build`: TypeScript compile to `dist`.
- `npm start`: Run compiled app from `dist`.
- `npm run prisma:generate`: Generate Prisma client.
- `npm run prisma:migrate`: Create/apply a dev migration (name: `init`).
- `npm run prisma:studio`: Prisma Studio UI.
- `npm run seed`: Run seeding script.

## Troubleshooting
- Error: "@prisma/client did not initialize yet"
  - Run `npm run prisma:generate`.
  - Ensure `generator client { provider = "prisma-client-js" }` in `prisma/schema.prisma`.
- Error: "Must use import to load ES Module"
  - Ensure `tsconfig.json` has `"module": "CommonJS"` and the dev script does not use an ESM loader.
- Cannot connect to DB
  - Verify `DATABASE_URL` and that PostgreSQL is reachable.

## Next Steps
- Add request validation and error handling middleware.
- Protect tenant routes with auth middleware (JWT verification).
- Expand seed data for plans/subscriptions.
- Add tests (unit/integration) and CI.
- Optional: Add `postinstall` hook to auto-run `prisma generate`.
