# Recycle bin (admin)

**Routes:** `/recycle-bin`  
**Frontend:** `frontend/src/features/recycle-bin/`  
**Backend:** `backend/src/modules/recycle-bin/` plus restore/permanent routes on sales and purchase  
**API:** `GET /api/recycle-bin`, `POST /api/sales/:id/restore`, `DELETE /api/sales/:id/permanent` (same for purchase)

Soft-deleted **sales invoices** and **purchase bills**.

- Restore → stock is put back as if the voucher were live again
- Permanent delete → PIN required; stock already reversed at soft-delete time is not reversed again

Raw-material bills use `deletedAt` but are not shown here.
