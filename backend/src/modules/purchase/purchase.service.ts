import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/errorHandler.js";
import type { createPurchaseBillSchema } from "./purchase.schema.js";
import type { z } from "zod";

export function listPurchaseBills() {
  return prisma.purchaseBill.findMany({
    include: { vendor: true, items: true },
    orderBy: { billDate: "desc" },
  });
}

export async function getPurchaseBill(id: string) {
  const bill = await prisma.purchaseBill.findUnique({
    where: { id },
    include: { vendor: true, items: { include: { product: true } } },
  });
  if (!bill) {
    throw new ApiError(404, "Purchase bill not found");
  }
  return bill;
}

async function generateBillNo() {
  const count = await prisma.purchaseBill.count();
  const year = new Date().getFullYear();
  return `PB-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function createPurchaseBill(data: z.infer<typeof createPurchaseBillSchema>) {
  const products = await prisma.product.findMany({
    where: { id: { in: data.items.map((item) => item.productId) } },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));
  for (const item of data.items) {
    if (!productMap.has(item.productId)) {
      throw new ApiError(400, `Product ${item.productId} not found`);
    }
  }

  const totalAmount = data.items.reduce((sum, item) => {
    const base = item.quantity * item.rate;
    return sum + base + (base * item.gstRate) / 100;
  }, 0);

  const billNo = await generateBillNo();

  return prisma.$transaction(async (tx) => {
    const bill = await tx.purchaseBill.create({
      data: {
        billNo,
        vendorId: data.vendorId,
        billDate: data.billDate ?? new Date(),
        totalAmount,
        items: {
          create: data.items.map((item) => ({
            productId: item.productId,
            quantity: item.quantity,
            rate: item.rate,
            gstRate: item.gstRate,
            amount: item.quantity * item.rate + (item.quantity * item.rate * item.gstRate) / 100,
          })),
        },
      },
      include: { vendor: true, items: { include: { product: true } } },
    });

    for (const item of data.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { increment: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "IN",
          quantity: item.quantity,
          reason: `Purchase bill ${billNo}`,
        },
      });
    }

    return bill;
  });
}
