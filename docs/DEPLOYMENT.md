# Deployment guide

PNS ERP uses two hosts:

| Part | Host | URL |
|------|------|-----|
| Frontend | Cloudflare Pages | https://tallypns.pages.dev |
| Backend | Render (free) | https://tallypns-api.onrender.com |

Database stays on **Supabase** — deploy does not move the DB.

---

## Policy: deploy in one go

**Do not deploy after every small change.** Batch your work, then release once.

Why:

- Render **pipeline minutes** are monthly (500 min on free tier). Each backend deploy uses build time.
- Render **instance hours** are monthly (750 h). Fewer unnecessary redeploys = less churn.
- Frontend + backend stay on the same release instead of half-updated production.

### Recommended workflow

1. Develop locally (`npm run dev`).
2. Test locally.
3. Commit all related frontend + backend changes together.
4. Push to `main` on GitHub.
5. Deploy once:
   ```bash
   npm run deploy
   ```
6. Smoke-test production (login, one CRUD page, one API tab).

### Avoid

- Deploying backend, then deploying again 10 minutes later for a tiny fix — batch fixes first.
- Running `deploy:frontend` and `deploy:backend` separately in the same release window.
- Building frontend with plain `npm run build -w frontend` without production API URL (use `npm run deploy`).

---

## One-time setup

### Backend (Render)

1. Service: **tallypns-api** connected to `vrajput032/TallyPNS` on branch `main`.
2. Env vars in Render dashboard (from `backend/.env`):
   - `DATABASE_URL`, `DIRECT_URL`
   - `JWT_SECRET`, `JWT_REFRESH_SECRET`
   - `SUPABASE_URL`, `SUPABASE_KEY`
3. Deploy hook URL in local `backend/.env`:
   ```bash
   RENDER_DEPLOY_HOOK_URL="https://api.render.com/deploy/srv-...?key=..."
   ```
   Copy from Render → tallypns-api → **Settings** → **Deploy Hook**.

### Frontend (Cloudflare Pages)

- Project: **tallypns**
- Production API URL is baked at build time: `https://tallypns-api.onrender.com/api`
- Local dev still uses `http://localhost:4000/api` via `frontend/.env`

### Local tools

```bash
brew install libpq && brew link --force libpq
echo 'export PATH="/opt/homebrew/opt/libpq/bin:$PATH"' >> ~/.zshrc
brew install age   # encrypts/decrypts database backups
```

Backend deploys also need the private dump repo cloned next to this project (`../DBDumps`) — see [Database backups](#database-backups).

---

## Deploy commands

From repo root:

```bash
npm run deploy           # backend + frontend (default)
npm run deploy:backend   # Render only
npm run deploy:frontend  # Cloudflare only
```

What `npm run deploy` does:

1. Warns if you have uncommitted changes.
2. Pushes to `origin/main` if local HEAD differs from remote.
3. Takes an encrypted database backup and pushes it to `DBDumps` (`npm run db:backup:push`). If the backup fails, the deploy stops.
4. Triggers Render deploy hook for current commit.
5. Builds frontend with production `VITE_API_URL`.
6. Deploys `frontend/dist` via Wrangler to Cloudflare Pages.

Steps 3–4 only run for backend deploys (`deploy` and `deploy:backend`). To deploy without the backup (for example when Supabase is unreachable):

```bash
SKIP_DB_BACKUP=1 npm run deploy
```

---

## Render free tier limits (monthly)

These reset each billing month for the whole workspace:

| Limit | Included | Notes |
|-------|----------|-------|
| Pipeline minutes | 500 min | Build/deploy time — **batch deploys to save this** |
| Instance hours | 750 h | Free web service runtime; service sleeps when idle |
| Bandwidth | 5 GB | API traffic |
| Services | 25 | You use 1 (`tallypns-api`) |

Free services **spin down** after inactivity. First request after sleep can take 30–60 seconds.

---

## Verify production

```bash
curl https://tallypns-api.onrender.com/health
# {"status":"ok"}

# After login in browser, check Network tab for:
# https://tallypns-api.onrender.com/api/...
```

If API returns 404 for new routes, Render is likely on an old commit. Open Render dashboard → **Manual Deploy** → **Deploy latest commit** (or run `npm run deploy:backend`).

If login says "Cannot reach the server", frontend was built with localhost API URL — redeploy with `npm run deploy:frontend`.

---

## Database backups

Backups are full `pg_dump` files, encrypted with [age](https://age-encryption.org) and stored in the private repo [`vrajput032/DBDumps`](https://github.com/vrajput032/DBDumps) as `tallypns-YYYYMMDD-HHMMSS.dump.age`. `tallypns-latest.dump.age` points at the newest one.

| When | How |
|------|-----|
| Every night, 02:00 IST | GitHub Actions workflow `nightly-backup.yml` in `DBDumps` |
| Every backend deploy | `npm run deploy` / `deploy:backend` runs `db:backup:push` first |
| On demand | `npm run db:backup:push` (or **Run workflow** in the `DBDumps` Actions tab) |

**Retention:** `DBDumps/prune.sh` keeps every backup from the last 30 days, plus the oldest backup of each earlier month.

### Encryption keys

- **Public key** — `DBDumps/age-recipient.txt`. Used to encrypt; safe to commit.
- **Private key** — `~/.config/tallypns/age-backup.key` on the admin Mac, with a copy in the password manager. Never commit it or add it to GitHub. **Without it, no backup can be restored.**

### Secrets

The nightly workflow needs the `DIRECT_URL` repository secret in `DBDumps`: the Supabase session-pooler URL on port **5432** (GitHub runners have no IPv6, so the direct `db.<ref>.supabase.co` host will not work). If the Supabase password changes, update it:

```bash
cd backend && node --input-type=module -e "import 'dotenv/config'; process.stdout.write(process.env.DIRECT_URL)" \
  | gh secret set DIRECT_URL -R vrajput032/DBDumps
```

### Restore

```bash
# Into local Docker Postgres (port 5433)
npm run db:restore -- ../DBDumps/tallypns-latest.dump.age

# Into a new Supabase project (disaster recovery)
RESTORE_URL="postgresql://postgres:[PASSWORD]@db.[PROJECT-REF].supabase.co:5432/postgres" \
  npm run db:restore -- ../DBDumps/tallypns-latest.dump.age
```

`.age` files are decrypted automatically; set `AGE_IDENTITY` if the private key is not at the default path. Restore the latest backup into local Docker about once a month to confirm backups still work.

---

## Troubleshooting

| Problem | Likely cause | Fix |
|---------|--------------|-----|
| Login fails on phone | Frontend points at localhost | `npm run deploy:frontend` |
| GST/Inventory 404 | Backend not on latest commit | Redeploy backend |
| Slow first API call | Render free tier cold start | Wait and retry |
| Deploy hook fails | Missing/wrong `RENDER_DEPLOY_HOOK_URL` | Update `backend/.env` from Render settings |
