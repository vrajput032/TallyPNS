import { COMPANY } from "../../config/company.js";

const GSTIN_RE = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/g;
const DATE_RE = /\b(\d{1,2})[-/ ]([A-Za-z]{3})[-/ ](\d{2,4})\b/;
const VEHICLE_RE = /\b([A-Z]{2}\s?\d{1,2}\s?[A-Z]{1,3}\s?\d{4})\b/;
const MONEY_RE = /[\d,]+\.\d{2}/g;
const UNIT_RE = /^(PCS|NOS|KGS?|MTRS?|TONS?|MT|SETS?|BOX|PAIR|LTRS?|UNITS?)$/i;
const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

export type ParsedSupplierInvoiceItem = {
  description: string;
  hsn: string | null;
  unit: string | null;
  quantity: number;
  rate: number;
  gstRate: number;
  amount: number;
};

export type ParsedSupplierInvoice = {
  supplierName: string | null;
  supplierGstin: string | null;
  supplierInvoiceNo: string | null;
  billDate: string | null;
  vehicleNo: string | null;
  items: ParsedSupplierInvoiceItem[];
  taxableAmount: number | null;
  taxAmount: number | null;
  totalAmount: number | null;
  warnings: string[];
};

function toNumber(value: string): number {
  return Number(value.replace(/,/g, ""));
}

function money(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function parseDate(text: string): string | null {
  const match = DATE_RE.exec(text);
  if (!match) return null;
  const month = MONTHS[match[2].toLowerCase()];
  if (month == null) return null;
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  const date = new Date(Date.UTC(year, month, Number(match[1])));
  return Number.isNaN(date.getTime()) ? null : date.toISOString().slice(0, 10);
}

function lines(text: string): string[] {
  return text
    .split("\n")
    .map((line) => line.replace(/\s+/g, " ").trim())
    .filter(Boolean);
}

function valueAfterLabel(all: string[], label: RegExp): string | null {
  const index = all.findIndex((line) => label.test(line));
  if (index < 0) return null;
  const inline = all[index].replace(label, "").replace(/^[\s:.-]+/, "").trim();
  if (inline && !/[a-z]{3,}\.?\s*(no|date)/i.test(inline)) return inline.split(" ")[0];
  return all[index + 1]?.split(" ")[0] ?? null;
}

function supplierNameFrom(all: string[]): string | null {
  const titleIndex = all.findIndex((line) => /^(tax invoice|invoice|bill of supply)$/i.test(line));
  const candidate = titleIndex >= 0 ? all[titleIndex + 1] : null;
  if (candidate && !/gstin|original|duplicate/i.test(candidate)) return candidate;
  const signature = all.map((line) => /\bfor ([A-Z0-9 .&'()-]{3,})$/.exec(line)).find(Boolean);
  return signature?.[1]?.trim() ?? null;
}

/**
 * Tally-style item row: "1 <description> <numbers…> <HSN>". Column order differs
 * between suppliers, so qty/rate/amount are found by qty × rate ≈ amount.
 */
function parseItemLine(line: string, gstRate: number): ParsedSupplierInvoiceItem | null {
  const serial = /^(\d{1,3})\s+(.*)$/.exec(line);
  if (!serial) return null;
  const allTokens = serial[2].split(" ");
  const firstNumber = allTokens.findIndex(
    (token, i) =>
      /^[\d,]+\.\d+$/.test(token) ||
      (/^[\d,]+$/.test(token) && UNIT_RE.test(allTokens[i + 1] ?? ""))
  );
  if (firstNumber <= 0) return null;
  const description = allTokens.slice(0, firstNumber).join(" ").trim();
  if (!description || /^(total|cgst|sgst|igst)/i.test(description)) return null;

  const tokens = allTokens.slice(firstNumber);
  const numbers: { value: number; unit: string | null; isMoney: boolean }[] = [];
  let hsn: string | null = null;
  for (let i = 0; i < tokens.length; i += 1) {
    const token = tokens[i];
    if (/^\d{4,8}$/.test(token) && i === tokens.length - 1) {
      hsn = token;
      continue;
    }
    if (!/^[\d,]+(\.\d+)?$/.test(token)) continue;
    const next = tokens[i + 1];
    numbers.push({
      value: toNumber(token),
      unit: next && UNIT_RE.test(next) ? next.toUpperCase() : null,
      isMoney: /\.\d{2}$/.test(token),
    });
  }

  let best: {
    quantity: number;
    rate: number;
    amount: number;
    unit: string | null;
    score: number;
  } | null = null;
  for (const amount of numbers) {
    for (const quantity of numbers) {
      for (const rate of numbers) {
        if (amount === quantity || amount === rate || quantity === rate) continue;
        if (quantity.value <= 0 || rate.value <= 0) continue;
        if (Math.abs(quantity.value * rate.value - amount.value) > Math.max(1, amount.value * 0.005)) {
          continue;
        }
        // Qty is usually the unit-tagged whole number ("11,100 PCS"); rate is written as money.
        const score =
          (quantity.unit && !quantity.isMoney ? 2 : 0) + (rate.isMoney ? 1 : 0) + (amount.isMoney ? 1 : 0);
        if (
          !best ||
          amount.value > best.amount ||
          (amount.value === best.amount && score > best.score)
        ) {
          best = {
            quantity: quantity.value,
            rate: rate.value,
            amount: amount.value,
            unit: quantity.unit ?? amount.unit,
            score,
          };
        }
      }
    }
  }
  if (!best) return null;

  return {
    description,
    hsn,
    unit: best.unit,
    quantity: best.quantity,
    rate: best.rate,
    gstRate,
    amount: money(best.amount),
  };
}

function taxLineAmount(all: string[], tax: "CGST" | "SGST" | "IGST") {
  const line = all.find((row) => new RegExp(`^${tax}\\b`, "i").test(row));
  if (!line) return { amount: 0, rate: 0 };
  const rate = /(\d+(?:\.\d+)?)\s*%/.exec(line);
  const amounts = line.match(MONEY_RE) ?? [];
  return {
    amount: amounts.length ? toNumber(amounts[amounts.length - 1]) : 0,
    rate: rate ? Number(rate[1]) : 0,
  };
}

export function parseSupplierInvoiceText(text: string): ParsedSupplierInvoice {
  const all = lines(text.replace(/\r/g, ""));
  const warnings: string[] = [];

  const gstins = [...text.matchAll(GSTIN_RE)].map((match) => match[1]);
  const supplierGstin = gstins.find((gstin) => gstin !== COMPANY.gstin) ?? null;
  const supplierName = supplierNameFrom(all);
  const supplierInvoiceNo = valueAfterLabel(all, /^invoice no\.?/i);
  const billDate = parseDate(text);
  const vehicleLine = valueAfterLabel(all, /^motor vehicle no\.?/i);
  const vehicleNo =
    (vehicleLine && VEHICLE_RE.exec(vehicleLine)?.[1]) ?? VEHICLE_RE.exec(text)?.[1] ?? null;

  const cgst = taxLineAmount(all, "CGST");
  const sgst = taxLineAmount(all, "SGST");
  const igst = taxLineAmount(all, "IGST");
  const gstRate = igst.rate || cgst.rate + sgst.rate;
  const taxAmount = money(cgst.amount + sgst.amount + igst.amount);

  const items = all
    .map((line) => parseItemLine(line, gstRate))
    .filter((item): item is ParsedSupplierInvoiceItem => item != null);
  const taxableAmount = items.length
    ? money(items.reduce((sum, item) => sum + item.amount, 0))
    : null;

  const totalLine = all.find((line) => /^total\b.*₹/i.test(line));
  const totalMatch = totalLine?.match(MONEY_RE);
  const totalAmount = totalMatch ? toNumber(totalMatch[0]) : null;

  if (!supplierName) warnings.push("Could not find supplier name");
  if (!supplierInvoiceNo) warnings.push("Could not find invoice number");
  if (!billDate) warnings.push("Could not find bill date");
  if (items.length === 0) warnings.push("Could not read line items — add them manually");
  if (totalAmount == null) warnings.push("Could not find bill total");
  if (totalAmount != null && taxableAmount != null) {
    const computed = money(taxableAmount + taxAmount);
    if (Math.abs(computed - totalAmount) > 1) {
      warnings.push(
        `Lines + GST come to ₹${computed.toLocaleString("en-IN")} but the bill total is ₹${totalAmount.toLocaleString("en-IN")} — check the lines`
      );
    }
  }

  return {
    supplierName,
    supplierGstin,
    supplierInvoiceNo,
    billDate,
    vehicleNo,
    items,
    taxableAmount,
    taxAmount: taxAmount || null,
    totalAmount,
    warnings,
  };
}
