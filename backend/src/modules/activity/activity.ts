import { Prisma, type ActivityAction, type ActivityModule } from "@prisma/client";
import type { Request } from "express";
import { prisma } from "../../lib/prisma.js";
import type { AuthPayload } from "../../middleware/auth.js";
import { broadcastOperationalNotification } from "../notifications/notifications.service.js";

export type RecordActivityInput = {
  user?: AuthPayload | null;
  actorName?: string;
  deviceName?: string | null;
  module: ActivityModule;
  action: ActivityAction;
  entityId?: string | null;
  entityNo?: string | null;
  summary: string;
  amount?: number | string | null;
  href?: string | null;
  /** Push to all subscribed devices (inventory, sales, purchase, etc.). */
  notifyDevices?: boolean;
};

function pushTitleForModule(module: ActivityModule): string {
  switch (module) {
    case "SALES":
      return "Sales";
    case "PURCHASE":
      return "Purchase";
    case "RAW_MATERIAL":
      return "Raw material";
    case "INVENTORY":
      return "Inventory";
    case "PAYMENT":
      return "Payment";
    case "AUTH":
      return "Login";
    default: {
      const _exhaustive: never = module;
      return _exhaustive;
    }
  }
}

function toAmount(value: number | string | null | undefined): number | null {
  if (value == null || value === "") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}

async function writeActivity(input: RecordActivityInput) {
  await prisma.activityLog.create({
    data: {
      userId: input.user?.sub ?? null,
      actorName: input.actorName?.trim() || input.user?.username || "Unknown",
      deviceName: input.deviceName?.trim() || input.user?.deviceName?.trim() || null,
      module: input.module,
      action: input.action,
      entityId: input.entityId ?? null,
      entityNo: input.entityNo ?? null,
      summary: input.summary,
      amount: toAmount(input.amount),
      href: input.href ?? null,
    },
  });
}

function pushForActivity(input: RecordActivityInput): void {
  if (!input.notifyDevices) return;
  const actor = input.actorName?.trim() || input.user?.username || "Someone";
  const body =
    actor !== "Slack" && !input.summary.includes(actor)
      ? `${actor}: ${input.summary}`
      : input.summary;
  broadcastOperationalNotification({
    title: pushTitleForModule(input.module),
    body,
    url: input.href?.trim() || "/",
    tag: `ops-${input.module.toLowerCase()}`,
  });
}

/** Fire-and-forget. Must never fail the business request. */
export function recordActivity(input: RecordActivityInput): void {
  void writeActivity(input).catch((error) => {
    console.error("[activity] failed to record", error);
  });
  pushForActivity(input);
}

export function recordRequestActivity(
  req: Request,
  input: Omit<RecordActivityInput, "user" | "actorName" | "deviceName">
): void {
  recordActivity({
    ...input,
    user: req.user ?? null,
    actorName: req.user?.username ?? "Unknown",
    deviceName: req.user?.deviceName ?? null,
  });
}

type ActivityListRow = {
  id: string;
  createdAt: Date;
  userId: string | null;
  actorName: string;
  deviceName: string | null;
  module: string;
  action: string;
  entityId: string | null;
  entityNo: string | null;
  summary: string;
  amount: { toString(): string } | number | null;
  href: string | null;
};

export async function listActivity(opts: { module?: ActivityModule; limit?: number }) {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 200);
  const moduleFilter = opts.module
    ? Prisma.sql`WHERE module::text = ${opts.module}`
    : Prisma.empty;
  const logs = await prisma.$queryRaw<ActivityListRow[]>(Prisma.sql`
    SELECT
      id,
      "createdAt",
      "userId",
      "actorName",
      "deviceName",
      module::text AS module,
      action::text AS action,
      "entityId",
      "entityNo",
      summary,
      amount,
      href
    FROM "ActivityLog"
    ${moduleFilter}
    ORDER BY "createdAt" DESC
    LIMIT ${limit}
  `);
  return logs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt,
    userId: log.userId,
    actorName: log.actorName,
    deviceName: log.deviceName,
    module: log.module as ActivityModule,
    action: log.action as ActivityAction,
    entityId: log.entityId,
    entityNo: log.entityNo,
    summary: log.summary,
    amount: log.amount != null ? Number(log.amount) : null,
    href: log.href,
  }));
}
