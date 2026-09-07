import { listPurchaseBills } from "../purchase/purchase.service.js";
import {
  loadPartnerExpensesSnapshot,
  mergeSplitExpenses,
} from "../../lib/kirayaDelivery.js";
import { isOneTimeInvestmentDescription } from "../../lib/oneTimeInvestment.js";

export type InvestmentExpense = {
  id: string;
  date: string;
  description: string;
  amount: number;
  paidBy?: string;
  billUrl?: string | null;
};

function round2(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export async function getInvestments() {
  const [bills, snapshot] = await Promise.all([
    listPurchaseBills(),
    loadPartnerExpensesSnapshot(),
  ]);

  const equipmentBills = bills.filter((bill) => bill.kind !== "CATALOG");
  const billsTotal = round2(
    equipmentBills.reduce((sum, bill) => sum + Number(bill.totalAmount), 0)
  );

  const expenses: InvestmentExpense[] = [];
  for (const monthRows of Object.values(snapshot.expensesByMonth)) {
    for (const row of mergeSplitExpenses(monthRows)) {
      if (!isOneTimeInvestmentDescription(row.description ?? "")) continue;
      expenses.push({
        id: row.id,
        date: row.date,
        description: row.description,
        amount: round2(Number(row.amount) || 0),
        paidBy: row.paidBy,
        billUrl: row.billUrl ?? null,
      });
    }
  }
  expenses.sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const expensesTotal = round2(expenses.reduce((sum, row) => sum + row.amount, 0));

  return {
    bills: equipmentBills,
    expenses,
    expensesFetchedAt: snapshot.fetchedAt || null,
    totals: {
      bills: billsTotal,
      expenses: expensesTotal,
      combined: round2(billsTotal + expensesTotal),
    },
  };
}
