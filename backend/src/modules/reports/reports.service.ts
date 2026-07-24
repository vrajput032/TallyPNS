import { prisma } from "../../lib/prisma.js";
import { getPartyOutstanding } from "../payments/payment.service.js";

export async function getProfitAndLoss(from?: Date, to?: Date) {
  const dateFilter = from || to ? { gte: from, lte: to } : undefined;

  const [salesInvoices, purchaseBills] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: dateFilter ? { invoiceDate: dateFilter } : undefined,
      select: { totalAmount: true },
    }),
    prisma.purchaseBill.findMany({
      where: dateFilter ? { billDate: dateFilter } : undefined,
      select: { totalAmount: true },
    }),
  ]);

  const totalSales = salesInvoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
  const totalPurchases = purchaseBills.reduce((sum, bill) => sum + Number(bill.totalAmount), 0);

  return {
    totalSales,
    totalPurchases,
    grossProfit: totalSales - totalPurchases,
    salesCount: salesInvoices.length,
    purchaseCount: purchaseBills.length,
  };
}

export async function getStockReport() {
  const products = await prisma.product.findMany({
    orderBy: { name: "asc" },
    select: {
      id: true,
      name: true,
      hsn: true,
      unit: true,
      price: true,
      currentStock: true,
    },
  });

  const rows = products.map((product) => ({
    ...product,
    stockValue: Number(product.price) * Number(product.currentStock),
  }));

  const totalStockValue = rows.reduce((sum, row) => sum + row.stockValue, 0);

  return { rows, totalStockValue };
}

export async function getBalanceSheet(asOn?: Date) {
  const on = asOn ?? new Date();

  const [sales, purchases, receipts, payments, products, outstanding] = await Promise.all([
    prisma.salesInvoice.findMany({
      where: { invoiceDate: { lte: on } },
      select: { totalAmount: true },
    }),
    prisma.purchaseBill.findMany({
      where: { billDate: { lte: on } },
      select: { totalAmount: true },
    }),
    prisma.paymentReceipt.findMany({
      where: { receiptDate: { lte: on } },
      select: { amount: true, mode: true },
    }),
    prisma.vendorPayment.findMany({
      where: { paymentDate: { lte: on } },
      select: { amount: true, mode: true },
    }),
    prisma.product.findMany({
      select: { price: true, currentStock: true },
    }),
    getPartyOutstanding(),
  ]);

  const totalSales = sales.reduce((s, i) => s + Number(i.totalAmount), 0);
  const totalPurchases = purchases.reduce((s, i) => s + Number(i.totalAmount), 0);
  const cashIn = receipts
    .filter((r) => r.mode === "CASH")
    .reduce((s, r) => s + Number(r.amount), 0);
  const cashOut = payments
    .filter((p) => p.mode === "CASH")
    .reduce((s, p) => s + Number(p.amount), 0);
  const bankIn = receipts
    .filter((r) => r.mode === "BANK")
    .reduce((s, r) => s + Number(r.amount), 0);
  const bankOut = payments
    .filter((p) => p.mode === "BANK")
    .reduce((s, p) => s + Number(p.amount), 0);

  const cash = Math.round((cashIn - cashOut) * 100) / 100;
  const bank = Math.round((bankIn - bankOut) * 100) / 100;
  const stock =
    Math.round(products.reduce((s, p) => s + Number(p.price) * Number(p.currentStock), 0) * 100) /
    100;
  const debtors = Math.round(outstanding.totalDebtors * 100) / 100;
  const creditors = Math.round(outstanding.totalCreditors * 100) / 100;
  const grossProfit = Math.round((totalSales - totalPurchases) * 100) / 100;

  const assets = [
    { name: "Cash-in-Hand", amount: cash },
    { name: "Bank Accounts", amount: bank },
    { name: "Sundry Debtors", amount: debtors },
    { name: "Stock-in-Hand", amount: stock },
  ];
  const totalAssets = assets.reduce((s, a) => s + a.amount, 0);

  const capital = Math.round((totalAssets - creditors) * 100) / 100;
  const liabilities = [
    { name: "Sundry Creditors", amount: creditors },
    { name: "Capital Account", amount: capital },
  ];
  const totalLiabilities = liabilities.reduce((s, l) => s + l.amount, 0);

  return {
    asOn: on.toISOString(),
    assets,
    liabilities,
    totalAssets: Math.round(totalAssets * 100) / 100,
    totalLiabilities: Math.round(totalLiabilities * 100) / 100,
    notes: {
      totalSales,
      totalPurchases,
      grossProfit,
    },
  };
}

export async function getTrialBalance(asOn?: Date) {
  const on = asOn ?? new Date();
  const [bs, sales, purchases] = await Promise.all([
    getBalanceSheet(on),
    prisma.salesInvoice.findMany({
      where: { invoiceDate: { lte: on } },
      select: { totalAmount: true },
    }),
    prisma.purchaseBill.findMany({
      where: { billDate: { lte: on } },
      select: { totalAmount: true },
    }),
  ]);

  const totalSales = sales.reduce((s, i) => s + Number(i.totalAmount), 0);
  const totalPurchases = purchases.reduce((s, i) => s + Number(i.totalAmount), 0);

  const cash = bs.assets.find((a) => a.name === "Cash-in-Hand")?.amount ?? 0;
  const bank = bs.assets.find((a) => a.name === "Bank Accounts")?.amount ?? 0;
  const debtors = bs.assets.find((a) => a.name === "Sundry Debtors")?.amount ?? 0;
  const stock = bs.assets.find((a) => a.name === "Stock-in-Hand")?.amount ?? 0;
  const creditors = bs.liabilities.find((l) => l.name === "Sundry Creditors")?.amount ?? 0;
  const capital = bs.liabilities.find((l) => l.name === "Capital Account")?.amount ?? 0;

  type Row = { account: string; debit: number; credit: number };
  const rows: Row[] = [
    { account: "Cash-in-Hand", debit: Math.max(cash, 0), credit: Math.max(-cash, 0) },
    { account: "Bank Accounts", debit: Math.max(bank, 0), credit: Math.max(-bank, 0) },
    { account: "Sundry Debtors", debit: Math.max(debtors, 0), credit: Math.max(-debtors, 0) },
    { account: "Stock-in-Hand", debit: Math.max(stock, 0), credit: 0 },
    { account: "Purchase Accounts", debit: Math.max(totalPurchases, 0), credit: 0 },
    { account: "Sundry Creditors", debit: Math.max(-creditors, 0), credit: Math.max(creditors, 0) },
    { account: "Sales Accounts", debit: 0, credit: Math.max(totalSales, 0) },
    { account: "Capital Account", debit: Math.max(-capital, 0), credit: Math.max(capital, 0) },
  ].filter((r) => r.debit > 0.009 || r.credit > 0.009);

  const debitSum = rows.reduce((s, r) => s + r.debit, 0);
  const creditSum = rows.reduce((s, r) => s + r.credit, 0);
  const diff = Math.round((debitSum - creditSum) * 100) / 100;
  if (Math.abs(diff) > 0.009) {
    const capitalRow = rows.find((r) => r.account === "Capital Account");
    if (capitalRow) {
      if (diff > 0) capitalRow.credit += diff;
      else capitalRow.debit += Math.abs(diff);
    } else if (diff > 0) {
      rows.push({ account: "Capital Account", debit: 0, credit: diff });
    } else {
      rows.push({ account: "Capital Account", debit: Math.abs(diff), credit: 0 });
    }
  }

  const totalDebit = Math.round(rows.reduce((s, r) => s + r.debit, 0) * 100) / 100;
  const totalCredit = Math.round(rows.reduce((s, r) => s + r.credit, 0) * 100) / 100;

  return { asOn: on.toISOString(), rows, totalDebit, totalCredit };
}
