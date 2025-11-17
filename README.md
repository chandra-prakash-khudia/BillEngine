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
  - Tenants:
    - `GET /api/tenants` — list tenants (newest first).
    - `GET /api/tenants/:id` — get tenant by id.
    - `GET /api/tenants/slug/:slug` — get tenant by slug.
    - `POST /api/tenants` — create tenant `{ name, slug }` (slug normalized to lowercase; 409 if exists).
    - `PUT /api/tenants/:id` — update `{ name?, slug? }` (409 if slug taken).
    - `DELETE /api/tenants/:id` — delete tenant (204 on success, 404 if missing).
  - Plans (nested under tenant):
    - `GET /api/tenants/:tenantId/plans` — list plans for tenant.
    - `GET /api/tenants/:tenantId/plans/:planId` — get a plan if owned by tenant.
    - `POST /api/tenants/:tenantId/plans` — create plan `{ name, priceCents, currency?, interval?, active? }`.
    - `PUT /api/tenants/:tenantId/plans/:planId` — update any of `{ name, priceCents, currency, interval, active }`.
    - `DELETE /api/tenants/:tenantId/plans/:planId` — delete plan (204 on success).
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
- Tenants:
  - GET http://localhost:4000/api/tenants
  - GET http://localhost:4000/api/tenants/{id}
  - GET http://localhost:4000/api/tenants/slug/{slug}
  - POST http://localhost:4000/api/tenants
  - PUT http://localhost:4000/api/tenants/{id}
  - DELETE http://localhost:4000/api/tenants/{id}
- Plans (per tenant):
  - GET http://localhost:4000/api/tenants/{tenantId}/plans
  - GET http://localhost:4000/api/tenants/{tenantId}/plans/{planId}
  - POST http://localhost:4000/api/tenants/{tenantId}/plans
  - PUT http://localhost:4000/api/tenants/{tenantId}/plans/{planId}
  - DELETE http://localhost:4000/api/tenants/{tenantId}/plans/{planId}

### Tenants API
- Create
  - Request: `POST /api/tenants` body `{ "name": "Acme", "slug": "acme" }`
  - Response: `201 Created` with tenant JSON; `409` if slug exists.
- Get by id: `GET /api/tenants/:id` → `200` or `404`.
- Get by slug: `GET /api/tenants/slug/:slug` → `200` or `404`.
- Update
  - Request: `PUT /api/tenants/:id` body `{ "name"?: string, "slug"?: string }`
  - Response: `200` with updated tenant; `409` if slug taken; `404` if not found.
- Delete: `DELETE /api/tenants/:id` → `204` or `404`.

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

## Plans API
- Model highlights: `name` (unique per tenant), `priceCents` (integer), `currency` (default `INR`), `interval` (`MONTH` | `YEAR`), `active` (boolean).
- Create
  - `POST /api/tenants/:tenantId/plans` body `{ name, priceCents, currency?, interval?, active? }`
  - Responses: `201` with plan; `404` if tenant missing; `409` if duplicate name for tenant.
- Read
  - `GET /api/tenants/:tenantId/plans` → list ordered by newest.
  - `GET /api/tenants/:tenantId/plans/:planId` → `200` plan or `404` if not owned by tenant.
- Update
  - `PUT /api/tenants/:tenantId/plans/:planId` body may include any of above fields.
  - Responses: `200` updated; `409` duplicate name; `404` not found/not owned.
- Delete
  - `DELETE /api/tenants/:tenantId/plans/:planId` → `204` or `404`.
