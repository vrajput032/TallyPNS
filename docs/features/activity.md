# Activity log

**Routes:** `/activity`  
**Frontend:** `frontend/src/features/activity/`  
**Backend:** `backend/src/modules/activity/`  
**API:** `GET /api/activity` · **DB:** `ActivityLog`

## Behaviour

- Feed of recent operational actions: sales, purchase, raw material, inventory adjustments, and payments (sales receipts, vendor payments, raw-material payments).
- Available to **ADMIN** and **STAFF** (not admin-only).
- Module filter chips: All / Sales / Purchase / Raw material / Inventory / Payments.
- Each row shows who, optional device, when, summary, and amount when relevant. Click opens the related invoice/bill/inventory page when `href` is set.
- Writes are fire-and-forget after a successful business action; a failed log write never blocks the bill/payment/stock request.
- Does **not** backfill history — only actions after the feature shipped are listed.
- Slack-created sales and raw-material bills appear with actor `Slack`.

## Device on login

Browsers cannot expose the phone’s personal name. On login (and token refresh) the SPA sends a short label such as `Chrome on Mac` or `Safari on iPhone`. That value is stored on the JWT (`deviceName`) and copied onto each new `ActivityLog` row.

Users must **log out and log in once** after this shipped so existing sessions pick up a device label.

## Screens

| Route | Who |
|-------|-----|
| `/activity` | All logged-in users |
