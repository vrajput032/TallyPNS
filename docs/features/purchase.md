# Purchase bills

**Routes:** `/purchase`, `/purchase/new`, `/purchase/:id`, `/purchase/:id/edit`, `/purchase/running-costs/edit`  
**Frontend:** `frontend/src/features/purchase/`  
**Backend:** `backend/src/modules/purchase/`  
**API:** `/api/purchase` · **DB:** `PurchaseBill`, `PurchaseBillItem`, `PurchaseAttachment`, `VendorPayment`, `RunningCostOverride`

Supplier bills that are **not** pipe stock and **not** customers. The list has three tabs (`/purchase?tab=`), stored as `PurchaseBill.kind`:

| Tab | `kind` | What goes here |
|-----|--------|----------------|
| Equipment | `EQUIPMENT` (legacy `CATALOG` shown here too) | Machines and equipment (CNC, Traub, caliper, …) |
| Trading | `TRADING` | Goods bought to resell as-is; no pipe stock change |
| Running cost | `RUNNING_COST` | Extra monthly factory expenses (diesel, maintenance, …) |

- Pipe / catalog stock is **not** entered here (use Inventory adjustments and Raw material)
- Parties are **suppliers (vendors)**, never customers
- Auto bill number: `PB-{year}-{seq}`
- Lines: free-text description, qty, rate, GST
- Optional title, supplier invoice number and notes
- **Attachments:** PDF or image (JPG/PNG/WEBP), max 10 MB, Supabase Storage `pns-purchase`
- **Payments:** vendor payments (cash or bank)
- Edit/delete: PIN; delete is admin + PIN. Does not change pipe stock for new bills
- New bill button opens `/purchase/new?kind=<tab>`

## Running cost tab

Month-by-month cards (newest open first) with In P&L / Entries / Total at the top.

- **Counted in Profit & Loss** — the factory P&L cost lines except raw material: Thekedar, Rent, Electricity, Akshay salary, Delivery (kiraya), Other factory expenses. Default amounts come from `backend/src/lib/manufacturingPnl.ts` (rent and salary ₹20,000, thekedar ₹1.5 × pieces sold) and the partner-expenses feed.
- **Running cost entries** — `RUNNING_COST` purchase bills in that month. These are **not** added to P&L.
- Every row has **edit** and **delete** icons (delete only for admins):
  - P&L line → edit opens the edit page for that line and month; delete (PIN) saves ₹0 for that month and hides the row.
  - Entry → edit opens `/purchase/:id/edit`; delete (admin + PIN) moves the bill to the recycle bin.
- Lines with a saved amount show an **Edited** tag.

### Edit running cost page (`/purchase/running-costs/edit`)

Opened from **Edit running costs** on the tab or from a row's edit icon (`?line=&from=&to=` pre-fills).

- Pick the expense, **From month**, **To month** (both included, July 2026 onwards, max 36 months) and the amount per month.
- Preview table shows each month's current amount and the new one; future months show "Upcoming".
- **Save** (Edit PIN) stores the amount for every month in the range in `RunningCostOverride`. Running cost and Profit & Loss both use it instead of the default.
- **Reset to default** (PIN) deletes saved amounts in the range so the default is used again.
- For Thekedar, a saved amount replaces the per-piece calculation for those months.
