/**
 * Catalog pipe sizes for inventory and sales.
 * `70.01` is the internal key for 70mm pipe without chudi height (distinct from 70mm chudi).
 */
export const SIZE_70MM_WITHOUT_CHUDI = 70.01;

export const PIPE_SIZE_CATALOG = [
  { sizeMm: 95, label: "95mm" },
  { sizeMm: 110, label: "110mm" },
  { sizeMm: 90, label: "90mm" },
  { sizeMm: 55, label: "55mm" },
  { sizeMm: 85, label: "85mm" },
  { sizeMm: 70, label: "70mm" },
  { sizeMm: SIZE_70MM_WITHOUT_CHUDI, label: "70mm without chudi" },
  { sizeMm: 82, label: "82mm" },
  { sizeMm: 45, label: "45mm" },
] as const;

export const PIPE_SIZES_MM = PIPE_SIZE_CATALOG.map((row) => row.sizeMm);

export type PipeSizeMm = (typeof PIPE_SIZE_CATALOG)[number]["sizeMm"];

const labelBySize = new Map<number, string>(
  PIPE_SIZE_CATALOG.map((row) => [row.sizeMm, row.label])
);

export function formatPipeSize(sizeMm: number): string {
  return labelBySize.get(sizeMm) ?? `${sizeMm}mm`;
}

export function isPipeSizeMm(value: number): value is PipeSizeMm {
  return PIPE_SIZES_MM.some((size) => pipeSizeMatches(value, size));
}

export function pipeSizeMatches(stored: number, catalogSize: number): boolean {
  return Math.abs(stored - catalogSize) < 0.001;
}

export function quantityForCatalogSize(
  qtyBySize: Map<number, number>,
  catalogSize: number
): number {
  for (const [sizeMm, quantity] of qtyBySize) {
    if (pipeSizeMatches(sizeMm, catalogSize)) return quantity;
  }
  return 0;
}
