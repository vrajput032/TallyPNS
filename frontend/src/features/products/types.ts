export interface Product {
  id: string;
  name: string;
  hsn: string | null;
  gstRate: string;
  unit: string;
  price: string;
  openingStock: string;
  currentStock: string;
  imagePath?: string | null;
  imageMime?: string | null;
  imageUrl?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ProductInput {
  name: string;
  hsn?: string;
  gstRate: number;
  unit: string;
  price: number;
  openingStock: number;
  currentStock: number;
}
