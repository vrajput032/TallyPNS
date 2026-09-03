export function monthInputValue(year: number, month: number) {
  return `${year}-${String(month).padStart(2, "0")}`;
}

export function parseMonthInput(value: string): { year: number; month: number } | null {
  const match = /^(\d{4})-(\d{2})$/.exec(value);
  if (!match) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  if (month < 1 || month > 12) return null;
  return { year, month };
}

export function monthLabel(year: number, month: number) {
  return new Date(year, month - 1, 1).toLocaleDateString("en-GB", {
    month: "long",
    year: "numeric",
  });
}

export function isInMonth(iso: string, year: number, month: number) {
  const date = new Date(iso);
  return date.getFullYear() === year && date.getMonth() + 1 === month;
}

export function parseMonthQuery(
  yearRaw: string | null,
  monthRaw: string | null
): { year: number; month: number } | null {
  const year = Number(yearRaw);
  const month = Number(monthRaw);
  if (!Number.isFinite(year) || !Number.isFinite(month) || month < 1 || month > 12) {
    return null;
  }
  return { year, month };
}

export function monthPrintFileName(year: number, month: number) {
  return `PNS-Sales-${year}-${String(month).padStart(2, "0")}`;
}
