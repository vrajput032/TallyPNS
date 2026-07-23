import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/errorHandler.js";
import type { createCustomerSchema, updateCustomerSchema } from "./customer.schema.js";
import type { z } from "zod";

export function listCustomers() {
  return prisma.customer.findMany({ orderBy: { createdAt: "desc" } });
}

export async function getCustomer(id: string) {
  const customer = await prisma.customer.findUnique({ where: { id } });
  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }
  return customer;
}

export function createCustomer(data: z.infer<typeof createCustomerSchema>) {
  return prisma.customer.create({ data });
}

export async function updateCustomer(id: string, data: z.infer<typeof updateCustomerSchema>) {
  await getCustomer(id);
  return prisma.customer.update({ where: { id }, data });
}

export async function deleteCustomer(id: string) {
  await getCustomer(id);
  await prisma.customer.delete({ where: { id } });
}
