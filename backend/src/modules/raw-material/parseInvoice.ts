import { COMPANY } from "../../config/company.js";

const GSTIN_RE = /\b([0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z])\b/g;
const INVOICE_NO_RE = /\b([A-Z]{2,}[A-Z0-9]*\/\d{2}-\d{2}\/\d+)\b/;
const DATE_RE = /\b(\d{1,2}-[A-Za-z]{3}-\d{2,4})\b/;
const VEHICLE_RE = /\b([A-Z]{2}\d{2}[A-Z]{1,3}\d{4})\b/;
const ITEM_RE =
  /(\d+)\s+([0-9.]+X[0-9.]+)\s+([\d,]+\.\d{2})\s+KGS\s+([\d,]+\.\d{2})\s+([\d,]+\.\d{3})\s+KGS\s+(\d+)/gi;
const MONTHS: Record<string, number> = {
  Jan: 0,
  Feb: 1,
  Mar: 2,
  Apr: 3,
  May: 4,
  Jun: 5,
  Jul: 6,
  Aug: 7,
  Sep: 8,
  Oct: 9,
  Nov: 10,
  Dec: 11,
};

export type ParsedBillItem = {
  description: string;
  hsn: string | null;
  quantityKg: number;
  ratePerKg: number;
  amount: number;
};

export type ParsedRawMaterialBill = {
  billNo: string | null;
  supplierName: string | null;
  supplierGstin: string | null;
  billDate: string | null;
  vehicleNo: string | null;
  destination: string | null;
  taxableAmount: number | null;
  cgstAmount: number | null;
  sgstAmount: number | null;
  igstAmount: number | null;
  roundOff: number | null;
  totalAmount: number | null;
  totalKg: number | null;
  items: ParsedBillItem[];
  warnings: string[];
};

function parseIndianNumber(value: string): number {
  return Number(value.replace(/,/g, ""));
}

function money(value: number): number {
  return Math.round(value * 100) / 100;
}

function parseBillDate(raw: string): string | null {
  const match = raw.match(/^(\d{1,2})-([A-Za-z]{3})-(\d{2,4})$/);
  if (!match) return null;
  const day = Number(match[1]);
  const monthKey = match[2].slice(0, 1).toUpperCase() + match[2].slice(1).toLowerCase();
  const month = MONTHS[monthKey];
  if (month == null || !Number.isFinite(day)) return null;
  let year = Number(match[3]);
  if (year < 100) year += 2000;
  const date = new Date(Date.UTC(year, month, day));
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function firstMatch(text: string, regex: RegExp): string | null {
  const match = regex.exec(text);
  return match?.[1]?.trim() || null;
}

function captureAfterLabel(text: string, label: string): string | null {
  const regex = new RegExp(`${label}\\s*\\n\\s*([^\\n]+)`, "i");
  const match = regex.exec(text);
  const value = match?.[1]?.trim();
  if (!value) return null;
  if (/^(dated|mode|other|delivery|destination|motor|terms|invoice|e-way)/i.test(value)) {
    return null;
  }
  return value;
}

function lineAfter(text: string, marker: string): string | null {
  const index = text.toUpperCase().indexOf(marker.toUpperCase());
  if (index < 0) return null;
  const rest = text.slice(index + marker.length);
  const lines = rest.split("\n").map((line) => line.trim()).filter(Boolean);
  return lines[0] ?? null;
}

function parseItems(text: string): ParsedBillItem[] {
  const items: ParsedBillItem[] = [];
  const lines = text.split("\n");

  for (const match of text.matchAll(ITEM_RE)) {
    const spec = match[2];
    const amount = parseIndianNumber(match[3]);
    const ratePerKg = parseIndianNumber(match[4]);
    const quantityKg = parseIndianNumber(match[5]);
    const hsn = match[6];
    const matchIndex = match.index ?? 0;
    const after = text.slice(matchIndex + match[0].length, matchIndex + match[0].length + 80);
    const nextLine = after.split("\n").map((line) => line.trim()).find(Boolean);
    const goodsName =
      nextLine && !/^\d+\s/.test(nextLine) && !/cgst|sgst|igst|total|less/i.test(nextLine)
        ? nextLine
        : "STEEL TUBE";
    items.push({
      description: `${goodsName} ${spec}`.trim(),
      hsn,
      quantityKg,
      ratePerKg,
      amount: money(amount),
    });
  }

  if (items.length > 0) return items;

  for (let i = 0; i < lines.length; i += 1) {
    const line = lines[i];
    const qtyMatch = line.match(/([\d,]+\.\d{3})\s+KGS/i);
    const rateMatch = line.match(/\b([\d,]+\.\d{2})\b/);
    const hsnMatch = line.match(/\b(\d{6,8})\b/);
    if (!qtyMatch) continue;
    const quantityKg = parseIndianNumber(qtyMatch[1]);
    if (quantityKg <= 0 || quantityKg > 1_000_000) continue;
    const amountMatch = [...line.matchAll(/([\d,]+\.\d{2})/g)].map((m) => parseIndianNumber(m[1]));
    const amount = amountMatch.length > 0 ? amountMatch[0] : 0;
    const ratePerKg = rateMatch ? parseIndianNumber(rateMatch[1]) : 0;
    items.push({
      description: lines[i + 1]?.trim() || "Steel tube",
      hsn: hsnMatch?.[1] ?? null,
      quantityKg,
      ratePerKg,
      amount: money(amount),
    });
  }

  return items;
}

export function parseRawMaterialInvoiceText(text: string): ParsedRawMaterialBill {
  const warnings: string[] = [];
  const normalized = text.replace(/\r/g, "");

  const gstins = [...normalized.matchAll(GSTIN_RE)].map((match) => match[1]);
  const supplierGstin =
    gstins.find((gstin) => gstin !== COMPANY.gstin) ?? gstins[0] ?? null;

  const supplierName =
    lineAfter(normalized, "TAX INVOICE") ??
    firstMatch(normalized, /for\s+([A-Z0-9 .&'-]+)\n/i);

  const billNo = firstMatch(normalized, INVOICE_NO_RE);
  const rawDate = firstMatch(normalized, DATE_RE);
  const billDate = rawDate ? parseBillDate(rawDate) : null;
  const vehicleNo = firstMatch(normalized, VEHICLE_RE);
  const destination = captureAfterLabel(normalized, "Destination");

  const cgstMatch = /CGST(?:\s+OUTPUT)?(?:-?\s*9%)?\s+([\d,]+\.\d{2})/i.exec(normalized);
  const sgstMatch = /SGST(?:\s+OUTPUT)?(?:-?\s*9%)?\s+([\d,]+\.\d{2})/i.exec(normalized);
  const igstMatch = /IGST(?:\s+OUTPUT)?[^\n]*?([\d,]+\.\d{2})/i.exec(normalized);
  const cgstAmount = cgstMatch ? money(parseIndianNumber(cgstMatch[1])) : null;
  const sgstAmount = sgstMatch ? money(parseIndianNumber(sgstMatch[1])) : null;
  const igstAmount = igstMatch ? money(parseIndianNumber(igstMatch[1])) : null;

  let roundOff: number | null = null;
  const roundMatch = /ROUND OFF\s+\(-?\)\s*([\d,]+\.\d{2})/i.exec(normalized);
  if (roundMatch) {
    roundOff = -money(parseIndianNumber(roundMatch[1]));
  }

  let totalAmount: number | null = null;
  let totalKg: number | null = null;
  const totalMatch = /Total\s+₹\s*([\d,]+\.\d{2})\s+([\d,]+\.\d{3})\s+KGS/i.exec(normalized);
  if (totalMatch) {
    totalAmount = money(parseIndianNumber(totalMatch[1]));
    totalKg = parseIndianNumber(totalMatch[2]);
  } else {
    const rupeeMatch = /₹\s*([\d,]+\.\d{2})/.exec(normalized);
    if (rupeeMatch) totalAmount = money(parseIndianNumber(rupeeMatch[1]));
  }

  const items = parseItems(normalized);
  const itemsKg = items.reduce((sum, item) => sum + item.quantityKg, 0);
  const itemsAmount = money(items.reduce((sum, item) => sum + item.amount, 0));

  let taxableAmount: number | null = itemsAmount || null;
  if (!taxableAmount) {
    const cgstLine = /([\d,]+\.\d{2})\s*\n\s*CGST/i.exec(normalized);
    if (cgstLine) taxableAmount = money(parseIndianNumber(cgstLine[1]));
  }

  if (!billNo) warnings.push("Could not find invoice number");
  if (!billDate) warnings.push("Could not find bill date");
  if (!supplierName) warnings.push("Could not find supplier name");
  if (items.length === 0) warnings.push("Could not find line items — enter kg and rate manually");
  if (totalAmount == null) warnings.push("Could not find bill total");
  if (totalKg == null && itemsKg > 0) totalKg = Math.round(itemsKg * 1000) / 1000;

  return {
    billNo,
    supplierName,
    supplierGstin,
    billDate,
    vehicleNo,
    destination,
    taxableAmount,
    cgstAmount,
    sgstAmount,
    igstAmount,
    roundOff,
    totalAmount,
    totalKg,
    items,
    warnings,
  };
}
