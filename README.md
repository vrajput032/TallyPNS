# PNS ERP

Phase 1 MVP scaffold: React + Vite frontend, Express + Prisma backend, PostgreSQL via Supabase.

## Prerequisites

- Node.js 20+
- A free [Supabase](https://supabase.com) project (for the Postgres database)

## Setup

1. Install dependencies from the repo root:

   ```bash
   npm install
   ```

2. Create `backend/.env` from the example and fill in your Supabase connection details:

   ```bash
   cp backend/.env.example backend/.env
   ```

   - `DATABASE_URL`: from Supabase project settings → Database → Connection string (use the pooled/transaction connection string)
   - `SUPABASE_URL` / `SUPABASE_KEY`: from Supabase project settings → API
   - `JWT_SECRET` / `JWT_REFRESH_SECRET`: any random strings for local dev

3. Create `frontend/.env` from the example (defaults are already correct for local dev):

   ```bash
   cp frontend/.env.example frontend/.env
   ```

4. Run the initial database migration:

   ```bash
   npm run prisma:migrate -w backend
   ```

5. Seed an admin user (`admin@pnsenterprises.com` / `admin123`):

   ```bash
   npm run seed -w backend
   ```

6. Start both servers:

   ```bash
   npm run dev
   ```

   - Backend: http://localhost:4000
   - Frontend: http://localhost:5173

## Project layout

```
backend/    Express + TypeScript + Prisma API
frontend/   React + Vite + TypeScript SPA
```

Full CRUD is implemented for **Customers** and **Products**. Other MVP modules (Sales, Purchase,
Inventory, Cash, Bank, GST, Reports) are routed with placeholder pages/stub endpoints, ready to be
built out following the same pattern (see `backend/src/modules/customers` and
`frontend/src/features/customers`).

## Useful commands

- `npm run dev` — run backend + frontend concurrently
- `npm run prisma:studio -w backend` — browse the database in Prisma Studio
- `npm run build -w frontend` — production build of the frontend
- `npm run build -w backend` — compile the backend to `backend/dist`

## Deploy frontend (Netlify)

The Vite SPA deploys to Netlify. The Express API does **not** run on Netlify; host it separately (Render, Railway, Fly, etc.) or keep it local.

1. Push this repo to GitHub (already linked as `vrajput032/TallyPNS`).
2. In Netlify: **Add new site → Import an existing project → GitHub → TallyPNS**.
3. Build settings are in [`netlify.toml`](netlify.toml) (build `frontend`, publish `frontend/dist`, SPA redirects).
4. Set a site environment variable before or after the first deploy:
   - `VITE_API_URL` — public API base including `/api`, e.g. `https://your-api.onrender.com/api`
   - Redeploy after changing env vars (Vite bakes them in at build time).
5. Do **not** add `backend/.env` secrets to Netlify.

Until a public API URL is set, the site will load but login/CRUD will fail in the browser.
