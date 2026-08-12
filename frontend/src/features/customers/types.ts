export interface Customer {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  address: string | null;
  openingBalance: string;
  totalBilled: number;
  totalPaid: number;
  balanceAmount: number;
  createdAt: string;
  updatedAt: string;
}

export interface CustomerInput {
  name: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  openingBalance: number;
}
