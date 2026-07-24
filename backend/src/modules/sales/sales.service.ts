import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/errorHandler.js";
import type { createSalesInvoiceSchema } from "./sales.schema.js";
import type { z } from "zod";

export function listSalesInvoices() {
  return prisma.salesInvoice.findMany({
    include: { customer: true, items: true },
    orderBy: { invoiceDate: "desc" },
  });
}

export async function getSalesInvoice(id: string) {
  const invoice = await prisma.salesInvoice.findUnique({
    where: { id },
    include: { customer: true, items: { include: { product: true } } },
  });
  if (!invoice) {
    throw new ApiError(404, "Sales invoice not found");
  }
  return invoice;
}

async function generateInvoiceNo() {
  const count = await prisma.salesInvoice.count();
  const year = new Date().getFullYear();
  return `INV-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function createSalesInvoice(data: z.infer<typeof createSalesInvoiceSchema>) {
  const products = await prisma.product.findMany({
    where: { id: { in: data.items.map((item) => item.productId) } },
  });

  const productMap = new Map(products.map((product) => [product.id, product]));
  for (const item of data.items) {
    const product = productMap.get(item.productId);
    if (!product) {
      throw new ApiError(400, `Product ${item.productId} not found`);
    }
    if (Number(product.currentStock) < item.quantity) {
      throw new ApiError(400, `Insufficient stock for ${product.name}`);
    }
  }

  const totalAmount = data.items.reduce((sum, item) => {
    const base = item.quantity * item.rate;
    return sum + base + (base * item.gstRate) / 100;
  }, 0);

  const invoiceNo = await generateInvoiceNo();

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.salesInvoice.create({
      data: {
        invoiceNo,
        customerId: data.customerId,
        invoiceDate: data.invoiceDate ?? new Date(),
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
      include: { customer: true, items: { include: { product: true } } },
    });

    for (const item of data.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "OUT",
          quantity: item.quantity,
          reason: `Sales invoice ${invoiceNo}`,
        },
      });
    }

    return invoice;
  });
}

export async function updateInvoiceNo(id: string, invoiceNo: string) {
  await getSalesInvoice(id);
  const existing = await prisma.salesInvoice.findUnique({ where: { invoiceNo } });
  if (existing && existing.id !== id) {
    throw new ApiError(409, `Invoice number ${invoiceNo} is already in use`);
  }
  return prisma.salesInvoice.update({
    where: { id },
    data: { invoiceNo },
    include: { customer: true, items: { include: { product: true } } },
  });
}

export async function deleteSalesInvoice(id: string) {
  const invoice = await getSalesInvoice(id);

  await prisma.$transaction(async (tx) => {
    for (const item of invoice.items) {
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { increment: Number(item.quantity) } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "IN",
          quantity: item.quantity,
          reason: `Reversal of deleted sales invoice ${invoice.invoiceNo}`,
        },
      });
    }

    await tx.salesInvoice.delete({ where: { id } });
  });
}
