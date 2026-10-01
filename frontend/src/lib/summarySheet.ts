import type { PaymentStatus } from "@/features/payments/types";

/** Cell classes for black-and-white A4 summary PDFs (sales, raw material). */
export const sheetCell = "border border-black px-1 py-1";
export const sheetHead = "border border-black px-1 py-1.5 font-semibold";
export const sheetFoot = "border border-black px-1 py-1.5";

export function formatSheetDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB");
}

/** Short form for summary sheets; the header already names the period. */
export function formatShortDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "2-digit",
    year: "2-digit",
  });
}

export function paymentStatusLabel(status: PaymentStatus | undefined): string {
  const value = status ?? "PENDING";
  switch (value) {
    case "PAID":
      return "Paid";
    case "PARTIAL":
      return "Partial";
    case "PENDING":
      return "Pending";
    default: {
      const _exhaustive: never = value;
      return _exhaustive;
    }
  }
}
