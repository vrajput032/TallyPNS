# PNS ERP — HTTP APIs

Express API mounted at **`/api`**. Health check is **not** under `/api`.

| Environment | Base |
|-------------|------|
| Local | `http://localhost:4000` |
| Production | `https://tallypns-api.onrender.com` |

SPA calls `{base}/api/...`. Health: `GET {base}/health`.

Related: [`features/`](./features/README.md) · [`DATABASE.md`](./DATABASE.md)

---

## Conventions

| Topic | Rule |
|-------|------|
| Auth | `Authorization: Bearer <accessToken>` on every route except login, refresh, and `/health` |
| JSON | `Content-Type: application/json` except raw-material PDF parse (`multipart/form-data`) |
| IDs | cuid strings |
| Decimals | Prisma decimals arrive as **strings** in JSON (`"1200.00"`) |
| Dates | ISO 8601; query dates parsed with `new Date(...)` |
| Success create | `201` + body |
| Success delete | `204` empty (some payment deletes return the parent bill instead) |
| Cache | API responses send `Cache-Control: no-store` |

### Errors

```json
{ "error": "Human-readable message" }
```

Zod validation:

```json
{ "error": "Validation failed", "issues": [ /* Zod issue objects */ ] }
```

| Status | When |
|--------|------|
| 400 | Validation, business rule (overpay, last admin, etc.) |
| 401 | Missing / invalid / expired JWT |
| 403 | Staff tried delete, wrong PIN, non-admin on admin routes |
| 404 | Record not found or soft-deleted (treated as missing) |
| 409 | Unique clash (invoice no, username, bill no) |
| 429 | Auth rate limit |
| 500 | Unhandled server error |

### Roles

| Middleware | Who |
|------------|-----|
| `requireAuth` | Any logged-in user |
| `requireAdmin` | `ADMIN` only |
| `requireCanDelete` | `ADMIN` only |
| `requireDeletePin` | Header `x-delete-pin` (or body `pin`) must match `DELETE_PIN` |

### Tokens

| Token | Lifetime | Secret |
|-------|----------|--------|
| Access | 12 hours | `JWT_SECRET` |
| Refresh | 30 days | `JWT_REFRESH_SECRET` |

Payload: `{ sub, username, email, role }`. Refresh is stored on `User.refreshToken`; reuse of an old refresh after rotation returns 401.

Login and register: **20 requests / 15 minutes / IP**.

---

## Health

### `GET /health`

No auth. Used by Render.

```json
{ "status": "ok", "release": "raw-material" }
```

---

## Auth — `/api/auth`

### `POST /auth/login`

No auth. Body:

```json
{ "username": "admin", "password": "********" }
```

`username` is trimmed, lowercased; 2–32 chars `[a-zA-Z0-9._-]`. Password min 6.

**201 is not used** — `200`:

```json
{
  "user": {
    "id": "...",
    "username": "admin",
    "email": "admin@pnsenterprises.com",
    "name": "Admin",
    "role": "ADMIN",
    "createdAt": "..."
  },
  "accessToken": "...",
  "refreshToken": "..."
}
```

### `POST /auth/refresh`

No auth. Body: `{ "refreshToken": "..." }`. Returns `{ "accessToken", "refreshToken" }`.

### `POST /auth/register`

Auth + **admin**. Rate-limited. Creates a **STAFF** user (role not in body).

```json
{ "username": "newuser", "email": "a@b.com", "password": "******", "name": "Name" }
```

Returns same shape as login (`user` + tokens). Prefer `POST /auth/users` for role control.

### `GET /auth/users`

Auth + **admin**. Array of public users (no password/hash).

### `POST /auth/users`

Auth + **admin**.

```json
{
  "username": "staff1",
  "password": "min8chars",
  "name": "Display",
  "role": "STAFF"
}
```

`role` is `ADMIN` or `STAFF`. Email auto-assigned. Returns public user. `201`.

### `DELETE /auth/users/:id`

Auth + **admin**. `204`. Cannot delete self or last admin.

---

## Dashboard — `/api/dashboard`

All require auth.

### `GET /dashboard/summary`

```json
{
  "customerCount": 0,
  "productCount": 0,
  "stockValue": 0,
  "stockBySize": [{ "sizeMm": 95, "quantity": 0 }],
  "lowStockCount": 0,
  "totalSales": 0,
  "rawMaterial": {
    "totalBilled": 0,
    "totalPaid": 0,
    "balance": 0,
    "billCount": 0
  }
}
```

`lowStockCount` = products with `currentStock ≤ 10`. `stockBySize` always includes 95, 110, 90, 55, 45.

### `GET /dashboard/sales/monthly`

From July 2026 through the current month:

```json
[{ "month": "Jul 26", "total": 0 }]
```

### `GET /dashboard/sales/by-customer`

```json
[{ "customer": "Name", "total": 0 }]
```

Sorted by total descending. Active invoices only.

---

## Customers — `/api/customers`

Auth on all. Delete: **admin**.

| Method | Path | Body | Status |
|--------|------|------|--------|
| GET | `/customers` | — | 200 list |
| GET | `/customers/:id` | — | 200 |
| POST | `/customers` | create | 201 |
| PUT | `/customers/:id` | partial update | 200 |
| DELETE | `/customers/:id` | — | 204 |

Create body:

```json
{
  "name": "Acme",
  "phone": "",
  "email": "",
  "gstin": "",
  "address": "",
  "openingBalance": 0
}
```

`name` required. `email` optional or `""`. `openingBalance` default 0.

---

## Vendors — `/api/vendors`

Same verbs and body as customers (`/vendors`).

---

## Products — `/api/products`

Same verbs. Delete: **admin**.

Create body:

```json
{
  "name": "MS Pipe",
  "hsn": "7306",
  "gstRate": 18,
  "unit": "PCS",
  "price": 0,
  "openingStock": 0,
  "currentStock": 0
}
```

All numeric fields default to 0; `unit` defaults to `PCS`.

---

## Sales — `/api/sales`

Auth on all. Soft-delete / restore / permanent: **admin**. Edit, delete, permanent: **PIN**.

### `GET /sales`

Active invoices (newest first typically), each with customer, items, receipts, plus `paidAmount`, `balanceAmount`, `paymentStatus`.

### `GET /sales/next-invoice-no`

```json
{ "invoiceNo": "PNS/26-27/1" }
```

Must be registered **before** `GET /sales/:id`.

### `GET /sales/:id`

One invoice including relations and payment summary. Soft-deleted → 404 unless loaded via recycle-bin list.

### `POST /sales`

```json
{
  "customerId": "clxx...",
  "invoiceNo": "PNS/26-27/1",
  "invoiceDate": "2026-08-20",
  "transport": "Self",
  "vehicleNo": "HR10...",
  "items": [
    {
      "productId": "clxx...",
      "sizeMm": 95,
      "quantity": 10,
      "rate": 100,
      "gstRate": 18
    },
    {
      "description": "Scrap",
      "hsn": "7204",
      "unit": "KGS",
      "quantity": 1,
      "rate": 50,
      "gstRate": 18
    }
  ]
}
```

- `invoiceNo` optional (auto if omitted)
- Each line needs **either** `productId` **or** `description`
- Catalog `sizeMm` must be 95, 110, 90, 55, or 45
- Creates stock OUT for catalog lines

`201`. Duplicate `invoiceNo` → `409`.

### `PUT /sales/:id`

Same body as create. Header `x-delete-pin`. Reverses old stock, applies new lines.

### `DELETE /sales/:id`

Admin + PIN. Soft-delete, reverse stock. `204`.

### `POST /sales/:id/restore`

Admin. Restore from recycle bin, re-apply stock. `204`.

### `DELETE /sales/:id/permanent`

Admin + PIN. Hard delete (must already be in recycle bin). `204`.

---

## Purchase — `/api/purchase`

Auth on all. Same PIN / admin pattern as sales.

| Method | Path | Notes |
|--------|------|--------|
| GET | `/purchase` | Active bills + payment summary |
| GET | `/purchase/:id` | |
| POST | `/purchase` | Auto `billNo` `PB-{year}-{seq}` |
| PUT | `/purchase/:id` | PIN |
| DELETE | `/purchase/:id` | Admin + PIN, soft |
| POST | `/purchase/:id/restore` | Admin |
| DELETE | `/purchase/:id/permanent` | Admin + PIN |

Create body:

```json
{
  "vendorId": "clxx...",
  "billDate": "2026-08-20",
  "transport": "",
  "vehicleNo": "",
  "items": [
    {
      "productId": "clxx...",
      "quantity": 1.5,
      "pricePerKg": 52.5,
      "rate": 52500,
      "gstRate": 18
    }
  ]
}
```

If `pricePerKg` > 0, `rate` is stored as `pricePerKg × 1000`. Stock IN on create; reversed on soft-delete.

---

## Inventory — `/api/inventory`

Auth on all.

### `GET /inventory/stock`

Products with `currentStock` and `sizeStocks[]` (`sizeMm`, `quantity`).

### `GET /inventory/movements?productId=`

Optional `productId`. Movements with product `{ id, name, unit }`.

### `POST /inventory/adjustments`

```json
{
  "productId": "clxx...",
  "quantity": -5,
  "sizeMm": 95,
  "reason": "Physical count"
}
```

`quantity` ≠ 0. `sizeMm` must be a catalog size. Positive = IN to that size; negative = OUT. `201` + movement row.

---

## Raw material — `/api/raw-material`

Auth on all. Update/delete: PIN. Delete: **admin**.

### `GET /raw-material`

Active bills with items, payments, `paidAmount`, `balanceAmount`, `paymentStatus`, `yield`.

### `GET /raw-material/:id`

Same, one bill. Soft-deleted → 404.

### `POST /raw-material/parse`

`multipart/form-data` field **`file`**: PDF, max 8 MB.

Returns parsed fields plus `sourceFileName` and `warnings[]` (bill no, supplier, GSTIN, date, vehicle, destination, amounts, items). Does **not** save.

### `POST /raw-material`

```json
{
  "billNo": "INV-001",
  "supplierName": "Steel Co",
  "supplierGstin": "06AAAAA0000A1Z5",
  "billDate": "2026-08-01",
  "vehicleNo": "",
  "destination": "Sonipat",
  "taxableAmount": 10000,
  "cgstAmount": 900,
  "sgstAmount": 900,
  "igstAmount": 0,
  "roundOff": 0,
  "totalAmount": 11800,
  "notes": "",
  "sourceFileName": "bill.pdf",
  "items": [
    {
      "description": "MS Tube",
      "hsn": "7306",
      "quantityKg": 100,
      "ratePerKg": 100,
      "amount": 10000
    }
  ]
}
```

`totalAmount` must be > 0. Duplicate `billNo` → `409`. `201`.

### `PUT /raw-material/:id`

Same body. PIN required.

### `DELETE /raw-material/:id`

Admin + PIN. Soft-delete. `204`.

### `POST /raw-material/:id/payments`

```json
{
  "amount": 5000,
  "mode": "BANK",
  "reference": "UTR",
  "paymentDate": "2026-08-20",
  "narration": ""
}
```

`201` + **full bill** (with summary). Amount cannot exceed balance.

### `PUT /raw-material/payments/:paymentId`

Same payment body. Returns updated bill.

### `DELETE /raw-material/payments/:paymentId`

Returns updated bill (not 204).

---

## Payments — `/api/payments`

Auth on all. Delete receipts/payments: **admin**.

### `POST /payments/receipts`

```json
{
  "salesInvoiceId": "clxx...",
  "amount": 1000,
  "mode": "CASH",
  "reference": null,
  "receiptDate": "2026-08-20",
  "narration": null
}
```

`201` + receipt (customer + invoice no). Fails if invoice deleted, already PAID, or amount > balance.

### `DELETE /payments/receipts/:id`

Admin. `204`.

### `POST /payments/vendor-payments`

Same shape with `purchaseBillId` and `paymentDate` instead of receipt fields. `201`.

### `DELETE /payments/vendor-payments/:id`

Admin. `204`.

### `GET /payments/outstanding`

```json
{
  "debtors": [{ "id": "...", "name": "...", "openingBalance": 0, "balance": 0 }],
  "creditors": [],
  "totalDebtors": 0,
  "totalCreditors": 0
}
```

---

## Cash and bank

### `GET /api/cash`

Auth. Cash book:

```json
{
  "mode": "CASH",
  "entries": [
    {
      "id": "...",
      "kind": "IN",
      "voucherNo": "RCP-10001",
      "date": "...",
      "party": "Customer",
      "against": "PNS/26-27/1",
      "amount": 1000,
      "reference": null,
      "narration": null,
      "source": "receipt"
    }
  ],
  "totalIn": 0,
  "totalOut": 0,
  "closingBalance": 0
}
```

`kind` is `IN` (receipt) or `OUT` (vendor payment). `source` is `receipt` or `payment`.

### `GET /api/bank`

Same object with `"mode": "BANK"`.

Raw-material payments are **not** in these books.

---

## GST — `/api/gst`

Auth. Query: `month` (1–12), `year` (2000–2100). Omit both → current calendar month.

### `GET /gst/summary?month=8&year=2026`

```json
{
  "period": {
    "year": 2026,
    "month": 8,
    "monthLabel": "August 2026",
    "from": "2026-08-01",
    "to": "2026-08-31",
    "filingWindowFrom": "2026-09-01",
    "filingDueDate": "2026-09-11",
    "filingNote": "...",
    "filingStatus": "upcoming"
  },
  "outputGst": [{ "gstRate": 18, "taxableAmount": 0, "cgst": 0, "sgst": 0, "totalTax": 0 }],
  "inputGst": [],
  "totalOutputTax": 0,
  "totalInputTax": 0,
  "totalTaxableSales": 0,
  "netPayable": 0,
  "salesVoucherCount": 0,
  "purchaseVoucherCount": 0,
  "gstr1Vouchers": [
    {
      "id": "...",
      "date": "2026-08-01",
      "particulars": "Customer",
      "vchType": "Sales",
      "vchNo": "PNS/26-27/1",
      "taxableAmount": 0,
      "taxAmount": 0,
      "invoiceAmount": 0
    }
  ],
  "purchaseVouchers": []
}
```

`filingStatus`: `upcoming` | `open` | `overdue`. Catalog sales + catalog purchase only.

### `GET /gst/gstr1-json?month=&year=&download=`

Without `download`: `{ "filename": "...", "payload": { ... Tally GSTR-1 JSON ... }, "skipped": [] }`.

With `download=1` or `true`: attachment (`Content-Disposition`) of the JSON payload.

---

## Reports — `/api/reports`

Auth.

### `GET /reports/profit-loss?from=&to=`

Optional ISO dates.

```json
{
  "totalSales": 0,
  "totalPurchases": 0,
  "grossProfit": 0,
  "salesCount": 0,
  "purchaseCount": 0
}
```

Active vouchers only. Raw material excluded.

### `GET /reports/stock`

```json
{
  "rows": [
    {
      "id": "...",
      "name": "...",
      "hsn": null,
      "unit": "PCS",
      "price": "0",
      "currentStock": "0",
      "stockValue": 0
    }
  ],
  "totalStockValue": 0
}
```

### `GET /reports/balance-sheet?asOn=`

```json
{
  "asOn": "...",
  "assets": [
    { "name": "Cash-in-Hand", "amount": 0 },
    { "name": "Bank Accounts", "amount": 0 },
    { "name": "Sundry Debtors", "amount": 0 },
    { "name": "Stock-in-Hand", "amount": 0 }
  ],
  "liabilities": [
    { "name": "Sundry Creditors", "amount": 0 },
    { "name": "Capital Account", "amount": 0 }
  ],
  "totalAssets": 0,
  "totalLiabilities": 0,
  "notes": { "totalSales": 0, "totalPurchases": 0, "grossProfit": 0 }
}
```

### `GET /reports/trial-balance?asOn=`

Debit/credit rows built from the same cash, bank, debtors, stock, sales, purchase, creditors, and capital figures.

---

## Recycle bin — `/api/recycle-bin`

Auth + **admin**.

### `GET /recycle-bin`

```json
{
  "sales": [ /* deleted sales invoices */ ],
  "purchase": [ /* deleted purchase bills */ ]
}
```

Restore and permanent delete use the sales/purchase routes above. Raw-material deleted bills are not listed here.

---

## Route index

| Prefix | Module |
|--------|--------|
| `/health` | Liveness |
| `/api/auth` | Login, users |
| `/api/dashboard` | Home stats |
| `/api/customers` | Customer CRUD |
| `/api/products` | Product CRUD |
| `/api/vendors` | Vendor CRUD |
| `/api/sales` | Invoices + recycle |
| `/api/purchase` | Bills + recycle |
| `/api/inventory` | Stock + adjustments |
| `/api/raw-material` | Steel bills + PDF parse |
| `/api/payments` | Receipts, vendor pay, outstanding |
| `/api/cash` | Cash book |
| `/api/bank` | Bank book |
| `/api/gst` | Summary + GSTR-1 JSON |
| `/api/reports` | P&L, stock, BS, TB |
| `/api/recycle-bin` | Admin deleted list |

Frontend client: `frontend/src/lib/api.ts` (Axios + refresh interceptor). Production API URL is locked in `frontend/.env.production`, `scripts/deploy.sh`, and `frontend/src/lib/apiBaseUrl.ts`.
