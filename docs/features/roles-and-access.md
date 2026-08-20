# Roles and access

**Frontend:** `frontend/src/lib/permissions.ts`, `frontend/src/features/auth/`  
**Backend:** `backend/src/middleware/auth.ts`, `backend/src/middleware/requireDeletePin.ts`  
**API:** [`../APIS.md`](../APIS.md) · **DB:** [`../DATABASE.md`](../DATABASE.md) (`User`, `Role`)

## Roles

| Role | Can do | Cannot do |
|------|--------|-----------|
| **ADMIN** | Full CRUD, user management, recycle bin, delete with PIN | Delete their own account if they are the last admin |
| **STAFF** | View everything, create and edit masters and vouchers | Delete customers/products/vendors, soft-delete invoices/bills, open Users or Recycle Bin |

## Deletion PIN

Delete and destructive edits of sales, purchase, and raw-material bills also require the **deletion PIN** (`DELETE_PIN` env, sent as `x-delete-pin` or body `pin`).

## Seeded accounts

- `admin` (ADMIN)
- `garvit` (STAFF)

Passwords live only in `backend/.env` (`ADMIN_SEED_PASSWORD`, `GARVIT_SEED_PASSWORD`).
