import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/errorHandler.js";
import type { createProductSchema, updateProductSchema } from "./product.schema.js";
import type { z } from "zod";

export function listProducts() {
  return prisma.product.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  return product;
}

export function createProduct(data: z.infer<typeof createProductSchema>) {
  return prisma.product.create({ data });
}

export async function updateProduct(id: string, data: z.infer<typeof updateProductSchema>) {
  await getProduct(id);
  return prisma.product.update({ where: { id }, data });
}

export async function deleteProduct(id: string) {
  await getProduct(id);
  await prisma.product.delete({ where: { id } });
}
