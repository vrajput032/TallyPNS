import { prisma } from "../../lib/prisma.js";
import { activeOnly } from "../../lib/activeRecords.js";
import { ApiError } from "../../middleware/errorHandler.js";
import type { createCustomerSchema, updateCustomerSchema } from "./customer.schema.js";
import type { z } from "zod";

export async function listCustomers() {
  const customers = await prisma.customer.findMany({
    include: {
      salesInvoices: { where: activeOnly, select: { totalAmount: true } },
      receipts: { select: { amount: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  return customers.map(({ salesInvoices, receipts, ...customer }) => {
    const openingBalance = Number(customer.openingBalance);
    const totalBilled = salesInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
    const totalPaid = receipts.reduce((sum, r) => sum + Number(r.amount), 0);
    const balance = Math.round((openingBalance + totalBilled - totalPaid) * 100) / 100;

    return {
      ...customer,
      totalBilled: Math.round(totalBilled * 100) / 100,
      totalPaid: Math.round(totalPaid * 100) / 100,
      balanceAmount: balance,
    };
  });
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
