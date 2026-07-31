import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { withPaymentSummary } from "../payments/payment.utils.js";
import type { createSalesInvoiceSchema } from "./sales.schema.js";
import type { z } from "zod";

type CreateItem = z.infer<typeof createSalesInvoiceSchema>["items"][number];

function isManualItem(item: CreateItem) {
  return !item.productId?.trim();
}

function lineAmount(quantity: number, rate: number, gstRate: number) {
  const base = quantity * rate;
  return base + (base * gstRate) / 100;
}

export async function listSalesInvoices() {
  const invoices = await prisma.salesInvoice.findMany({
    include: { customer: true, items: true, receipts: true },
    orderBy: { invoiceDate: "desc" },
  });
  return invoices.map(withPaymentSummary);
}

export async function getSalesInvoice(id: string) {
  const invoice = await prisma.salesInvoice.findUnique({
    where: { id },
    include: {
      customer: true,
      items: { include: { product: true } },
      receipts: { orderBy: { receiptDate: "desc" } },
    },
  });
  if (!invoice) {
    throw new ApiError(404, "Sales invoice not found");
  }
  return withPaymentSummary(invoice);
}

const INVOICE_NO_START = 1;
const COMPANY_CODE = "PNS";

/** Indian financial year runs Apr 1 -> Mar 31, e.g. July 2026 falls in FY 26-27. */
function currentFinancialYearLabel(date = new Date()) {
  const year = date.getFullYear();
  const isBeforeApril = date.getMonth() < 3; // Jan-Mar belongs to the FY that started the previous April
  const startYear = isBeforeApril ? year - 1 : year;
  const startYY = String(startYear % 100).padStart(2, "0");
  const endYY = String((startYear + 1) % 100).padStart(2, "0");
  return `${startYY}-${endYY}`;
}

function invoiceNoPrefix(date = new Date()) {
  return `${COMPANY_CODE}/${currentFinancialYearLabel(date)}/`;
}

export async function previewNextInvoiceNo() {
  return generateInvoiceNo();
}

async function generateInvoiceNo() {
  const prefix = invoiceNoPrefix();

  const invoices = await prisma.salesInvoice.findMany({
    where: { invoiceNo: { startsWith: prefix } },
    select: { invoiceNo: true },
  });

  const maxSeq = invoices.reduce((max, { invoiceNo }) => {
    const seq = Number(invoiceNo.slice(prefix.length));
    return Number.isFinite(seq) && seq > max ? seq : max;
  }, INVOICE_NO_START - 1);

  return `${prefix}${String(maxSeq + 1).padStart(2, "0")}`;
}

export async function createSalesInvoice(data: z.infer<typeof createSalesInvoiceSchema>) {
  const catalogItems = data.items.filter((item) => !isManualItem(item));
  const productIds = [...new Set(catalogItems.map((item) => item.productId!.trim()))];

  const products =
    productIds.length > 0
      ? await prisma.product.findMany({ where: { id: { in: productIds } } })
      : [];

  const productMap = new Map(products.map((product) => [product.id, product]));
  for (const item of catalogItems) {
    const productId = item.productId!.trim();
    const product = productMap.get(productId);
    if (!product) {
      throw new ApiError(400, `Product ${productId} not found`);
    }
    if (Number(product.currentStock) < item.quantity) {
      throw new ApiError(400, `Insufficient stock for ${product.name}`);
    }
  }

  const totalAmount = data.items.reduce(
    (sum, item) => sum + lineAmount(item.quantity, item.rate, item.gstRate),
    0
  );

  const invoiceNo = data.invoiceNo?.trim() || (await generateInvoiceNo());

  const existing = await prisma.salesInvoice.findUnique({ where: { invoiceNo } });
  if (existing) {
    throw new ApiError(409, `Invoice number ${invoiceNo} is already in use`);
  }

  return prisma.$transaction(async (tx) => {
    const invoice = await tx.salesInvoice.create({
      data: {
        invoiceNo,
        customerId: data.customerId,
        invoiceDate: data.invoiceDate ?? new Date(),
        transport: data.transport?.trim() || null,
        vehicleNo: data.vehicleNo?.trim() || null,
        totalAmount,
        items: {
          create: data.items.map((item) => {
            if (isManualItem(item)) {
              return {
                productId: null,
                description: item.description!.trim(),
                hsn: item.hsn?.trim() || null,
                unit: item.unit?.trim() || "NOS",
                sizeMm: null,
                quantity: item.quantity,
                rate: item.rate,
                gstRate: item.gstRate,
                amount: lineAmount(item.quantity, item.rate, item.gstRate),
              };
            }
            return {
              productId: item.productId!.trim(),
              description: null,
              hsn: null,
              unit: null,
              sizeMm: item.sizeMm != null && item.sizeMm > 0 ? item.sizeMm : null,
              quantity: item.quantity,
              rate: item.rate,
              gstRate: item.gstRate,
              amount: lineAmount(item.quantity, item.rate, item.gstRate),
            };
          }),
        },
      },
      include: { customer: true, items: { include: { product: true } } },
    });

    for (const item of catalogItems) {
      const productId = item.productId!.trim();
      await tx.product.update({
        where: { id: productId },
        data: { currentStock: { decrement: item.quantity } },
      });
      await tx.stockMovement.create({
        data: {
          productId,
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

  if ((invoice.receipts?.length ?? 0) > 0) {
    throw new ApiError(400, "Cannot delete invoice with receipts. Delete receipts first.");
  }

  await prisma.$transaction(async (tx) => {
    for (const item of invoice.items) {
      if (!item.productId) continue;
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
