import type { PushSubscription } from "@prisma/client";
import webpush, { WebPushError } from "web-push";
import { z } from "zod";
import { activeOnly } from "../../lib/activeRecords.js";
import {
  buildPaymentReminder,
  istDateKey,
  PAYMENT_REMINDER_SOUND_URL,
  reminderPayload,
  type PushPayload,
} from "../../lib/paymentReminder.js";
import { prisma } from "../../lib/prisma.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { withPaymentSummary } from "../payments/payment.utils.js";
import { getPushConfig } from "./notifications.config.js";
import type { pushSubscriptionSchema } from "./notifications.schema.js";

const REMINDER_TTL_SECONDS = 12 * 60 * 60;

let vapidConfigured = false;

function configurePushIfEnabled(): boolean {
  const cfg = getPushConfig();
  if (!cfg.enabled) return false;
  if (!vapidConfigured) {
    webpush.setVapidDetails(cfg.subject, cfg.publicKey, cfg.privateKey);
    vapidConfigured = true;
  }
  return true;
}

function requirePush() {
  if (!configurePushIfEnabled()) {
    throw new ApiError(503, "Push notifications are not configured on the server");
  }
  return getPushConfig();
}

export function getPublicKey() {
  const cfg = getPushConfig();
  return { enabled: cfg.enabled, publicKey: cfg.enabled ? cfg.publicKey : null };
}

export async function subscribe(userId: string, data: z.infer<typeof pushSubscriptionSchema>) {
  requirePush();
  const fields = {
    userId,
    p256dh: data.keys.p256dh,
    auth: data.keys.auth,
    deviceName: data.deviceName ?? null,
  };
  const row = await prisma.pushSubscription.upsert({
    where: { endpoint: data.endpoint },
    create: { endpoint: data.endpoint, ...fields },
    update: fields,
  });
  return { id: row.id };
}

export async function unsubscribe(userId: string, endpoint: string) {
  await prisma.pushSubscription.deleteMany({ where: { endpoint, userId } });
}

type SendResult = { sent: number; removed: number; failed: number };

/** APNs only accepts certain Web Push topics; arbitrary tags like `ops-inventory` return 400 BadWebPushTopic. */
function webPushRequestOptions(payload: PushPayload): Parameters<typeof webpush.sendNotification>[2] {
  const options: Parameters<typeof webpush.sendNotification>[2] = {
    TTL: REMINDER_TTL_SECONDS,
    urgency: "high",
  };
  if (payload.tag.startsWith("payment-reminder")) {
    options.topic = payload.tag;
  }
  return options;
}

/** Sends to each device; drops subscriptions the push service says are gone. */
async function sendToSubscriptions(subs: PushSubscription[], payload: PushPayload) {
  const body = JSON.stringify(payload);
  const pushOptions = webPushRequestOptions(payload);
  const result: SendResult = { sent: 0, removed: 0, failed: 0 };
  const delivered: string[] = [];

  await Promise.all(
    subs.map(async (sub) => {
      try {
        await webpush.sendNotification(
          { endpoint: sub.endpoint, keys: { p256dh: sub.p256dh, auth: sub.auth } },
          body,
          pushOptions
        );
        result.sent += 1;
        delivered.push(sub.id);
      } catch (error) {
        if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) {
          await prisma.pushSubscription.delete({ where: { id: sub.id } }).catch(() => undefined);
          result.removed += 1;
          return;
        }
        result.failed += 1;
        console.error("[push] send failed", sub.deviceName ?? sub.id, error);
      }
    })
  );

  return { result, delivered };
}

async function currentReminder(now: Date) {
  const invoices = await prisma.salesInvoice.findMany({
    where: { ...activeOnly, customer: { paymentTermDays: { gt: 0 } } },
    select: {
      invoiceNo: true,
      invoiceDate: true,
      totalAmount: true,
      customer: { select: { name: true, paymentTermDays: true } },
      receipts: { select: { amount: true } },
    },
  });
  return buildPaymentReminder(
    invoices.map((invoice) => ({
      invoiceNo: invoice.invoiceNo,
      invoiceDate: invoice.invoiceDate,
      customerName: invoice.customer.name,
      paymentTermDays: invoice.customer.paymentTermDays,
      balanceAmount: withPaymentSummary(invoice).balanceAmount,
    })),
    now
  );
}

/** Test push to one of the caller's own devices, using today's real numbers when there are any. */
export async function sendTest(userId: string, endpoint: string) {
  requirePush();
  const sub = await prisma.pushSubscription.findFirst({ where: { endpoint, userId } });
  if (!sub) throw new ApiError(404, "Reminders are not turned on for this device");

  const reminder = await currentReminder(new Date());
  const payload: PushPayload = reminder
    ? reminderPayload(reminder)
    : {
        title: "Payment reminders are on",
        body: "Nothing is overdue or due in the next 7 days. You'll get a reminder at 11:00 AM when something is.",
        url: "/sales",
        tag: "payment-reminder",
        playSound: true,
        soundUrl: PAYMENT_REMINDER_SOUND_URL,
      };
  const { result } = await sendToSubscriptions([sub], payload);
  if (result.removed > 0) throw new ApiError(410, "This device's subscription expired. Turn reminders on again.");
  if (result.sent === 0) throw new ApiError(502, "Could not deliver the test notification");
  return result;
}

/** Daily cron: one reminder per device per IST day. `force` resends even if already sent today. */
export async function runDailyReminders({ force = false, now = new Date() } = {}) {
  requirePush();
  const today = istDateKey(now);
  const reminder = await currentReminder(now);
  if (!reminder) return { date: today, skipped: "Nothing overdue or due soon", sent: 0, removed: 0, failed: 0 };

  const subs = await prisma.pushSubscription.findMany({
    where: force ? {} : { OR: [{ lastReminderOn: null }, { lastReminderOn: { not: today } }] },
  });
  requirePush();
  const { result, delivered } = await sendToSubscriptions(subs, reminderPayload(reminder));
  if (delivered.length > 0) {
    await prisma.pushSubscription.updateMany({
      where: { id: { in: delivered } },
      data: { lastReminderOn: today },
    });
  }
  return { date: today, reminder, ...result };
}

/** Scheduled test: every subscribed device gets a push (ignores invoice state and daily dedup). */
export async function runTestBroadcastToAllDevices(now = new Date()) {
  requirePush();
  const subs = await prisma.pushSubscription.findMany();
  if (subs.length === 0) {
    return { date: istDateKey(now), skipped: "No devices subscribed", sent: 0, removed: 0, failed: 0 };
  }

  const payload: PushPayload = {
    title: "PNS ERP — reminder test",
    body: "2:00 PM IST test push. If you hear this, notifications are working on this device.",
    url: "/",
    tag: "payment-reminder-test",
    playSound: true,
    soundUrl: PAYMENT_REMINDER_SOUND_URL,
  };
  const { result } = await sendToSubscriptions(subs, payload);
  return { date: istDateKey(now), devices: subs.length, ...result };
}

/** Fire-and-forget: all devices with reminders on (no custom sound). */
export function broadcastOperationalNotification(input: {
  title: string;
  body: string;
  url: string;
  tag?: string;
}): void {
  void (async () => {
    if (!configurePushIfEnabled()) return;
    const subs = await prisma.pushSubscription.findMany();
    if (subs.length === 0) return;
    const url = input.url.startsWith("/") ? input.url : `/${input.url}`;
    const payload: PushPayload = {
      title: input.title,
      body: input.body,
      url,
      tag: `${input.tag ?? "operational"}-${Date.now()}`,
      playSound: true,
      silent: false,
    };
    await sendToSubscriptions(subs, payload);
  })().catch((error) => {
    console.error("[push] operational notification failed", error);
  });
}
