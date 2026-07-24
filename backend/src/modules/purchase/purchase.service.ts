import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { withBillPaymentSummary } from "../payments/payment.utils.js";
import type { createPurchaseBillSchema } from "./purchase.schema.js";
import type { z } from "zod";

export async function listPurchaseBills() {
  const bills = await prisma.purchaseBill.findMany({
    include: { vendor: true, items: true, payments: true },
    orderBy: { billDate: "desc" },
  });
  return bills.map(withBillPaymentSummary);
}

export async function getPurchaseBill(id: string) {
  const bill = await prisma.purchaseBill.findUnique({
    where: { id },
    include: {
      vendor: true,
      items: { include: { product: true } },
      payments: { orderBy: { paymentDate: "desc" } },
    },
  });
  if (!bill) {
    throw new ApiError(404, "Purchase bill not found");
  }
  return withBillPaymentSummary(bill);
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
    const rate =
      item.pricePerKg != null && item.pricePerKg > 0
        ? Math.round(item.pricePerKg * 1000 * 100) / 100
        : item.rate;
    const base = item.quantity * rate;
    return sum + base + (base * item.gstRate) / 100;
  }, 0);

  const billNo = await generateBillNo();

  return prisma.$transaction(async (tx) => {
    const bill = await tx.purchaseBill.create({
      data: {
        billNo,
        vendorId: data.vendorId,
        billDate: data.billDate ?? new Date(),
        transport: data.transport?.trim() || null,
        vehicleNo: data.vehicleNo?.trim() || null,
        totalAmount,
        items: {
          create: data.items.map((item) => {
            const pricePerKg =
              item.pricePerKg != null && item.pricePerKg > 0
                ? item.pricePerKg
                : null;
            const rate =
              pricePerKg != null ? Math.round(pricePerKg * 1000 * 100) / 100 : item.rate;
            const base = item.quantity * rate;
            return {
              productId: item.productId,
              quantity: item.quantity,
              pricePerKg,
              rate,
              gstRate: item.gstRate,
              amount: base + (base * item.gstRate) / 100,
            };
          }),
        },
      },
      include: { vendor: true, items: { include: { product: true } }, payments: true },
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

    return withBillPaymentSummary(bill);
  });
}

export async function deletePurchaseBill(id: string) {
  const bill = await getPurchaseBill(id);

  if ((bill.payments?.length ?? 0) > 0) {
    throw new ApiError(400, "Cannot delete bill with payments. Delete payments first.");
  }

  for (const item of bill.items) {
    if (Number(item.product.currentStock) < Number(item.quantity)) {
      throw new ApiError(
        400,
        `Cannot delete: insufficient current stock of ${item.product.name} to reverse this bill`
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const item of bill.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: Number(item.quantity) } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "OUT",
          quantity: item.quantity,
          reason: `Reversal of deleted purchase bill ${bill.billNo}`,
        },
      });
    }

    await tx.purchaseBill.delete({ where: { id } });
  });
}
