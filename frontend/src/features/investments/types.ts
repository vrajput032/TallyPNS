import type { PurchaseBill } from "@/features/purchase/types";

export type InvestmentExpense = {
  id: string;
  date: string;
  description: string;
  amount: number;
  paidBy?: string;
  billUrl?: string | null;
};

export type InvestmentsPayload = {
  bills: PurchaseBill[];
  expenses: InvestmentExpense[];
  expensesFetchedAt: string | null;
  totals: {
    bills: number;
    expenses: number;
    combined: number;
  };
};
