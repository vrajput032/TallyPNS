import { prisma } from "../../lib/prisma.js";
import { listCustomerLedgers } from "../ledger/ledger.service.js";
import { withBillPaymentSummary, withPaymentSummary } from "../payments/payment.utils.js";

export type SheetTabName =
  | "Sales"
  | "sales receipts"
  | "Purchase"
  | "purchase items"
  | "purchase payments"
  | "raw material"
  | "raw material items"
  | "raw material payments"
  | "attachments"
  | "customer"
  | "ledger"
  | "vendor"
  | "product"
  | "size stock"
  | "stock movements"
  | "commission entries"
  | "commission payments"
  | "running cost overrides"
  | "recycle bin"
  | "activity";

type SheetValues = (string | number)[][];

/** Activity grows forever; keep the newest rows so the workbook stays well under Google's cell limit. */
const ACTIVITY_ROW_LIMIT = 5000;

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function cell(value: string | number | null | undefined): string | number {
  if (value === null || value === undefined) return "";
  return value;
}

function optNumber(value: { toString(): string } | null | undefined): string | number {
  return value == null ? "" : Number(value);
}

async function salesValues(): Promise<SheetValues> {
  const sales = await prisma.salesInvoice.findMany({
    where: { deletedAt: null },
    include: {
      customer: { select: { name: true, gstin: true } },
      receipts: { select: { amount: true } },
      items: {
        include: { product: { select: { name: true, hsn: true, unit: true } } },
        orderBy: { id: "asc" },
      },
    },
    orderBy: { invoiceDate: "desc" },
  });

  const header = [
    "invoiceNo",
    "invoiceDate",
    "customer",
    "customerGstin",
    "transport",
    "vehicleNo",
    "totalAmount",
    "paidAmount",
    "balanceAmount",
    "paymentStatus",
    "lineType",
    "productOrDescription",
    "hsn",
    "unit",
    "sizeMm",
    "quantity",
    "rate",
    "gstRate",
    "lineAmount",
    "isTrading",
    "commissionAmount",
  ];

  const rows: SheetValues = [];
  for (const row of sales) {
    const s = withPaymentSummary(row);
    const invoiceCols = [
      s.invoiceNo,
      dateOnly(s.invoiceDate),
      s.customer.name,
      cell(s.customer.gstin),
      cell(s.transport),
      cell(s.vehicleNo),
      Number(s.totalAmount),
      s.paidAmount,
      s.balanceAmount,
      s.paymentStatus,
    ];
    const invoiceTail = [s.isTrading ? "yes" : "no", Number(s.commissionAmount)];

    if (s.items.length === 0) {
      rows.push([...invoiceCols, "", "", "", "", "", "", "", "", "", ...invoiceTail]);
      continue;
    }

    for (const item of s.items) {
      rows.push([
        ...invoiceCols,
        item.productId ? "catalog" : "manual",
        item.product?.name ?? item.description ?? "",
        cell(item.product?.hsn ?? item.hsn),
        cell(item.product?.unit ?? item.unit),
        optNumber(item.sizeMm),
        Number(item.quantity),
        Number(item.rate),
        Number(item.gstRate),
        Number(item.amount),
        ...invoiceTail,
      ]);
    }
  }

  return [header, ...rows];
}

async function salesReceiptValues(): Promise<SheetValues> {
  const receipts = await prisma.paymentReceipt.findMany({
    where: { salesInvoice: { deletedAt: null } },
    include: {
      salesInvoice: { select: { invoiceNo: true } },
      customer: { select: { name: true } },
    },
    orderBy: { receiptDate: "desc" },
  });
  return [
    ["receiptNo", "receiptDate", "invoiceNo", "customer", "amount", "mode", "reference", "narration"],
    ...receipts.map((r) => [
      r.receiptNo,
      dateOnly(r.receiptDate),
      r.salesInvoice.invoiceNo,
      r.customer.name,
      Number(r.amount),
      r.mode,
      cell(r.reference),
      cell(r.narration),
    ]),
  ];
}

async function purchaseValues(): Promise<SheetValues> {
  const purchases = await prisma.purchaseBill.findMany({
    where: { deletedAt: null },
    include: {
      vendor: { select: { name: true, gstin: true } },
      payments: { select: { amount: true } },
    },
    orderBy: { billDate: "desc" },
  });
  return [
    [
      "billNo",
      "billDate",
      "kind",
      "vendor",
      "vendorGstin",
      "supplierInvoiceNo",
      "title",
      "transport",
      "vehicleNo",
      "notes",
      "totalAmount",
      "paidAmount",
      "balanceAmount",
      "paymentStatus",
    ],
    ...purchases.map((row) => {
      const b = withBillPaymentSummary(row);
      return [
        b.billNo,
        dateOnly(b.billDate),
        b.kind,
        cell(b.vendor?.name),
        cell(b.vendor?.gstin ?? b.supplierGstin),
        cell(b.supplierInvoiceNo),
        cell(b.title),
        cell(b.transport),
        cell(b.vehicleNo),
        cell(b.notes),
        Number(b.totalAmount),
        b.paidAmount,
        b.balanceAmount,
        b.paymentStatus,
      ];
    }),
  ];
}

async function purchaseItemValues(): Promise<SheetValues> {
  const items = await prisma.purchaseBillItem.findMany({
    where: { purchaseBill: { deletedAt: null } },
    include: {
      purchaseBill: { select: { billNo: true, billDate: true, kind: true } },
      product: { select: { name: true, hsn: true } },
    },
    orderBy: [{ purchaseBill: { billDate: "desc" } }, { id: "asc" }],
  });
  return [
    [
      "billNo",
      "billDate",
      "kind",
      "lineType",
      "productOrDescription",
      "hsn",
      "quantity",
      "pricePerKg",
      "rate",
      "gstRate",
      "amount",
    ],
    ...items.map((i) => [
      i.purchaseBill.billNo,
      dateOnly(i.purchaseBill.billDate),
      i.purchaseBill.kind,
      i.productId ? "catalog" : "free text",
      i.product?.name ?? i.description ?? "",
      cell(i.product?.hsn),
      Number(i.quantity),
      optNumber(i.pricePerKg),
      Number(i.rate),
      Number(i.gstRate),
      Number(i.amount),
    ]),
  ];
}

async function purchasePaymentValues(): Promise<SheetValues> {
  const payments = await prisma.vendorPayment.findMany({
    where: { purchaseBill: { deletedAt: null } },
    include: {
      purchaseBill: { select: { billNo: true, title: true } },
      vendor: { select: { name: true } },
    },
    orderBy: { paymentDate: "desc" },
  });
  return [
    ["paymentNo", "paymentDate", "billNo", "billTitle", "vendor", "amount", "mode", "reference", "narration"],
    ...payments.map((p) => [
      p.paymentNo,
      dateOnly(p.paymentDate),
      p.purchaseBill.billNo,
      cell(p.purchaseBill.title),
      cell(p.vendor?.name),
      Number(p.amount),
      p.mode,
      cell(p.reference),
      cell(p.narration),
    ]),
  ];
}

async function rawMaterialValues(): Promise<SheetValues> {
  const bills = await prisma.rawMaterialBill.findMany({
    where: { deletedAt: null },
    include: { payments: { select: { amount: true } } },
    orderBy: { billDate: "desc" },
  });
  return [
    [
      "billNo",
      "billDate",
      "supplierName",
      "supplierGstin",
      "vehicleNo",
      "destination",
      "taxableAmount",
      "cgstAmount",
      "sgstAmount",
      "igstAmount",
      "roundOff",
      "totalKg",
      "totalAmount",
      "notes",
      "paidAmount",
      "balanceAmount",
      "paymentStatus",
      "sourceFileName",
    ],
    ...bills.map((row) => {
      const b = withBillPaymentSummary(row);
      return [
        b.billNo,
        dateOnly(b.billDate),
        b.supplierName,
        cell(b.supplierGstin),
        cell(b.vehicleNo),
        cell(b.destination),
        Number(b.taxableAmount),
        Number(b.cgstAmount),
        Number(b.sgstAmount),
        Number(b.igstAmount),
        Number(b.roundOff),
        Number(b.totalKg),
        Number(b.totalAmount),
        cell(b.notes),
        b.paidAmount,
        b.balanceAmount,
        b.paymentStatus,
        cell(b.sourceFileName),
      ];
    }),
  ];
}

async function rawMaterialItemValues(): Promise<SheetValues> {
  const items = await prisma.rawMaterialBillItem.findMany({
    where: { bill: { deletedAt: null } },
    include: { bill: { select: { billNo: true, billDate: true, supplierName: true } } },
    orderBy: [{ bill: { billDate: "desc" } }, { id: "asc" }],
  });
  return [
    ["billNo", "billDate", "supplierName", "description", "hsn", "quantityKg", "ratePerKg", "amount"],
    ...items.map((i) => [
      i.bill.billNo,
      dateOnly(i.bill.billDate),
      i.bill.supplierName,
      i.description,
      cell(i.hsn),
      Number(i.quantityKg),
      Number(i.ratePerKg),
      Number(i.amount),
    ]),
  ];
}

async function rawMaterialPaymentValues(): Promise<SheetValues> {
  const payments = await prisma.rawMaterialPayment.findMany({
    where: { bill: { deletedAt: null } },
    include: { bill: { select: { billNo: true, supplierName: true } } },
    orderBy: { paymentDate: "desc" },
  });
  return [
    ["paymentNo", "paymentDate", "billNo", "supplierName", "amount", "mode", "reference", "narration"],
    ...payments.map((p) => [
      p.paymentNo,
      dateOnly(p.paymentDate),
      p.bill.billNo,
      p.bill.supplierName,
      Number(p.amount),
      p.mode,
      cell(p.reference),
      cell(p.narration),
    ]),
  ];
}

async function attachmentValues(): Promise<SheetValues> {
  const [purchaseFiles, rawFiles] = await Promise.all([
    prisma.purchaseAttachment.findMany({
      where: { purchaseBill: { deletedAt: null } },
      include: { purchaseBill: { select: { billNo: true } } },
      orderBy: { createdAt: "desc" },
    }),
    prisma.rawMaterialAttachment.findMany({
      where: { bill: { deletedAt: null } },
      include: { bill: { select: { billNo: true } } },
      orderBy: { createdAt: "desc" },
    }),
  ]);
  return [
    ["module", "billNo", "fileName", "mimeType", "sizeBytes", "storageBucket", "storagePath", "uploadedAt"],
    ...purchaseFiles.map((f) => [
      "purchase",
      f.purchaseBill.billNo,
      f.fileName,
      f.mimeType,
      f.sizeBytes,
      "pns-purchase",
      f.storagePath,
      f.createdAt.toISOString(),
    ]),
    ...rawFiles.map((f) => [
      "raw material",
      f.bill.billNo,
      f.fileName,
      f.mimeType,
      f.sizeBytes,
      "pns-raw-material",
      f.storagePath,
      f.createdAt.toISOString(),
    ]),
  ];
}

async function customerValues(): Promise<SheetValues> {
  const customers = await prisma.customer.findMany({ orderBy: { name: "asc" } });
  return [
    [
      "name",
      "phone",
      "email",
      "gstin",
      "address",
      "openingBalance",
      "paymentTermDays",
      "commissionType",
      "commissionRate",
    ],
    ...customers.map((c) => [
      c.name,
      cell(c.phone),
      cell(c.email),
      cell(c.gstin),
      cell(c.address),
      Number(c.openingBalance),
      c.paymentTermDays,
      cell(c.commissionType),
      optNumber(c.commissionRate),
    ]),
  ];
}

async function ledgerValues(): Promise<SheetValues> {
  const { customers } = await listCustomerLedgers();
  return [
    [
      "customer",
      "phone",
      "gstin",
      "openingBalance",
      "totalBilled",
      "totalPaid",
      "closingBalance",
      "entryCount",
      "lastTransactionDate",
    ],
    ...customers.map((c) => [
      c.name,
      cell(c.phone),
      cell(c.gstin),
      c.openingBalance,
      c.totalBilled,
      c.totalPaid,
      c.closingBalance,
      c.entryCount,
      cell(c.lastTransactionDate ? c.lastTransactionDate.slice(0, 10) : null),
    ]),
  ];
}

async function vendorValues(): Promise<SheetValues> {
  const vendors = await prisma.vendor.findMany({ orderBy: { name: "asc" } });
  return [
    ["name", "phone", "email", "gstin", "address", "openingBalance"],
    ...vendors.map((v) => [
      v.name,
      cell(v.phone),
      cell(v.email),
      cell(v.gstin),
      cell(v.address),
      Number(v.openingBalance),
    ]),
  ];
}

async function productValues(): Promise<SheetValues> {
  const products = await prisma.product.findMany({ orderBy: { name: "asc" } });
  return [
    ["name", "hsn", "gstRate", "unit", "price", "openingStock", "currentStock", "imagePath"],
    ...products.map((p) => [
      p.name,
      cell(p.hsn),
      Number(p.gstRate),
      p.unit,
      Number(p.price),
      Number(p.openingStock),
      Number(p.currentStock),
      cell(p.imagePath),
    ]),
  ];
}

async function sizeStockValues(): Promise<SheetValues> {
  const rows = await prisma.productSizeStock.findMany({
    include: { product: { select: { name: true, unit: true } } },
    orderBy: [{ product: { name: "asc" } }, { sizeMm: "desc" }],
  });
  return [
    ["product", "sizeMm", "quantity", "unit"],
    ...rows.map((r) => [r.product.name, Number(r.sizeMm), Number(r.quantity), r.product.unit]),
  ];
}

async function stockMovementValues(): Promise<SheetValues> {
  const movements = await prisma.stockMovement.findMany({
    include: { product: { select: { name: true } } },
    orderBy: { createdAt: "desc" },
  });
  return [
    ["date", "product", "type", "quantity", "sizeMm", "reason"],
    ...movements.map((m) => [
      m.createdAt.toISOString(),
      m.product.name,
      m.type,
      Number(m.quantity),
      optNumber(m.sizeMm),
      cell(m.reason),
    ]),
  ];
}

async function commissionEntryValues(): Promise<SheetValues> {
  const entries = await prisma.commissionEntry.findMany({
    include: { customer: { select: { name: true } } },
    orderBy: [{ month: "desc" }, { createdAt: "desc" }],
  });
  return [
    ["month", "customer", "amount", "note"],
    ...entries.map((e) => [e.month, e.customer.name, Number(e.amount), cell(e.note)]),
  ];
}

async function commissionPaymentValues(): Promise<SheetValues> {
  const payments = await prisma.commissionPayment.findMany({
    include: { customer: { select: { name: true } } },
    orderBy: { paymentDate: "desc" },
  });
  return [
    ["paymentNo", "paymentDate", "customer", "amount", "mode", "reference", "narration"],
    ...payments.map((p) => [
      p.paymentNo,
      dateOnly(p.paymentDate),
      p.customer.name,
      Number(p.amount),
      p.mode,
      cell(p.reference),
      cell(p.narration),
    ]),
  ];
}

async function runningCostOverrideValues(): Promise<SheetValues> {
  const overrides = await prisma.runningCostOverride.findMany({
    orderBy: [{ month: "desc" }, { lineId: "asc" }],
  });
  return [
    ["month", "lineId", "amount"],
    ...overrides.map((o) => [o.month, o.lineId, Number(o.amount)]),
  ];
}

async function recycleBinValues(): Promise<SheetValues> {
  const deleted = { deletedAt: { not: null } };
  const [sales, purchases, rawBills] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: deleted,
      include: { customer: { select: { name: true } } },
      orderBy: { deletedAt: "desc" },
    }),
    prisma.purchaseBill.findMany({
      where: deleted,
      include: { vendor: { select: { name: true } } },
      orderBy: { deletedAt: "desc" },
    }),
    prisma.rawMaterialBill.findMany({ where: deleted, orderBy: { deletedAt: "desc" } }),
  ]);
  return [
    ["module", "number", "billDate", "party", "title", "totalAmount", "deletedAt"],
    ...sales.map((s) => [
      "sales",
      s.invoiceNo,
      dateOnly(s.invoiceDate),
      s.customer.name,
      "",
      Number(s.totalAmount),
      s.deletedAt ? s.deletedAt.toISOString() : "",
    ]),
    ...purchases.map((b) => [
      "purchase",
      b.billNo,
      dateOnly(b.billDate),
      cell(b.vendor?.name),
      cell(b.title),
      Number(b.totalAmount),
      b.deletedAt ? b.deletedAt.toISOString() : "",
    ]),
    ...rawBills.map((b) => [
      "raw material",
      b.billNo,
      dateOnly(b.billDate),
      b.supplierName,
      "",
      Number(b.totalAmount),
      b.deletedAt ? b.deletedAt.toISOString() : "",
    ]),
  ];
}

async function activityValues(): Promise<SheetValues> {
  const logs = await prisma.activityLog.findMany({
    orderBy: { createdAt: "desc" },
    take: ACTIVITY_ROW_LIMIT,
  });
  return [
    ["createdAt", "actor", "device", "module", "action", "entityNo", "summary", "amount"],
    ...logs.map((log) => [
      log.createdAt.toISOString(),
      log.actorName,
      cell(log.deviceName),
      log.module,
      log.action,
      cell(log.entityNo),
      log.summary,
      optNumber(log.amount),
    ]),
  ];
}

const TAB_LOADERS: Record<SheetTabName, () => Promise<SheetValues>> = {
  Sales: salesValues,
  "sales receipts": salesReceiptValues,
  Purchase: purchaseValues,
  "purchase items": purchaseItemValues,
  "purchase payments": purchasePaymentValues,
  "raw material": rawMaterialValues,
  "raw material items": rawMaterialItemValues,
  "raw material payments": rawMaterialPaymentValues,
  attachments: attachmentValues,
  customer: customerValues,
  ledger: ledgerValues,
  vendor: vendorValues,
  product: productValues,
  "size stock": sizeStockValues,
  "stock movements": stockMovementValues,
  "commission entries": commissionEntryValues,
  "commission payments": commissionPaymentValues,
  "running cost overrides": runningCostOverrideValues,
  "recycle bin": recycleBinValues,
  activity: activityValues,
};

/** Header + data rows for one Google Sheet tab. */
export function loadSheetValues(tab: SheetTabName): Promise<SheetValues> {
  return TAB_LOADERS[tab]();
}

export const ALL_SHEET_TABS = Object.keys(TAB_LOADERS) as SheetTabName[];
