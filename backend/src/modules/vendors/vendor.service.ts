import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/errorHandler.js";
import type { createVendorSchema, updateVendorSchema } from "./vendor.schema.js";
import type { z } from "zod";

export function listVendors() {
  return prisma.vendor.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getVendor(id: string) {
  const vendor = await prisma.vendor.findUnique({ where: { id } });
  if (!vendor) {
    throw new ApiError(404, "Vendor not found");
  }
  return vendor;
}

export function createVendor(data: z.infer<typeof createVendorSchema>) {
  return prisma.vendor.create({ data });
}

export async function updateVendor(id: string, data: z.infer<typeof updateVendorSchema>) {
  await getVendor(id);
  return prisma.vendor.update({ where: { id }, data });
}

export async function deleteVendor(id: string) {
  await getVendor(id);
  await prisma.vendor.delete({ where: { id } });
}
