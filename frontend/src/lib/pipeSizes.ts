/** Catalog pipe diameters used for inventory and sales. */
export const PIPE_SIZES_MM = [95, 110, 90, 55, 45] as const;

export type PipeSizeMm = (typeof PIPE_SIZES_MM)[number];

export function formatPipeSize(sizeMm: number) {
  return `${sizeMm}mm`;
}

/** Highlight stock in red when quantity is below this. */
export const LOW_STOCK_QTY = 100;
