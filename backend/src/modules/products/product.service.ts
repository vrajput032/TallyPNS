import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/errorHandler.js";
import {
  deleteObject,
  PRODUCT_BUCKET,
  publicObjectUrl,
  uploadObject,
} from "../../lib/storage.js";
import type { createProductSchema, updateProductSchema } from "./product.schema.js";
import type { z } from "zod";

function withImageUrl<T extends { imagePath?: string | null }>(product: T) {
  return {
    ...product,
    imageUrl: product.imagePath ? publicObjectUrl(PRODUCT_BUCKET, product.imagePath) : null,
  };
}

export async function listProducts() {
  const products = await prisma.product.findMany({ orderBy: { createdAt: "desc" } });
  return products.map(withImageUrl);
}

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  return withImageUrl(product);
}

export async function createProduct(data: z.infer<typeof createProductSchema>) {
  const product = await prisma.product.create({ data });
  return withImageUrl(product);
}

export async function updateProduct(id: string, data: z.infer<typeof updateProductSchema>) {
  await getProduct(id);
  const product = await prisma.product.update({ where: { id }, data });
  return withImageUrl(product);
}

export async function deleteProduct(id: string) {
  const product = await getProduct(id);
  if (product.imagePath) {
    await deleteObject(PRODUCT_BUCKET, product.imagePath);
  }
  await prisma.product.delete({ where: { id } });
}

export async function setProductImage(productId: string, file: Express.Multer.File) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }

  const ext = file.originalname.includes(".")
    ? file.originalname.slice(file.originalname.lastIndexOf(".")).slice(0, 8)
    : "";
  const storagePath = `${productId}/image${ext || ".jpg"}`;
  const mimeType = file.mimetype || "image/jpeg";

  if (product.imagePath && product.imagePath !== storagePath) {
    await deleteObject(PRODUCT_BUCKET, product.imagePath);
  }

  await uploadObject({
    bucket: PRODUCT_BUCKET,
    path: storagePath,
    buffer: file.buffer,
    mimeType,
  });

  const updated = await prisma.product.update({
    where: { id: productId },
    data: { imagePath: storagePath, imageMime: mimeType },
  });

  return withImageUrl(updated);
}

export async function clearProductImage(productId: string) {
  const product = await prisma.product.findUnique({ where: { id: productId } });
  if (!product) {
    throw new ApiError(404, "Product not found");
  }
  if (product.imagePath) {
    await deleteObject(PRODUCT_BUCKET, product.imagePath);
  }
  const updated = await prisma.product.update({
    where: { id: productId },
    data: { imagePath: null, imageMime: null },
  });
  return withImageUrl(updated);
}
