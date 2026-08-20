# Dashboard

**Routes:** `/`  
**Frontend:** `frontend/src/features/dashboard/`  
**Backend:** `backend/src/modules/dashboard/`  
**API:** `GET /api/dashboard/summary`, `/sales/monthly`, `/sales/by-customer`

Home summary for the business (charts from July 2026 onwards):

- Customer count, product count, total sales, stock value
- Stock by pipe size (95 / 110 / 90 / 55 / 45 mm)
- Low-stock count (product `currentStock` ≤ 10)
- Raw-material billed vs paid vs balance
- Monthly sales chart
- Sales by customer chart
- Quick jump to sales / inventory
