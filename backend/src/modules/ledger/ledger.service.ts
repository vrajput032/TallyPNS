import { prisma } from "../../lib/prisma.js";
import { activeOnly } from "../../lib/activeRecords.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { buildCustomerLedger, roundMoney } from "../../lib/customerLedger.js";
import type { PaymentMode } from "@prisma/client";

const invoiceSelect = {
  id: true,
  invoiceNo: true,
  invoiceDate: true,
  totalAmount: true,
} as const;

const receiptSelect = {
  id: true,
  receiptNo: true,
  receiptDate: true,
  amount: true,
  mode: true,
  salesInvoiceId: true,
  narration: true,
  salesInvoice: { select: { invoiceNo: true } },
} as const;

function isPaymentMode(value: string): value is PaymentMode {
  return value === "CASH" || value === "BANK";
}

function lastDate(dates: Date[]) {
  if (dates.length === 0) return null;
  return dates.reduce((latest, date) => (date > latest ? date : latest));
}

function toBookSources(customer: {
  openingBalance: unknown;
  salesInvoices: {
    id: string;
    invoiceNo: string;
    invoiceDate: Date;
    totalAmount: unknown;
  }[];
  receipts: {
    id: string;
    receiptNo: string;
    receiptDate: Date;
    amount: unknown;
    mode: string;
    salesInvoiceId: string;
    narration: string | null;
    salesInvoice: { invoiceNo: string };
  }[];
}) {
  return buildCustomerLedger({
    openingBalance: Number(customer.openingBalance),
    invoices: customer.salesInvoices.map((invoice) => ({
      id: invoice.id,
      invoiceNo: invoice.invoiceNo,
      invoiceDate: invoice.invoiceDate,
      totalAmount: Number(invoice.totalAmount),
    })),
    receipts: customer.receipts.map((receipt) => ({
      id: receipt.id,
      receiptNo: receipt.receiptNo,
      receiptDate: receipt.receiptDate,
      amount: Number(receipt.amount),
      mode: isPaymentMode(receipt.mode) ? receipt.mode : "CASH",
      salesInvoiceId: receipt.salesInvoiceId,
      invoiceNo: receipt.salesInvoice.invoiceNo,
      narration: receipt.narration,
    })),
  });
}

export async function listCustomerLedgers() {
  const customers = await prisma.customer.findMany({
    include: {
      salesInvoices: { where: activeOnly, select: invoiceSelect },
      receipts: {
        where: { salesInvoice: activeOnly },
        select: receiptSelect,
      },
    },
    orderBy: { name: "asc" },
  });

  const rows = customers.map((customer) => {
    const book = toBookSources(customer);
    const lastTransactionDate = lastDate([
      ...customer.salesInvoices.map((invoice) => invoice.invoiceDate),
      ...customer.receipts.map((receipt) => receipt.receiptDate),
    ]);

    return {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      gstin: customer.gstin,
      openingBalance: book.openingBalance,
      totalBilled: roundMoney(
        customer.salesInvoices.reduce((sum, invoice) => sum + Number(invoice.totalAmount), 0)
      ),
      totalPaid: roundMoney(
        customer.receipts.reduce((sum, receipt) => sum + Number(receipt.amount), 0)
      ),
      closingBalance: book.closingBalance,
      entryCount: book.entries.length,
      lastTransactionDate: lastTransactionDate?.toISOString() ?? null,
    };
  });

  return {
    customers: rows,
    totalBilled: roundMoney(rows.reduce((sum, row) => sum + row.totalBilled, 0)),
    totalPaid: roundMoney(rows.reduce((sum, row) => sum + row.totalPaid, 0)),
    totalClosingBalance: roundMoney(rows.reduce((sum, row) => sum + row.closingBalance, 0)),
  };
}

export async function getCustomerLedger(customerId: string) {
  const customer = await prisma.customer.findUnique({
    where: { id: customerId },
    include: {
      salesInvoices: { where: activeOnly, select: invoiceSelect },
      receipts: {
        where: { salesInvoice: activeOnly },
        select: receiptSelect,
      },
    },
  });

  if (!customer) {
    throw new ApiError(404, "Customer not found");
  }

  const book = toBookSources(customer);

  return {
    customer: {
      id: customer.id,
      name: customer.name,
      phone: customer.phone,
      email: customer.email,
      gstin: customer.gstin,
      address: customer.address,
    },
    ...book,
  };
}
