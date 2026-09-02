import type { Express } from "express";
import { App, ExpressReceiver } from "@slack/bolt";
import { getSlackConfig } from "./slack.config.js";
import { registerBillHandlers } from "./slack.handlers.js";
import { registerRawMaterialHandlers } from "./slack.rawMaterial.handlers.js";
import { registerStockHandlers } from "./slack.stock.handlers.js";

export function registerSlack(expressApp: Express) {
  const config = getSlackConfig();
  if (!config.enabled) {
    console.log(
      "[slack] Bots disabled — set SLACK_BOT_TOKEN, SLACK_SIGNING_SECRET, and SLACK_ALLOWED_USER_IDS"
    );
    return;
  }

  const receiver = new ExpressReceiver({
    signingSecret: config.signingSecret,
    endpoints: "/api/slack/events",
  });

  const slackApp = new App({
    token: config.botToken,
    receiver,
  });

  registerBillHandlers(slackApp, config);
  registerStockHandlers(slackApp, config);
  registerRawMaterialHandlers(slackApp, config);

  expressApp.use(receiver.router);
  console.log("[slack] Bill, stock, and raw material bots enabled at POST /api/slack/events");
}
