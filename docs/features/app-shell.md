# App shell

**Frontend:** `frontend/src/App.tsx`, `frontend/src/components/layout/`, `frontend/src/features/auth/`, `frontend/src/config/company.ts`  
**API:** [`../APIS.md`](../APIS.md) (auth)

## Behaviour

- Login by **username** (not email). JWT access token (12h) + refresh token (30d); the SPA refreshes automatically on 401.
- Login and refresh send an optional **deviceName** (browser + device type, e.g. `Chrome on Mac`) so activity logs can show which device did the work.
- **Cold-start loader:** Full-screen Lottie overlay when the Render backend may be waking from sleep (~15 minutes idle, or first load) **and** the user is actually waiting: a screen on view has no cached data yet, or a save/edit/delete (POST/PUT/PATCH/DELETE) is pending. Background refreshes of cached data never show it. Uses the [Revenue animation by Mahendra](https://lottiefiles.com/free-animation/revenue-tuJQOIS7CB) (Lottie Simple License). Cycles witty messages about the free plan; tap to change message. Normal API calls do **not** show this overlay.
- **Background loading indicator:** When the overlay is not showing, the header tells the user that data is loading in the background. If the server may be asleep and a request takes over 1.2 seconds, it shows an amber "Server waking up · loading data in background". If a refresh of cached data (GET) takes over 0.7 seconds, it shows "Loading data in background". On mobile, the message replaces the subtitle under the centred title, with shorter wording for the waking state. On desktop, it appears as a pill on the left of the header. It is hidden while a screen is showing its first-load skeleton.
- **Section loaders:** Each feature reads from its Redux slice. Skeleton/loader shows only when that slice has **no cached data yet**. Revisiting a section — or reopening the app/PWA, since slices are cached in the browser — shows cached data immediately; `SectionDataSync` silently refetches in the background on navigation. A request interrupted by a reload is reset on startup so the screen fetches again.
- **Redux cache:** One slice per feature area (`customers`, `sales`, `dashboard`, etc.). Hooks in `frontend/src/features/*/use*.ts` dispatch slice thunks; `{ silent: true }` refetches skip loading state when data already exists.
- Sidebar navigation (desktop) and mobile-friendly lists, cards, and edge swipe. On desktop the sidebar stays fixed at full screen height while the page scrolls; it scrolls on its own only if the menu is taller than the screen.
- Theme selector (primary colour). Optional 3D background via `VITE_ENABLE_3D`.
- **Page background:** a gradient sits behind every page and does not move on scroll. The default **Royal** theme uses white to light grey; other themes blend their own card, background and primary colours. It never prints.
- **Night theme** turns on dark mode (the `.dark` class), so components with dark-mode styles switch to light text on dark backgrounds.
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
| `/activity` | Recent operational activity | All |
| `/users` | User management | Admin |
| `/recycle-bin` | Soft-deleted sales & purchase | Admin |
