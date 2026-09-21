import type { ActivityAction, ActivityModule } from "@prisma/client";
import type { Request } from "express";
import { prisma } from "../../lib/prisma.js";
import type { AuthPayload } from "../../middleware/auth.js";

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
};

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

/** Fire-and-forget. Must never fail the business request. */
export function recordActivity(input: RecordActivityInput): void {
  void writeActivity(input).catch((error) => {
    console.error("[activity] failed to record", error);
  });
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

export async function listActivity(opts: { module?: ActivityModule; limit?: number }) {
  const limit = Math.min(Math.max(opts.limit ?? 100, 1), 200);
  const logs = await prisma.activityLog.findMany({
    where: opts.module ? { module: opts.module } : undefined,
    orderBy: { createdAt: "desc" },
    take: limit,
  });
  return logs.map((log) => ({
    id: log.id,
    createdAt: log.createdAt,
    userId: log.userId,
    actorName: log.actorName,
    deviceName: log.deviceName,
    module: log.module,
    action: log.action,
    entityId: log.entityId,
    entityNo: log.entityNo,
    summary: log.summary,
    amount: log.amount != null ? Number(log.amount) : null,
    href: log.href,
  }));
}
