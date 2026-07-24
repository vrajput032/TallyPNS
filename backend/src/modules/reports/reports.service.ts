import { prisma } from "../../lib/prisma.js";

export async function getProfitAndLoss(from?: Date, to?: Date) {
  const dateFilter = from || to ? { gte: from, lte: to } : undefined;

  const [salesInvoices, purchaseBills] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: dateFilter ? { invoiceDate: dateFilter } : undefined,
      select: { totalAmount: true },
    }),
    prisma.purchaseBill.findMany({
      where: dateFilter ? { billDate: dateFilter } : undefined,
      select: { totalAmount: true },
    }),
  ]);

  const totalSales = salesInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
  const totalPurchases = purchaseBills.reduce((sum, bill) => sum + Number(bill.totalAmount), 0);

  return {
    totalSales,
    totalPurchases,
    grossProfit: totalSales - totalPurchases,
    salesCount: salesInvoices.length,
    purchaseCount: purchaseBills.length,
  };
}

export async function getStockReport() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      hsn: true,
      unit: true,
      price: true,
      currentStock: true,
    },
  });

  const rows = products.map((product) => ({
    ...product,
    stockValue: Number(product.price) * Number(product.currentStock),
  }));

  const totalStockValue = rows.reduce((sum, row) => sum + row.stockValue, 0);

  return { rows, totalStockValue };
}
