import type { Prisma } from "@prisma/client";
import { ApiError } from "../middleware/errorHandler.js";
import { isPipeSizeMm } from "./pipeSizes.js";

export async function applySizeStockDelta(
  tx: Prisma.TransactionClient,
  params: { productId: string; sizeMm: number; delta: number }
) {
  const { productId, sizeMm, delta } = params;
  if (!isPipeSizeMm(sizeMm)) {
    throw new ApiError(400, `Invalid size ${sizeMm}mm`);
  }

  const existing = await tx.productSizeStock.findUnique({
    where: { productId_sizeMm: { productId, sizeMm } },
  });
  const next = Number(existing?.quantity ?? 0) + delta;
  if (next < 0) {
    throw new ApiError(400, `Insufficient ${sizeMm}mm stock`);
  }

  if (existing) {
    await tx.productSizeStock.update({
      where: { id: existing.id },
      data: { quantity: next },
    });
    return;
  }

  await tx.productSizeStock.create({
    data: { productId, sizeMm, quantity: next },
  });
}
