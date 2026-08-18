/** Pieces of finished pipe that 1 kg of MS / iron tube can yield. */
export const RAW_MATERIAL_YIELD = [
  { sizeMm: 95, piecesPerKg: 9.1, source: "measured" as const },
  { sizeMm: 110, piecesPerKg: 8.33, source: "measured" as const },
] as const;

export type YieldSource = (typeof RAW_MATERIAL_YIELD)[number]["source"];

export type YieldRow = {
  sizeMm: number;
  piecesPerKg: number;
  pieces: number;
  source: YieldSource;
};

export function piecesFromKg(kg: number): YieldRow[] {
  const safeKg = Number.isFinite(kg) && kg > 0 ? kg : 0;
  return RAW_MATERIAL_YIELD.map((row) => ({
    sizeMm: row.sizeMm,
    piecesPerKg: row.piecesPerKg,
    pieces: Math.round(safeKg * row.piecesPerKg * 100) / 100,
    source: row.source,
  }));
}
