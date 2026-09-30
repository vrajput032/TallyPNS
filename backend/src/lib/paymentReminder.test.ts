/**
 * Daily payment reminder grouping.
 * Run: npx tsx backend/src/lib/paymentReminder.test.ts
 */
import assert from "node:assert/strict";
import {
  buildPaymentReminder,
  daysUntilDue,
  istDateKey,
  reminderPayload,
  type ReminderInvoice,
} from "./paymentReminder.js";

// 30 Sep 2026, 05:30 UTC = 11:00 IST
const now = new Date("2026-09-30T05:30:00Z");

function invoice(overrides: Partial<ReminderInvoice>): ReminderInvoice {
  return {
    invoiceNo: "INV-1",
    invoiceDate: new Date("2026-09-01T06:00:00Z"),
    customerName: "Sharma Traders",
    paymentTermDays: 15,
    balanceAmount: 1000,
    ...overrides,
  };
}

assert.equal(istDateKey(new Date("2026-09-29T19:00:00Z")), "2026-09-30");
assert.equal(istDateKey(new Date("2026-09-29T18:00:00Z")), "2026-09-29");

assert.equal(daysUntilDue(invoice({}), now), -14);
assert.equal(daysUntilDue(invoice({ paymentTermDays: 0 }), now), null);
// Billed late evening IST on 22 Sep, 8-day term → due 30 Sep = today
assert.equal(
  daysUntilDue(invoice({ invoiceDate: new Date("2026-09-22T17:00:00Z"), paymentTermDays: 8 }), now),
  0
);

assert.equal(buildPaymentReminder([], now), null);
assert.equal(buildPaymentReminder([invoice({ balanceAmount: 0 })], now), null);
assert.equal(buildPaymentReminder([invoice({ paymentTermDays: 0 })], now), null);
// Due in 20 days: not yet worth a reminder
assert.equal(
  buildPaymentReminder([invoice({ invoiceDate: new Date("2026-09-25T06:00:00Z"), paymentTermDays: 25 })], now),
  null
);

const reminder = buildPaymentReminder(
  [
    invoice({ invoiceNo: "A", balanceAmount: 50000 }),
    invoice({ invoiceNo: "B", balanceAmount: 20000, invoiceDate: new Date("2026-08-01T06:00:00Z") }),
    invoice({ invoiceNo: "C", customerName: "Gupta Pipes", balanceAmount: 60000, paymentTermDays: 20 }),
    invoice({ invoiceNo: "D", customerName: "Verma", balanceAmount: 15000, invoiceDate: new Date("2026-09-28T06:00:00Z"), paymentTermDays: 7 }),
  ],
  now
);
assert.ok(reminder);
assert.equal(reminder.overdueCount, 3);
assert.equal(reminder.overdueAmount, 130000);
assert.equal(reminder.dueSoonCount, 1);
assert.equal(reminder.dueSoonAmount, 15000);
// Sharma owes 70k across two bills; Gupta 60k on one
assert.deepEqual(reminder.topOverdue, { customerName: "Sharma Traders", amount: 70000, daysLate: 45 });

const payload = reminderPayload(reminder);
assert.equal(payload.title, "Payment reminder: ₹1,45,000 to collect");
assert.equal(
  payload.body,
  "Overdue: 3 invoices, ₹1,30,000\nDue in 7 days: 1 invoice, ₹15,000\nBiggest: Sharma Traders ₹70,000 (45 days late)"
);
assert.equal(payload.url, "/sales?due=overdue");

const soonOnly = buildPaymentReminder(
  [invoice({ invoiceDate: new Date("2026-09-28T06:00:00Z"), paymentTermDays: 3 })],
  now
);
assert.ok(soonOnly);
assert.equal(soonOnly.topOverdue, null);
assert.equal(reminderPayload(soonOnly).url, "/sales?due=week");

console.log("paymentReminder tests passed");
