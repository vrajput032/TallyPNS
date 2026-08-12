# PNS ERP — Learning & Reference Guide

**Project:** TallyPNS / PNS ERP  
**Repo:** https://github.com/vrajput032/TallyPNS  
**Local path:** `~/Documents/Telly`  
**Guide date:** 24 Jul 2026  

> Keep this PDF private. It lists accounts, URLs, and env layout.  
> **Secrets (passwords, JWT keys, API keys, deploy hooks) live only in local `.env` files — never commit them to Git.**

---

## 1. What is this project?

**PNS ERP** is a small business ERP for **PNS Enterprises** (Sonipat, Haryana):

- Customers, vendors, products  
- Sales invoices & purchase bills (GST tax invoice print)  
- Inventory / stock  
- GST summary & reports  
- Cash / Bank modules (placeholders for later)

Think of it as a lightweight Tally-like web app for one company.

---

## 2. Big picture architecture

```
┌─────────────────────┐     HTTPS      ┌──────────────────────┐
│  Browser / Phone    │ ─────────────► │ Cloudflare Pages     │
│  tallypns.pages.dev │                │ React + Vite SPA     │
└─────────────────────┘                └──────────┬───────────┘
                                                  │ /api/*
                                                  ▼
                                       ┌──────────────────────┐
                                       │ Render (free tier)   │
                                       │ Express + Prisma API │
                                       │ tallypns-api.onrender│
                                       └──────────┬───────────┘
                                                  │ Postgres
                                                  ▼
                                       ┌──────────────────────┐
                                       │ Supabase Postgres    │
                                       │ project: bwbbowaj…   │
                                       └──────────────────────┘
```

| Layer | Technology | Where it runs |
|-------|------------|---------------|
| Frontend | React 19, Vite, TypeScript, Tailwind 4, shadcn/ui | Cloudflare Pages |
| Backend | Express, TypeScript, Prisma, Zod, JWT | Render |
| Database | PostgreSQL | Supabase (Tokyo / ap-northeast-1) |
| Auth | Email + password, JWT access + refresh | Backend |
| Hosting DNS | GitHub repo → Render + Cloudflare | — |

---

## 3. Production & local URLs (memorize)

| What | URL |
|------|-----|
| **Live app (frontend)** | https://tallypns.pages.dev |
| **Live API (backend)** | https://tallypns-api.onrender.com |
| **API health check** | https://tallypns-api.onrender.com/health |
| **API base (used by app)** | https://tallypns-api.onrender.com/api |
| **Local frontend** | http://localhost:5173 |
| **Local backend** | http://localhost:4000 |
| **Local API base** | http://localhost:4000/api |
| **Supabase dashboard** | https://supabase.com/dashboard/project/bwbbowajgazuljbxdwnq |
| **Supabase project URL** | https://bwbbowajgazuljbxdwnq.supabase.co |
| **GitHub** | https://github.com/vrajput032/TallyPNS |
| **Render service** | tallypns-api (Ohio, free) |
| **Cloudflare Pages project** | tallypns |

---

## 4. Accounts & logins

### App admin (seeded)

| Field | Value |
|-------|-------|
| Email | `admin@pnsenterprises.com` |
| Password | Set via `ADMIN_SEED_PASSWORD` in `backend/.env` when running seed |
| Name | Admin |
| Role | ADMIN |

Seed script: `backend/prisma/seed.ts`  
Command: `npm run seed -w backend`

### Company printed on invoices

| Field | Value |
|-------|-------|
| Name | PNS ENTERPRISES |
| GSTIN | 06ABJFP8733H1ZW |
| Address | Plot No. 2, Killa No. 25… Sonipat, Haryana - 131028 |
| Contact | Akshay Sharma — 8395054056 |
| Contact | Vinay Rajput — 8826816791 |

Config file: `frontend/src/config/company.ts`

### Cloud accounts (who owns what)

| Service | Typical login | Notes |
|---------|---------------|-------|
| GitHub | vrajput032 | Repo owner |
| Cloudflare | (your CF login) | Pages project `tallypns` |
| Render | PNS workspace | Service `tallypns-api` |
| Supabase | (your Supabase login) | Project ref `bwbbowajgazuljbxdwnq` |

---

## 5. Environment files (what each means)

### Rule

| File | Commit to Git? |
|------|----------------|
| `*.env.example` | Yes (templates) |
| `backend/.env` | **Never** |
| `frontend/.env` | **Never** |
| `frontend/.env.production` | **Never** (gitignored) |

### `backend/.env` (local + same vars on Render)

| Variable | Purpose | Your setup (safe summary) |
|----------|---------|---------------------------|
| `DATABASE_URL` | Prisma pooler connection | Supabase pooler **port 6543**, `pgbouncer=true` |
| `DIRECT_URL` | Migrations & `pg_dump` | Same host **port 5432** (direct/session) |
| `JWT_SECRET` | Sign access tokens (15m) | Long random string (local only) |
| `JWT_REFRESH_SECRET` | Sign refresh tokens (7d) | Different long random string |
| `SUPABASE_URL` | Project URL | `https://bwbbowajgazuljbxdwnq.supabase.co` |
| `SUPABASE_KEY` | Supabase anon/API key | From Supabase → Settings → API |
| `PORT` | Express listen port | `4000` (Render sets its own `PORT`) |
| `RENDER_DEPLOY_HOOK_URL` | Trigger backend deploy from CLI | From Render → Settings → Deploy Hook |

**Important:**  
- Use **DIRECT_URL (5432)** for dumps/migrations.  
- Use **DATABASE_URL (6543)** for the running app.  
- Never use pooler URL with `pg_dump`.

### `frontend/.env` (local only)

```bash
VITE_API_URL=http://localhost:4000/api
```

### `frontend/.env.production` (production builds)

```bash
VITE_API_URL=https://tallypns-api.onrender.com/api
```

Also locked in code: `frontend/src/lib/apiBaseUrl.ts` — production never uses localhost.

---

## 6. Frontend tech (learn these)

| Piece | Library | Why |
|-------|---------|-----|
| UI framework | **React 19** | Components & SPA |
| Build tool | **Vite 8** | Fast dev server & build |
| Language | **TypeScript** | Typesafety |
| Routing | **react-router-dom 7** | Pages / nested layout |
| Server state | **TanStack Query** | API fetch/cache |
| Tables | **TanStack Table** | Data grids |
| Forms | **react-hook-form + Zod** | Validation |
| HTTP | **Axios** | API client + JWT interceptors |
| Client state | **Zustand** | Auth tokens in memory/storage |
| Styling | **Tailwind CSS 4** | Utility CSS |
| Components | **shadcn/ui + Base UI** | Buttons, dialogs, sheets |
| Icons | **lucide-react** | Icons |
| Toasts | **sonner** | Notifications |
| Charts | **recharts** | (available for reports) |

### Frontend folder map

```
frontend/src/
  App.tsx                 # Routes
  features/               # One folder per business module
  components/layout/      # AppShell, Sidebar, Topbar, PageHeader
  components/ui/          # shadcn primitives
  lib/api.ts              # Axios instance
  lib/apiBaseUrl.ts       # Prod vs local API URL lock
  store/authStore.ts      # Login state
  config/company.ts       # Invoice header company info
```

### Feature pages

Dashboard, Sales, Purchase, Inventory, Cash*, Bank*, GST, Customers, Vendors, Products, Reports  
\*Cash/Bank = “coming soon” UI stubs.

---

## 7. Backend tech (learn these)

| Piece | Library | Why |
|-------|---------|-----|
| HTTP server | **Express 4** | REST API |
| ORM | **Prisma 6** | Models + SQL |
| Validation | **Zod** | Request body schemas |
| Auth | **jsonwebtoken** | JWT |
| Passwords | **bcryptjs** | Hash passwords |
| Config | **dotenv** | Load `.env` |
| CORS | **cors** | Allow Pages → API |

### Backend folder map

```
backend/src/
  index.ts                # Listen 0.0.0.0:PORT
  app.ts                  # Express + CORS + /health + /api
  routes/index.ts         # Mount all routers
  modules/*/              # auth, customers, sales, …
  middleware/auth.ts      # requireAuth (Bearer JWT)
  lib/prisma.ts           # Prisma client
backend/prisma/
  schema.prisma           # Database models
  migrations/             # SQL migrations
  seed.ts                 # Admin user
```

### Main API routes (all under `/api`)

| Method | Path | Auth | Purpose |
|--------|------|------|---------|
| POST | `/auth/login` | No | Login |
| POST | `/auth/refresh` | No | New access token |
| GET | `/dashboard/summary` | Yes | Counts & stock value |
| CRUD | `/customers` | Yes | Customers |
| CRUD | `/products` | Yes | Products |
| CRUD | `/vendors` | Yes | Vendors |
| GET/POST/DELETE | `/sales` | Yes | Invoices |
| GET/POST/DELETE | `/purchase` | Yes | Bills |
| GET | `/inventory/stock` | Yes | Stock list |
| GET | `/inventory/movements` | Yes | Stock history |
| POST | `/inventory/adjustments` | Yes | Adjust stock |
| GET | `/gst/summary` | Yes | GST totals |
| GET | `/reports/profit-loss` | Yes | P&L |
| GET | `/reports/stock` | Yes | Stock report |
| GET | `/cash`, `/bank` | Yes | Stub 501 |
| GET | `/health` | No | Render health check |

Auth header: `Authorization: Bearer <accessToken>`

---

## 8. Database (Prisma models)

PostgreSQL on Supabase. Schema: `backend/prisma/schema.prisma`

| Model | Purpose |
|-------|---------|
| User | Login accounts (ADMIN / STAFF) |
| Customer | Buyers |
| Vendor | Suppliers |
| Product | Items + stock + GST rate |
| SalesInvoice + SalesInvoiceItem | Sales with lines |
| PurchaseBill + PurchaseBillItem | Purchases with lines |
| StockMovement | IN / OUT / ADJUSTMENT |
| LedgerEntry | Future cash/bank ledger |

**Useful commands**

```bash
npm run prisma:migrate -w backend   # apply migrations
npm run prisma:studio -w backend    # browse tables in browser
npm run seed -w backend             # create admin user
```

---

## 9. Daily commands (cheat sheet)

```bash
# Install once
npm install

# Local development (both servers)
npm run dev
# or separately:
npm run dev:backend
npm run dev:frontend

# Production deploy (ONE go — preferred)
npm run deploy

# Database safety
npm run db:backup                 # full .dump restoreable backup
npm run db:export:sheets          # CSV for Excel / Google Sheets
npm run db:restore -- backups/tallypns-latest.dump
```

---

## 10. Deploy policy (save Render limits)

Render free tier is **monthly**:

- ~500 **pipeline minutes** (builds)  
- ~750 **instance hours** (runtime)  
- Free service **sleeps** when idle → first request may take 30–60s  

**Rule:** finish frontend + backend work, then deploy **once**:

```bash
npm run deploy
```

Docs: `docs/DEPLOYMENT.md`, `docs/RELEASE_CHECKLIST.md`  
Cursor rule: `.cursor/rules/deployment.mdc`

---

## 11. Backups (best practice)

| Method | Command | Restorable? |
|--------|---------|-------------|
| **Full dump (best)** | `npm run db:backup` | Yes → new Postgres/Supabase |
| CSV / Excel | `npm run db:export:sheets` | Readable only, not full restore |

Files go to `backups/` (**gitignored**). Copy dumps to Drive / iCloud / USB.

---

## 12. Common problems & fixes

| Symptom | Cause | Fix |
|---------|-------|-----|
| Mobile: cannot reach server | Frontend built with localhost API | `npm run deploy:frontend` |
| GST / Inventory 404 | Render on old commit | Redeploy backend / `npm run deploy` |
| Invalid email/password (but password OK) | Network/API down OR wrong creds | Check `/health`, then seed admin |
| Slow first load | Render cold start | Wait & retry |
| `pg_dump` fails | Using pooler port 6543 | Use `DIRECT_URL` port 5432 |

---

## 13. Mental model for learning

1. **Frontend** = UI + calls `/api`  
2. **Backend** = business rules + JWT + Prisma  
3. **Supabase** = only the database (not hosting the Node app)  
4. **Cloudflare** = static React files  
5. **Render** = Node API process  
6. **Env files** = secrets & URLs for each environment  
7. **Deploy once** = protect free-tier minutes  

When you change a feature: update **backend module** + **frontend feature** + test locally → one `npm run deploy`.

---

## 14. Where to look in code

| I want to… | Open |
|------------|------|
| Add a page | `frontend/src/App.tsx` + `features/...` |
| Add an API | `backend/src/modules/...` + `routes/index.ts` |
| Change DB table | `backend/prisma/schema.prisma` then migrate |
| Change login | `auth` modules + `LoginPage.tsx` |
| Change invoice header | `frontend/src/config/company.ts` |
| Change API URL logic | `frontend/src/lib/apiBaseUrl.ts` |
| Deploy script | `scripts/deploy.sh` |

---

*End of guide — PNS ERP / TallyPNS learning reference*
