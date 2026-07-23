export interface Vendor {
  id: string;
  name: string;
  phone: string | null;
  email: string | null;
  gstin: string | null;
  address: string | null;
  openingBalance: string;
  createdAt: string;
  updatedAt: string;
}

export interface VendorInput {
  name: string;
  phone?: string;
  email?: string;
  gstin?: string;
  address?: string;
  openingBalance: number;
}
