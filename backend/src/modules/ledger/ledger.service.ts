import { prisma } from "../../lib/prisma.js";
import { activeOnly } from "../../lib/activeRecords.js";
import { ApiError } from "../../middleware/errorHandler.js";
import {
  buildPartyLedger,
  roundMoney,
  supplierKey,
  type LedgerPaymentMode,
} from "../../lib/partyLedger.js";

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
  reference: true,
  salesInvoiceId: true,
  narration: true,
  salesInvoice: { select: { invoiceNo: true } },
} as const;

function toPaymentMode(value: string): LedgerPaymentMode {
  return value === "BANK" ? "BANK" : "CASH";
}

function lastDate(dates: Date[]) {
  if (dates.length === 0) return null;
  return dates.reduce((latest, date) => (date > latest ? date : latest));
}

function toCustomerBook(customer: {
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
    reference: string | null;
    salesInvoiceId: string;
    narration: string | null;
    salesInvoice: { invoiceNo: string };
  }[];
}) {
  return buildPartyLedger({
    party: "CUSTOMER",
    openingBalance: Number(customer.openingBalance),
    documents: customer.salesInvoices.map((invoice) => ({
      id: invoice.id,
      docNo: invoice.invoiceNo,
      date: invoice.invoiceDate,
      amount: Number(invoice.totalAmount),
    })),
    payments: customer.receipts.map((receipt) => ({
      id: receipt.id,
      voucherNo: receipt.receiptNo,
      date: receipt.receiptDate,
      amount: Number(receipt.amount),
      mode: toPaymentMode(receipt.mode),
      reference: receipt.reference,
      narration: receipt.narration,
      documentId: receipt.salesInvoiceId,
      documentNo: receipt.salesInvoice.invoiceNo,
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
    const book = toCustomerBook(customer);
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

  const book = toCustomerBook(customer);

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

type SupplierBill = {
  id: string;
  billNo: string;
  supplierName: string;
  supplierGstin: string | null;
  billDate: Date;
  totalAmount: unknown;
  payments: {
    id: string;
    paymentNo: string;
    paymentDate: Date;
    amount: unknown;
    mode: string;
    reference: string | null;
    narration: string | null;
  }[];
};

type SupplierGroup = {
  key: string;
  name: string;
  gstin: string | null;
  aliases: string[];
  bills: SupplierBill[];
};

async function loadSupplierGroups(): Promise<SupplierGroup[]> {
  const bills = await prisma.rawMaterialBill.findMany({
    where: activeOnly,
    select: {
      id: true,
      billNo: true,
      supplierName: true,
      supplierGstin: true,
      billDate: true,
      totalAmount: true,
      payments: {
        select: {
          id: true,
          paymentNo: true,
          paymentDate: true,
          amount: true,
          mode: true,
          reference: true,
          narration: true,
        },
      },
    },
    orderBy: { billDate: "desc" },
  });

  const groups = new Map<string, SupplierGroup>();
  for (const bill of bills) {
    const key = supplierKey(bill.supplierName);
    if (!key) continue;
    const group = groups.get(key);
    if (group) {
      group.bills.push(bill);
      if (!group.aliases.includes(bill.supplierName.trim())) group.aliases.push(bill.supplierName.trim());
      if (!group.gstin && bill.supplierGstin) group.gstin = bill.supplierGstin;
    } else {
      // Bills are newest first, so the latest spelling becomes the display name.
      groups.set(key, {
        key,
        name: bill.supplierName.trim(),
        gstin: bill.supplierGstin,
        aliases: [bill.supplierName.trim()],
        bills: [bill],
      });
    }
  }

  return [...groups.values()].sort((a, b) => a.name.localeCompare(b.name));
}

function toSupplierBook(group: SupplierGroup) {
  return buildPartyLedger({
    party: "SUPPLIER",
    openingBalance: 0,
    documents: group.bills.map((bill) => ({
      id: bill.id,
      docNo: bill.billNo,
      date: bill.billDate,
      amount: Number(bill.totalAmount),
    })),
    payments: group.bills.flatMap((bill) =>
      bill.payments.map((payment) => ({
        id: payment.id,
        voucherNo: payment.paymentNo,
        date: payment.paymentDate,
        amount: Number(payment.amount),
        mode: toPaymentMode(payment.mode),
        reference: payment.reference,
        narration: payment.narration,
        documentId: bill.id,
        documentNo: bill.billNo,
      }))
    ),
  });
}

export async function listSupplierLedgers() {
  const groups = await loadSupplierGroups();

  const rows = groups.map((group) => {
    const book = toSupplierBook(group);
    const lastTransactionDate = lastDate(
      group.bills.flatMap((bill) => [bill.billDate, ...bill.payments.map((p) => p.paymentDate)])
    );
    return {
      key: group.key,
      name: group.name,
      gstin: group.gstin,
      billCount: group.bills.length,
      totalBilled: book.totalCredit,
      totalPaid: book.totalDebit,
      closingBalance: book.closingBalance,
      entryCount: book.entries.length,
      lastTransactionDate: lastTransactionDate?.toISOString() ?? null,
    };
  });

  return {
    suppliers: rows,
    totalBilled: roundMoney(rows.reduce((sum, row) => sum + row.totalBilled, 0)),
    totalPaid: roundMoney(rows.reduce((sum, row) => sum + row.totalPaid, 0)),
    totalClosingBalance: roundMoney(rows.reduce((sum, row) => sum + row.closingBalance, 0)),
  };
}

export async function getSupplierLedger(key: string) {
  const groups = await loadSupplierGroups();
  const group = groups.find((row) => row.key === supplierKey(key));
  if (!group) {
    throw new ApiError(404, "Supplier not found");
  }

  return {
    supplier: {
      key: group.key,
      name: group.name,
      gstin: group.gstin,
      aliases: group.aliases,
    },
    ...toSupplierBook(group),
  };
}
