# Cross-cutting behaviour

Shared rules that apply across modules. Update this file if numbering, GST math, stock, or print behaviour changes.

| Behaviour | Detail |
|-----------|--------|
| Document numbers | Sales `PNS/{FY}/n`, purchase `PB-YYYY-nnnn`, receipts `RCP-`, vendor payments `PAY-`, RM payments `RMP-` |
| GST on lines | `amount = qty × rate × (1 + gstRate/100)` for sales/purchase |
| Stock | Sales catalog lines OUT by size; purchase IN to product total; adjustments by size |
| Soft delete | Sales and purchase (and raw-material bills); lists use `deletedAt IS NULL` |
| Print | GST tax invoice / purchase bill with company, HSN, CGST/SGST, amount in words |
| Mobile | Card layouts, search, PIN confirm dialog for destructive actions |
| Auth rate limit | Login/register: 20 attempts / 15 minutes per IP |
