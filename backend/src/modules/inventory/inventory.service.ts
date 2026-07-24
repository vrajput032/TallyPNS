import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/errorHandler.js";
import type { createAdjustmentSchema } from "./inventory.schema.js";
import type { z } from "zod";

export function listStock() {
  return prisma.product.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      hsn: true,
      unit: true,
      price: true,
      openingStock: true,
      currentStock: true,
    },
  });
}

export function listStockMovements(productId?: string) {
  return prisma.stockMovement.findMany({
    where: productId ? { productId } : undefined,
    include: { product: { select: { id: true, name: true, unit: true } } },
    orderBy: { createdAt: "desc" },
  });
}

export async function createAdjustment(data: z.infer<typeof createAdjustmentSchema>) {
  const product = await prisma.product.findUnique({ where: { id: data.productId } });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const newStock = Number(product.currentStock) + data.quantity;
  if (newStock < 0) {
    throw new ApiError(400, "Adjustment would result in negative stock");
  }

  return prisma.$transaction(async (tx) => {
    await tx.product.update({
      where: { id: data.productId },
      data: { currentStock: newStock },
    });

    return tx.stockMovement.create({
      data: {
        productId: data.productId,
        type: "ADJUSTMENT",
        quantity: data.quantity,
        reason: data.reason,
      },
      include: { product: { select: { id: true, name: true, unit: true } } },
    });
  });
}
