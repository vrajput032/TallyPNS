import { Router } from "express";
import { asyncHandler } from "../../middleware/asyncHandler.js";
import { requireAuth } from "../../middleware/auth.js";
import { ApiError } from "../../middleware/errorHandler.js";
import { getPushConfig } from "./notifications.config.js";
import { pushEndpointSchema, pushSubscriptionSchema } from "./notifications.schema.js";
import * as notificationsService from "./notifications.service.js";

export const notificationsRouter = Router();

notificationsRouter.get(
  "/vapid-public-key",
  requireAuth,
  asyncHandler(async (_req, res) => {
    res.json(notificationsService.getPublicKey());
  })
);

notificationsRouter.post(
  "/subscriptions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const data = pushSubscriptionSchema.parse(req.body);
    res.status(201).json(await notificationsService.subscribe(req.user!.sub, data));
  })
);

notificationsRouter.delete(
  "/subscriptions",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { endpoint } = pushEndpointSchema.parse(req.body);
    await notificationsService.unsubscribe(req.user!.sub, endpoint);
    res.status(204).end();
  })
);

notificationsRouter.post(
  "/test",
  requireAuth,
  asyncHandler(async (req, res) => {
    const { endpoint } = pushEndpointSchema.parse(req.body);
    res.json(await notificationsService.sendTest(req.user!.sub, endpoint));
  })
);

/** Daily scheduler (GitHub Actions): header X-Notifications-Cron-Secret; `?force=1` resends today. */
notificationsRouter.post(
  "/cron",
  asyncHandler(async (req, res) => {
    const cfg = getPushConfig();
    const secret = req.header("x-notifications-cron-secret")?.trim() ?? "";
    if (!cfg.cronSecret || secret !== cfg.cronSecret) {
      throw new ApiError(401, "Invalid cron secret");
    }
    res.json(await notificationsService.runDailyReminders({ force: req.query.force === "1" }));
  })
);

/** 2 PM IST test broadcast (GitHub Actions): same cron secret as `/cron`. */
notificationsRouter.post(
  "/cron/test-broadcast",
  asyncHandler(async (req, res) => {
    const cfg = getPushConfig();
    const secret = req.header("x-notifications-cron-secret")?.trim() ?? "";
    if (!cfg.cronSecret || secret !== cfg.cronSecret) {
      throw new ApiError(401, "Invalid cron secret");
    }
    res.json(await notificationsService.runTestBroadcastToAllDevices());
  })
);
