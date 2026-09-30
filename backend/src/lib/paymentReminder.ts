const MS_PER_DAY = 24 * 60 * 60 * 1000;
const IST_OFFSET_MS = 5.5 * 60 * 60 * 1000;
/** Invoices due within this many days (inclusive) count as "due soon". */
export const DUE_SOON_DAYS = 7;

/** Bundled in frontend/public; used when the OS supports custom notification sounds. */
export const PAYMENT_REMINDER_SOUND_URL = "/sounds/money-money.mp3";

export type ReminderInvoice = {
  invoiceNo: string;
  invoiceDate: Date;
  customerName: string;
  paymentTermDays: number;
  balanceAmount: number;
};

export type PaymentReminder = {
  overdueCount: number;
  overdueAmount: number;
  dueSoonCount: number;
  dueSoonAmount: number;
  /** Customer with the largest overdue balance, if anything is overdue */
  topOverdue: { customerName: string; amount: number; daysLate: number } | null;
};

export type PushPayload = {
  title: string;
  body: string;
  url: string;
  tag: string;
  /** When true with soundUrl, use custom clip (payment reminders). */
  playSound?: boolean;
  soundUrl?: string;
  /** When true, OS may hide the banner (avoid for operational alerts). */
  silent?: boolean;
};

/** Calendar date in India (YYYY-MM-DD). */
export function istDateKey(date: Date): string {
  return new Date(date.getTime() + IST_OFFSET_MS).toISOString().slice(0, 10);
}

function daysBetweenKeys(fromKey: string, toKey: string): number {
  return Math.round((Date.parse(toKey) - Date.parse(fromKey)) / MS_PER_DAY);
}

/** Days until due in IST (negative = overdue); null when the customer has no payment term. */
export function daysUntilDue(invoice: ReminderInvoice, now: Date): number | null {
  if (invoice.paymentTermDays <= 0) return null;
  const dueDate = new Date(invoice.invoiceDate.getTime() + invoice.paymentTermDays * MS_PER_DAY);
  return daysBetweenKeys(istDateKey(now), istDateKey(dueDate));
}

export function buildPaymentReminder(invoices: ReminderInvoice[], now: Date): PaymentReminder | null {
  let overdueCount = 0;
  let overdueAmount = 0;
  let dueSoonCount = 0;
  let dueSoonAmount = 0;
  const overdueByCustomer = new Map<string, { amount: number; daysLate: number }>();

  for (const invoice of invoices) {
    if (invoice.balanceAmount <= 0.009) continue;
    const days = daysUntilDue(invoice, now);
    if (days === null) continue;
    if (days < 0) {
      overdueCount += 1;
      overdueAmount += invoice.balanceAmount;
      const current = overdueByCustomer.get(invoice.customerName) ?? { amount: 0, daysLate: 0 };
      overdueByCustomer.set(invoice.customerName, {
        amount: current.amount + invoice.balanceAmount,
        daysLate: Math.max(current.daysLate, -days),
      });
    } else if (days <= DUE_SOON_DAYS) {
      dueSoonCount += 1;
      dueSoonAmount += invoice.balanceAmount;
    }
  }

  if (overdueCount === 0 && dueSoonCount === 0) return null;

  let topOverdue: PaymentReminder["topOverdue"] = null;
  for (const [customerName, row] of overdueByCustomer) {
    if (!topOverdue || row.amount > topOverdue.amount) {
      topOverdue = { customerName, amount: row.amount, daysLate: row.daysLate };
    }
  }

  return {
    overdueCount,
    overdueAmount: Math.round(overdueAmount * 100) / 100,
    dueSoonCount,
    dueSoonAmount: Math.round(dueSoonAmount * 100) / 100,
    topOverdue,
  };
}

export function formatRupees(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

function invoices(count: number): string {
  return `${count} invoice${count === 1 ? "" : "s"}`;
}

export function reminderPayload(reminder: PaymentReminder): PushPayload {
  const total = reminder.overdueAmount + reminder.dueSoonAmount;
  const lines: string[] = [];
  if (reminder.overdueCount > 0) {
    lines.push(`Overdue: ${invoices(reminder.overdueCount)}, ${formatRupees(reminder.overdueAmount)}`);
  }
  if (reminder.dueSoonCount > 0) {
    lines.push(
      `Due in ${DUE_SOON_DAYS} days: ${invoices(reminder.dueSoonCount)}, ${formatRupees(reminder.dueSoonAmount)}`
    );
  }
  if (reminder.topOverdue) {
    const { customerName, amount, daysLate } = reminder.topOverdue;
    lines.push(`Biggest: ${customerName} ${formatRupees(amount)} (${daysLate} day${daysLate === 1 ? "" : "s"} late)`);
  }
  return {
    title: `Payment reminder: ${formatRupees(total)} to collect`,
    body: lines.join("\n"),
    url: reminder.overdueCount > 0 ? "/sales?due=overdue" : "/sales?due=week",
    tag: "payment-reminder",
    playSound: true,
    soundUrl: PAYMENT_REMINDER_SOUND_URL,
  };
}
