# Dashboard

**Routes:** `/`  
**Frontend:** `frontend/src/features/dashboard/`  
**Backend:** `backend/src/modules/dashboard/`  
**API:** `GET /api/dashboard/summary`, `/sales/monthly`, `/sales/by-customer`

Home summary for the business (charts from July 2026 onwards):

- Customer count, product count, total sales, stock value
- **Current pieces** — stock on hand by pipe size (95 / 110 / 90 / 55 / 85 / 70 / 82 mm)
- Low-stock count (product `currentStock` ≤ 10)
- Raw-material billed vs paid vs balance
- **Trading Profit & Loss** — pipe trading invoices vs Trading purchase bills
- **Raw Material Trading** — raw-material trading invoices: sold (₹ and kg), bought (kg × the ₹/kg saved on each invoice, plus GST), GST payable, profit before GST, and a month table. PNS Sales excludes both trading types.
- Monthly sales chart
- Sales by customer chart
- Quick jump to sales / inventory
