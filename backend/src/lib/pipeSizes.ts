/** Catalog pipe diameters used for inventory and sales. */
export const PIPE_SIZES_MM = [95, 110, 90, 55, 45] as const;

export type PipeSizeMm = (typeof PIPE_SIZES_MM)[number];

export function isPipeSizeMm(value: number): value is PipeSizeMm {
  return (PIPE_SIZES_MM as readonly number[]).includes(value);
}
