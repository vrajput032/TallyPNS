# Release checklist

Use this before each production deploy. Goal: **one deploy per batch of work**.

## Before you deploy

- [ ] Feature/fix is complete on **both** frontend and backend (if both touched)
- [ ] Tested locally (`npm run dev`)
- [ ] No secrets in staged files (`.env`, dumps, `backups/`)
- [ ] Changes committed with a clear message
- [ ] Pushed to `main` on GitHub (or let `npm run deploy` push for you)

## Deploy

```bash
npm run deploy
```

## After deploy (5 min)

- [ ] https://tallypns-api.onrender.com/health returns `{"status":"ok"}`
- [ ] https://tallypns.pages.dev loads
- [ ] Login works (`admin@pnsenterprises.com`)
- [ ] Spot-check changed pages (Sales, Purchase, Inventory, GST, Reports)
- [ ] Hard refresh or private tab on mobile if cache looks stale

## Optional (before big changes)

```bash
npm run db:backup
```

## When to deploy only one side

Rare cases only:

| Command | When |
|---------|------|
| `npm run deploy:frontend` | UI-only change, no API/schema changes |
| `npm run deploy:backend` | API-only fix, frontend unchanged |

Otherwise always use `npm run deploy`.
