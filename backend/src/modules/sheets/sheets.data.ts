import { prisma } from "../../lib/prisma.js";
import { listCustomerLedgers } from "../ledger/ledger.service.js";
import { withPaymentSummary } from "../payments/payment.utils.js";

export type SheetTabName = "Sales" | "Purchase" | "raw material" | "customer" | "ledger";

function dateOnly(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function cell(value: string | number | null | undefined): string | number {
  if (value === null || value === undefined) return "";
  return value;
}

/** Header + data rows for each Google Sheet tab (matches the Tally workbook). */
export async function loadSheetValues(tab: SheetTabName): Promise<(string | number)[][]> {
  switch (tab) {
    case "Sales": {
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
      ];

      const rows: (string | number)[][] = [];
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
        ] as const;

        if (s.items.length === 0) {
          rows.push([...invoiceCols, "", "", "", "", "", "", "", "", ""]);
          continue;
        }

        for (const item of s.items) {
          rows.push([
            ...invoiceCols,
            item.productId ? "catalog" : "manual",
            item.product?.name ?? item.description ?? "",
            cell(item.product?.hsn ?? item.hsn),
            cell(item.product?.unit ?? item.unit),
            item.sizeMm != null ? Number(item.sizeMm) : "",
            Number(item.quantity),
            Number(item.rate),
            Number(item.gstRate),
            Number(item.amount),
          ]);
        }
      }

      return [header, ...rows];
    }
    case "Purchase": {
      const purchases = await prisma.purchaseBill.findMany({
        where: { deletedAt: null },
        include: { vendor: { select: { name: true, gstin: true } } },
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
        ],
        ...purchases.map((b) => [
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
        ]),
      ];
    }
    case "raw material": {
      const bills = await prisma.rawMaterialBill.findMany({
        where: { deletedAt: null },
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
        ],
        ...bills.map((b) => [
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
        ]),
      ];
    }
    case "customer": {
      const customers = await prisma.customer.findMany({ orderBy: { name: "asc" } });
      return [
        ["name", "phone", "email", "gstin", "address", "openingBalance"],
        ...customers.map((c) => [
          c.name,
          cell(c.phone),
          cell(c.email),
          cell(c.gstin),
          cell(c.address),
          Number(c.openingBalance),
        ]),
      ];
    }
    case "ledger": {
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
    default: {
      const _exhaustive: never = tab;
      throw new Error(`Unhandled sheet tab: ${_exhaustive}`);
    }
  }
}

export const ALL_SHEET_TABS: SheetTabName[] = [
  "Sales",
  "Purchase",
  "raw material",
  "customer",
  "ledger",
];
