export interface SizeStock {
  sizeMm: string;
  quantity: string;
}

export interface StockRow {
  id: string;
  name: string;
  hsn: string | null;
  unit: string;
  price: string;
  openingStock: string;
  currentStock: string;
  sizeStocks?: SizeStock[];
}

export interface StockMovement {
  id: string;
  productId: string;
  product: { id: string; name: string; unit: string };
  type: "IN" | "OUT" | "ADJUSTMENT";
  quantity: string;
  sizeMm?: string | null;
  reason: string | null;
  createdAt: string;
}

export interface AdjustmentInput {
  productId: string;
  quantity: number;
  sizeMm: number;
  reason?: string;
}
