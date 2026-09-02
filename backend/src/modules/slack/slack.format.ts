import type { SlackLineDraft } from "./slack.types.js";

export function formatInr(value: number) {
  return value.toLocaleString("en-IN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}

export function lineAmount(line: SlackLineDraft) {
  const base = line.quantity * line.rate;
  return base + (base * line.gstRate) / 100;
}

export function invoiceGrandTotal(lines: SlackLineDraft[]) {
  return lines.reduce((sum, line) => sum + lineAmount(line), 0);
}

export function truncateSlackText(value: string, max = 75) {
  const trimmed = value.trim();
  if (trimmed.length <= max) return trimmed;
  return `${trimmed.slice(0, max - 1)}…`;
}
