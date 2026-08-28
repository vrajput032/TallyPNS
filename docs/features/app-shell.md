# App shell

**Frontend:** `frontend/src/App.tsx`, `frontend/src/components/layout/`, `frontend/src/features/auth/`, `frontend/src/config/company.ts`  
**API:** [`../APIS.md`](../APIS.md) (auth)

## Behaviour

- Login by **username** (not email). JWT access token (12h) + refresh token (30d); the SPA refreshes automatically on 401.
- **Cold-start loader:** Full-screen Lottie overlay only when the Render backend may be waking from sleep (~15 minutes idle, or first load). Uses the [Revenue animation by Mahendra](https://lottiefiles.com/free-animation/revenue-tuJQOIS7CB) (Lottie Simple License). Cycles witty messages about the free plan; tap to change message. Normal API calls do **not** show this overlay.
- **Section loaders:** Each feature reads from its Redux slice. Skeleton/loader shows only when that slice has **no cached data yet**. Revisiting a section shows cached data immediately; `SectionDataSync` silently refetches in the background on navigation.
- **Redux cache:** One slice per feature area (`customers`, `sales`, `dashboard`, etc.). Hooks in `frontend/src/features/*/use*.ts` dispatch slice thunks; `{ silent: true }` refetches skip loading state when data already exists.
- Sidebar navigation (desktop) and mobile-friendly lists, cards, and edge swipe.
- Theme selector (primary colour). Optional 3D background via `VITE_ENABLE_3D`.
- Company header on prints comes from `frontend/src/config/company.ts` (PNS ENTERPRISES, GSTIN `06ABJFP8733H1ZW`, HDFC bank details).

## Screens

| Route | Page | Who |
|-------|------|-----|
| `/login` | Login | Public |
| `/` | Dashboard | All |
| `/sales` `/sales/new` `/sales/:id` `/sales/:id/edit` | Sales invoices | All (delete = admin + PIN) |
| `/purchase` `/purchase/new` `/purchase/:id` `/purchase/:id/edit` | Purchase bills | All (delete = admin + PIN) |
| `/inventory` | Stock by pipe size + movements | All |
| `/raw-material` `/raw-material/new` `/raw-material/:id` | Steel / MS tube supplier bills | All (delete = admin + PIN) |
| `/cash` `/bank` | Cash book / bank book | All |
| `/gst` | GST summary + GSTR-1 JSON | All |
| `/customers` `/vendors` `/products` | Masters | All (delete = admin) |
| `/reports` | P&L, stock, outstanding, balance sheet, trial balance | All |
| `/users` | User management | Admin |
| `/recycle-bin` | Soft-deleted sales & purchase | Admin |
