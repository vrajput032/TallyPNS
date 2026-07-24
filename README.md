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

Full CRUD is implemented for **Customers**, **Products**, and **Vendors**. **Sales** and
**Purchase** support creating invoices/bills with line items, automatic stock adjustment, and a
print view matching a GST tax invoice format (CGST/SGST split, company header, amount in words).
Remaining MVP modules (Inventory, Cash, Bank, GST, Reports) are routed with placeholder
pages/stub endpoints, ready to be built out following the same pattern (see
`backend/src/modules/customers` and `frontend/src/features/customers`).

## Useful commands

- `npm run dev` — run backend + frontend concurrently
- `npm run prisma:studio -w backend` — browse the database in Prisma Studio
- `npm run build -w frontend` — production build of the frontend
- `npm run build -w backend` — compile the backend to `backend/dist`

## Deploy frontend (Cloudflare Pages)

The Vite SPA deploys to Cloudflare Pages. The Express API does **not** run on Pages; host it
separately (Render, Railway, Fly, etc.) or keep it local.

### Option A — Git integration (recommended)

1. Push this repo to GitHub (`vrajput032/TallyPNS`).
2. Cloudflare dashboard: **Workers & Pages → Create → Pages → Connect to Git → TallyPNS**.
3. Build settings:
   - **Build command**: `npm run build -w frontend`
   - **Build output directory**: `frontend/dist`
   - **Root directory**: `/` (repo root so workspaces resolve)
4. SPA routing uses [`frontend/public/_redirects`](frontend/public/_redirects) (copied into `dist` by Vite).
5. Set Pages env var `VITE_API_URL` to your public API base ending in `/api`, then redeploy
   (Vite bakes env vars in at build time).

### Option B — Wrangler CLI

```bash
npm run deploy:frontend
```

Production API URL is locked in three places so deploy cannot fall back to localhost:

1. `frontend/.env.production`
2. `npm run deploy:frontend` (forces `VITE_API_URL=...onrender.com/api`)
3. `frontend/src/lib/apiBaseUrl.ts` (production builds ignore localhost URLs)

Local `npm run dev` still uses `frontend/.env` (`http://localhost:4000/api`).

Settings are also in [`wrangler.toml`](wrangler.toml).

Do **not** add `backend/.env` secrets to Cloudflare Pages.

Prefer `npm run deploy:frontend` for Cloudflare deploys.

## Deploy backend (Render)

The Express API deploys as a free Render web service (see [`render.yaml`](render.yaml)).

1. In Render: **New → Blueprint** (or Web Service) → connect `vrajput032/TallyPNS`.
2. Set these env vars from `backend/.env`:
   - `DATABASE_URL` (Supabase pooled URL, port 6543)
   - `JWT_SECRET` / `JWT_REFRESH_SECRET`
   - `SUPABASE_URL` / `SUPABASE_KEY`
3. After deploy, set Cloudflare Pages `VITE_API_URL` to `https://<your-service>.onrender.com/api` and redeploy the frontend.

## Database backups (recommended)

**Best option:** full Postgres dumps (`.dump`). These can restore everything if the server or Supabase project is gone.

### 1. One-time setup
```bash
brew install libpq && brew link --force libpq
echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
```

Ensure `backend/.env` has a working `DIRECT_URL` (port **5432**, not pooler `6543`).
Use `frontend/.env.example` / `frontend/.env.production.example` as templates — never commit real `.env` files.

### 2. Backup (run regularly, and before risky changes)
```bash
npm run db:backup
```
Creates `backups/tallypns-YYYYMMDD-HHMMSS.dump` and updates `backups/tallypns-latest.dump`.  
**Copy that file to Google Drive / iCloud / USB.**

### 3. Restore if something is lost
Local Docker copy:
```bash
docker compose up -d
npm run db:restore -- backups/tallypns-latest.dump
```

Into a **new** Supabase database (disaster recovery):
```bash
RESTORE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  npm run db:restore -- backups/tallypns-latest.dump
```
Then point Render/`backend/.env` at the new project URLs and redeploy.

### Optional: Excel / Google Sheets
Readable offline copy only — **not** for full restore:
```bash
npm run db:export:sheets
```
