import { prisma } from "../../lib/prisma.js";

const LOW_STOCK_THRESHOLD = 10;

export async function getDashboardSummary() {
  const [customerCount, productCount, products] = await Promise.all([
    prisma.customer.count(),
    prisma.product.count(),
    prisma.product.findMany({ select: { price: true, currentStock: true } }),
  ]);

  const stockValue = products.reduce(
    (sum, product) => sum + Number(product.price) * Number(product.currentStock),
    0
  );

  const lowStockCount = products.filter(
    (product) => Number(product.currentStock) <= LOW_STOCK_THRESHOLD
  ).length;

  return {
    customerCount,
    productCount,
    stockValue,
    lowStockCount,
  };
}
