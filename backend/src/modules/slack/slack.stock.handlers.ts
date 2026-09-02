import type { App } from "@slack/bolt";
import type { WebClient } from "@slack/web-api";
import { createAdjustment } from "../inventory/inventory.service.js";
import { listProducts } from "../products/product.service.js";
import { ApiError } from "../../middleware/errorHandler.js";
import type { SlackConfig } from "./slack.config.js";
import {
  cancelFlowMessage,
  isAllowed,
  openDm,
  postOrUpdateMessage,
  selectedOptionValue,
} from "./slack.helpers.js";
import { clearSession, getStockSession, setStockSession } from "./slack.session.js";
import type { SlackStockSession } from "./slack.types.js";
import {
  stockAdjustModal,
  stockDirectionBlocks,
  stockSizeBlocks,
  stockStartBlocks,
  stockSuccessBlocks,
} from "./slack.stock.blocks.js";

function parsePositiveQuantity(raw: string | undefined) {
  const value = Number(raw?.trim());
  if (!Number.isFinite(value) || value <= 0) {
    throw new ApiError(400, "Quantity must be greater than 0");
  }
  return value;
}

export function registerStockHandlers(app: App, config: SlackConfig) {
  async function startStockFlow(client: WebClient, slackUserId: string) {
    const dmChannelId = await openDm(client, slackUserId);
    const products = await listProducts();
    const session: SlackStockSession = {
      flow: "stock",
      dmChannelId,
    };
    setStockSession(slackUserId, session);
    await postOrUpdateMessage(
      client,
      slackUserId,
      session,
      stockStartBlocks(products.map((p) => ({ id: p.id, name: p.name })))
    );
  }

  app.command("/stock", async ({ ack, command, client }) => {
    await ack();
    if (!isAllowed(config, command.user_id)) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: "You are not authorized to use Telly from Slack.",
      });
      return;
    }

    try {
      await startStockFlow(client, command.user_id);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Could not start stock flow";
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: message,
      });
    }
  });

  app.action("stock_product_select", async ({ ack, body, client, action }) => {
    await ack();
    const slackUserId = body.user.id;
    if (!isAllowed(config, slackUserId)) return;

    const session = getStockSession(slackUserId);
    if (!session) return;

    const selected = selectedOptionValue(action as { selected_option?: { value?: string } });
    if (!selected) return;

    const product = (await listProducts()).find((p) => p.id === selected);
    if (!product) return;

    session.productId = selected;
    setStockSession(slackUserId, session);
    await postOrUpdateMessage(client, slackUserId, session, stockSizeBlocks(product.name));
  });

  app.action("stock_size_select", async ({ ack, body, client, action }) => {
    await ack();
    const slackUserId = body.user.id;
    if (!isAllowed(config, slackUserId)) return;

    const session = getStockSession(slackUserId);
    if (!session?.productId) return;

    const value = selectedOptionValue(action as { selected_option?: { value?: string } });
    if (!value) return;

    session.sizeMm = Number(value);
    session.direction = undefined;
    setStockSession(slackUserId, session);

    const product = (await listProducts()).find((p) => p.id === session.productId);
    if (!product) return;

    await postOrUpdateMessage(
      client,
      slackUserId,
      session,
      stockDirectionBlocks(product.name, session.sizeMm)
    );
  });

  app.action("stock_direction_select", async ({ ack, body, action }) => {
    await ack();
    const slackUserId = body.user.id;
    if (!isAllowed(config, slackUserId)) return;

    const session = getStockSession(slackUserId);
    if (!session?.productId || session.sizeMm == null) return;

    const value = selectedOptionValue(action as { selected_option?: { value?: string } });
    if (value !== "increase" && value !== "decrease") return;

    session.direction = value;
    setStockSession(slackUserId, session);
  });

  app.action("stock_open_modal", async ({ ack, body, client }) => {
    await ack();
    const slackUserId = body.user.id;
    if (!isAllowed(config, slackUserId)) return;

    const session = getStockSession(slackUserId);
    if (!session?.productId || session.sizeMm == null || !session.direction) return;

    const triggerId = (body as { trigger_id?: string }).trigger_id;
    if (!triggerId) return;

    const product = (await listProducts()).find((p) => p.id === session.productId);
    if (!product) return;

    await client.views.open({
      trigger_id: triggerId,
      view: stockAdjustModal(session, product.name),
    });
  });

  app.view("stock_adjust_modal", async ({ ack, body, client, view }) => {
    const slackUserId = body.user.id;
    const session = getStockSession(slackUserId);

    try {
      if (!session?.productId || session.sizeMm == null || !session.direction) {
        throw new ApiError(400, "Session expired. Run `/stock` again.");
      }

      const quantity = parsePositiveQuantity(view.state.values.quantity_block?.quantity?.value);
      const signedQty = session.direction === "increase" ? quantity : -quantity;
      const reason = view.state.values.reason_block?.reason?.value?.trim() || undefined;

      const movement = await createAdjustment({
        productId: session.productId,
        sizeMm: session.sizeMm,
        quantity: signedQty,
        reason,
      });

      await ack();
      const productName = movement.product.name;
      await postOrUpdateMessage(
        client,
        slackUserId,
        session,
        stockSuccessBlocks(productName, session.sizeMm, signedQty, config.frontendUrl)
      );
      clearSession(slackUserId);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Invalid adjustment";
      await ack({
        response_action: "errors",
        errors: { quantity_block: message },
      });
    }
  });

  app.action("stock_cancel", async ({ ack, body, client }) => {
    await ack();
    await cancelFlowMessage(client, body, body.user.id, "Stock adjustment cancelled.");
  });
}
