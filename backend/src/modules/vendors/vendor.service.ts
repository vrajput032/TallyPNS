import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { scheduleSheetsSync } from "../sheets/sheets.sync.js";
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

export async function createVendor(data: z.infer<typeof createVendorSchema>) {
  const vendor = await prisma.vendor.create({ data });
  scheduleSheetsSync("vendor create");
  return vendor;
}

export async function updateVendor(id: string, data: z.infer<typeof updateVendorSchema>) {
  await getVendor(id);
  const vendor = await prisma.vendor.update({ where: { id }, data });
  scheduleSheetsSync("vendor update");
  return vendor;
}

export async function deleteVendor(id: string) {
  await getVendor(id);
  await prisma.vendor.delete({ where: { id } });
  scheduleSheetsSync("vendor delete");
}
