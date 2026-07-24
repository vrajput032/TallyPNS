/** Indian grouping: 1,25,550.00 */
export function formatInr(value: number | string | null | undefined, digits = 2) {
  const n = Number(value);
  if (!Number.isFinite(n)) {
    return (0).toLocaleString("en-IN", {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits,
    });
  }
  return n.toLocaleString("en-IN", {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });
}
