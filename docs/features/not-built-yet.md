# Not built yet

Known gaps. Do not assume these exist in the UI or API.

- `LedgerEntry` table exists in Prisma but is unused (cash/bank use payment tables instead)
- Raw-material GST is not in the GST / GSTR-1 screens
- Purchase stock is not split by pipe size (only sales and adjustments are)

When one of these is implemented, move the behaviour into the matching feature file and remove it from this list.
