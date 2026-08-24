import { prisma } from "../../lib/prisma.js";
import { activeOnly, deletedOnly } from "../../lib/activeRecords.js";
import { ApiError } from "../../middleware/errorHandler.js";
import {
  deleteObject,
  publicObjectUrl,
  PURCHASE_BUCKET,
  uploadObject,
} from "../../lib/storage.js";
import { withBillPaymentSummary } from "../payments/payment.utils.js";
import { rateFromPricePerKg, type createPurchaseBillSchema } from "./purchase.schema.js";
import type { z } from "zod";

const billInclude = {
  vendor: true,
  items: { include: { product: true } },
  payments: { orderBy: { paymentDate: "desc" as const } },
  attachments: { orderBy: { createdAt: "desc" as const } },
};

type BillInput = z.infer<typeof createPurchaseBillSchema>;
type BillItemInput = BillInput["items"][number];

function catalogProductId(item: { productId?: string | null }) {
  const id = item.productId?.trim();
  return id || null;
}

function lineDescription(item: BillItemInput) {
  return item.description?.trim() || null;
}

function lineRate(item: BillItemInput) {
  return item.pricePerKg != null && item.pricePerKg > 0
    ? rateFromPricePerKg(item.pricePerKg)
    : item.rate;
}

function lineAmount(item: BillItemInput) {
  const rate = lineRate(item);
  const base = item.quantity * rate;
  return base + (base * item.gstRate) / 100;
}

function mapItemCreate(item: BillItemInput) {
  const pricePerKg = item.pricePerKg != null && item.pricePerKg > 0 ? item.pricePerKg : null;
  const rate = pricePerKg != null ? rateFromPricePerKg(pricePerKg) : item.rate;
  const base = item.quantity * rate;
  return {
    productId: catalogProductId(item),
    description: lineDescription(item),
    quantity: item.quantity,
    pricePerKg,
    rate,
    gstRate: item.gstRate,
    amount: base + (base * item.gstRate) / 100,
  };
}

function withAttachmentUrls<T extends { attachments?: { storagePath: string }[] | null }>(bill: T) {
  if (!bill.attachments?.length) return bill;
  return {
    ...bill,
    attachments: bill.attachments.map((a) => ({
      ...a,
      url: publicObjectUrl(PURCHASE_BUCKET, a.storagePath),
    })),
  };
}

function presentBill<T extends Parameters<typeof withBillPaymentSummary>[0] & {
  attachments?: { storagePath: string }[] | null;
}>(bill: T) {
  return withAttachmentUrls(withBillPaymentSummary(bill));
}

async function assertCatalogProducts(items: BillItemInput[]) {
  const productIds = [
    ...new Set(items.map((item) => catalogProductId(item)).filter((id): id is string => Boolean(id))),
  ];
  if (productIds.length === 0) return new Map<string, { id: string; name: string; currentStock: unknown }>();

  const products = await prisma.product.findMany({ where: { id: { in: productIds } } });
  const productMap = new Map(products.map((product) => [product.id, product]));
  for (const id of productIds) {
    if (!productMap.has(id)) {
      throw new ApiError(400, `Product ${id} not found`);
    }
  }
  return productMap;
}

export async function listPurchaseBills() {
  const bills = await prisma.purchaseBill.findMany({
    where: activeOnly,
    include: {
      vendor: true,
      items: true,
      payments: true,
      attachments: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { billDate: "desc" },
  });
  return bills.map(presentBill);
}

export async function listDeletedPurchaseBills() {
  const bills = await prisma.purchaseBill.findMany({
    where: deletedOnly,
    include: {
      vendor: true,
      items: true,
      payments: true,
      attachments: { orderBy: { createdAt: "desc" } },
    },
    orderBy: { deletedAt: "desc" },
  });
  return bills.map(presentBill);
}

export async function getPurchaseBill(id: string, options?: { includeDeleted?: boolean }) {
  const bill = await prisma.purchaseBill.findUnique({
    where: { id },
    include: billInclude,
  });
  if (!bill) {
    throw new ApiError(404, "Purchase bill not found");
  }
  if (!options?.includeDeleted && bill.deletedAt) {
    throw new ApiError(404, "Purchase bill not found");
  }
  return presentBill(bill);
}

async function generateBillNo() {
  const count = await prisma.purchaseBill.count();
  const year = new Date().getFullYear();
  return `PB-${year}-${String(count + 1).padStart(4, "0")}`;
}

export async function createPurchaseBill(data: BillInput) {
  await assertCatalogProducts(data.items);
  const totalAmount = data.items.reduce((sum, item) => sum + lineAmount(item), 0);
  const billNo = await generateBillNo();

  return prisma.$transaction(async (tx) => {
    const bill = await tx.purchaseBill.create({
      data: {
        billNo,
        vendorId: data.vendorId?.trim() || null,
        kind: "EQUIPMENT",
        billDate: data.billDate ?? new Date(),
        transport: data.transport?.trim() || null,
        vehicleNo: data.vehicleNo?.trim() || null,
        supplierInvoiceNo: data.supplierInvoiceNo?.trim() || null,
        supplierGstin: data.supplierGstin?.trim() || null,
        notes: data.notes?.trim() || null,
        totalAmount,
        items: {
          create: data.items.map((item) => ({
            ...mapItemCreate(item),
            productId: null,
          })),
        },
      },
      include: billInclude,
    });

    return presentBill(bill);
  });
}

/** Full edit of an existing bill: reverses old stock effects, validates and applies new ones. */
export async function updatePurchaseBill(id: string, data: BillInput) {
  const existingBill = await prisma.purchaseBill.findUnique({
    where: { id },
    include: { items: true, payments: true },
  });
  if (!existingBill || existingBill.deletedAt) {
    throw new ApiError(404, "Purchase bill not found");
  }
  if ((existingBill.payments?.length ?? 0) > 0) {
    throw new ApiError(400, "Cannot edit bill with payments. Delete payments first.");
  }

  const productMap = await assertCatalogProducts(
    existingBill.items.map((item) => ({
      productId: item.productId,
      description: item.description,
      quantity: Number(item.quantity),
      rate: Number(item.rate),
      gstRate: Number(item.gstRate),
      pricePerKg: item.pricePerKg != null ? Number(item.pricePerKg) : null,
    }))
  );

  const availableStock = new Map<string, number>();
  for (const product of productMap.values()) {
    availableStock.set(product.id, Number(product.currentStock));
  }
  for (const item of existingBill.items) {
    if (!item.productId) continue;
    availableStock.set(
      item.productId,
      (availableStock.get(item.productId) ?? 0) - Number(item.quantity)
    );
  }
  for (const [productId, projected] of availableStock) {
    if (projected < 0) {
      const name = productMap.get(productId)?.name ?? productId;
      throw new ApiError(
        400,
        `Cannot save: insufficient current stock of ${name} to reverse this bill's old quantities`
      );
    }
  }

  const totalAmount = data.items.reduce((sum, item) => sum + lineAmount(item), 0);

  return prisma.$transaction(async (tx) => {
    for (const item of existingBill.items) {
      if (!item.productId) continue;
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: Number(item.quantity) } },
      });
    }

    await tx.purchaseBillItem.deleteMany({ where: { purchaseBillId: id } });

    const bill = await tx.purchaseBill.update({
      where: { id },
      data: {
        vendorId: data.vendorId?.trim() || null,
        kind: "EQUIPMENT",
        billDate: data.billDate ?? existingBill.billDate,
        transport: data.transport?.trim() || null,
        vehicleNo: data.vehicleNo?.trim() || null,
        supplierInvoiceNo: data.supplierInvoiceNo?.trim() || null,
        supplierGstin: data.supplierGstin?.trim() || null,
        notes: data.notes?.trim() || null,
        totalAmount,
        items: {
          create: data.items.map((item) => ({
            ...mapItemCreate(item),
            productId: null,
          })),
        },
      },
      include: billInclude,
    });

    return presentBill(bill);
  });
}

/** Move bill to recycle bin (soft delete) and reverse stock. */
export async function deletePurchaseBill(id: string) {
  const bill = await getPurchaseBill(id);

  if ((bill.payments?.length ?? 0) > 0) {
    throw new ApiError(400, "Cannot delete bill with payments. Delete payments first.");
  }

  for (const item of bill.items) {
    if (!item.productId || !item.product) continue;
    if (Number(item.product.currentStock) < Number(item.quantity)) {
      throw new ApiError(
        400,
        `Cannot delete: insufficient current stock of ${item.product.name} to reverse this bill`
      );
    }
  }

  await prisma.$transaction(async (tx) => {
    for (const item of bill.items) {
      if (!item.productId) continue;
      await tx.product.update({
        where: { id: item.productId },
        data: { currentStock: { decrement: Number(item.quantity) } },
      });
      await tx.stockMovement.create({
        data: {
          productId: item.productId,
          type: "OUT",
          quantity: item.quantity,
          reason: `Moved purchase bill ${bill.billNo} to recycle bin`,
        },
      });
    }

    await tx.purchaseBill.update({
      where: { id },
      data: { deletedAt: new Date() },
    });
  });
}

/** Restore bill from recycle bin and re-apply stock. */
export async function restorePurchaseBill(id: string) {
  const bill = await prisma.purchaseBill.findUnique({
    where: { id },
    include: billInclude,
  });
  if (!bill?.deletedAt) {
    throw new ApiError(404, "Bill not found in recycle bin");
  }

  await prisma.$transaction(async (tx) => {
    for (const item of bill.items) {
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
          reason: `Restored purchase bill ${bill.billNo}`,
        },
      });
    }

    await tx.purchaseBill.update({
      where: { id },
      data: { deletedAt: null },
    });
  });
}

/** Permanently delete a bill already in the recycle bin. */
export async function permanentlyDeletePurchaseBill(id: string) {
  const bill = await prisma.purchaseBill.findUnique({
    where: { id },
    include: { payments: true, attachments: true },
  });
  if (!bill?.deletedAt) {
    throw new ApiError(404, "Bill not found in recycle bin");
  }
  if ((bill.payments?.length ?? 0) > 0) {
    throw new ApiError(400, "Cannot permanently delete bill with payments");
  }

  for (const attachment of bill.attachments) {
    await deleteObject(PURCHASE_BUCKET, attachment.storagePath);
  }

  await prisma.purchaseBill.delete({ where: { id } });
}

export async function addPurchaseAttachment(
  billId: string,
  file: Express.Multer.File
) {
  const bill = await prisma.purchaseBill.findUnique({ where: { id: billId } });
  if (!bill || bill.deletedAt) {
    throw new ApiError(404, "Purchase bill not found");
  }

  const safeName = file.originalname.replace(/[^\w.\-()+ ]+/g, "_").slice(0, 120);
  const storagePath = `${billId}/${Date.now()}-${safeName}`;
  const mimeType = file.mimetype || "application/octet-stream";

  await uploadObject({
    bucket: PURCHASE_BUCKET,
    path: storagePath,
    buffer: file.buffer,
    mimeType,
  });

  const attachment = await prisma.purchaseAttachment.create({
    data: {
      purchaseBillId: billId,
      fileName: file.originalname.slice(0, 200),
      mimeType,
      storagePath,
      sizeBytes: file.size,
    },
  });

  return {
    ...attachment,
    url: publicObjectUrl(PURCHASE_BUCKET, storagePath),
  };
}

export async function deletePurchaseAttachment(billId: string, attachmentId: string) {
  const attachment = await prisma.purchaseAttachment.findFirst({
    where: { id: attachmentId, purchaseBillId: billId },
  });
  if (!attachment) {
    throw new ApiError(404, "Attachment not found");
  }

  await deleteObject(PURCHASE_BUCKET, attachment.storagePath);
  await prisma.purchaseAttachment.delete({ where: { id: attachmentId } });
}
