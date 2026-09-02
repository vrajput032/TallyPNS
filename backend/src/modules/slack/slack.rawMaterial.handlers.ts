import type { App } from "@slack/bolt";
import type { WebClient } from "@slack/web-api";
import { createRawMaterialBill } from "../raw-material/raw-material.service.js";
import { ApiError } from "../../middleware/errorHandler.js";
import type { SlackConfig } from "./slack.config.js";
import {
  cancelButtonBlock,
  cancelFlowMessage,
  errorBlocks,
  isAllowed,
  openDm,
  postOrUpdateMessage,
} from "./slack.helpers.js";
import {
  clearSession,
  getRawMaterialSession,
  setRawMaterialSession,
} from "./slack.session.js";
import type { SlackRawMaterialSession } from "./slack.types.js";
import {
  buildRawMaterialPayload,
  rawMaterialAfterLineBlocks,
  rawMaterialHeaderModal,
  rawMaterialLineModal,
  rawMaterialReviewBlocks,
  rawMaterialStartBlocks,
  rawMaterialSuccessBlocks,
  rawMaterialTotals,
} from "./slack.rawMaterial.blocks.js";

function parsePositiveNumber(raw: string | undefined, label: string) {
  const value = Number(raw?.trim());
  if (!Number.isFinite(value) || value < 0) {
    throw new ApiError(400, `${label} must be a valid number`);
  }
  return value;
}

function parsePositiveKg(raw: string | undefined) {
  const value = parsePositiveNumber(raw, "Quantity");
  if (value <= 0) {
    throw new ApiError(400, "Kg must be greater than 0");
  }
  return value;
}

export function registerRawMaterialHandlers(app: App, config: SlackConfig) {
  async function startRawMaterialFlow(client: WebClient, slackUserId: string) {
    const dmChannelId = await openDm(client, slackUserId);
    const session: SlackRawMaterialSession = {
      flow: "raw_material",
      dmChannelId,
      step: "header",
      lines: [],
    };
    setRawMaterialSession(slackUserId, session);
    await postOrUpdateMessage(client, slackUserId, session, rawMaterialStartBlocks());
  }

  app.command("/rawmat", async ({ ack, command, client }) => {
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
      await startRawMaterialFlow(client, command.user_id);
    } catch (error) {
      const message =
        error instanceof ApiError ? error.message : "Could not start raw material flow";
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: message,
      });
    }
  });

  app.action("rm_open_header_modal", async ({ ack, body, client }) => {
    await ack();
    const slackUserId = body.user.id;
    if (!isAllowed(config, slackUserId)) return;
    if (!getRawMaterialSession(slackUserId)) return;

    const triggerId = (body as { trigger_id?: string }).trigger_id;
    if (!triggerId) return;

    await client.views.open({
      trigger_id: triggerId,
      view: rawMaterialHeaderModal(),
    });
  });

  app.view("rm_header_modal", async ({ ack, body, client, view }) => {
    const slackUserId = body.user.id;
    const session = getRawMaterialSession(slackUserId);

    try {
      if (!session) {
        throw new ApiError(400, "Session expired. Run `/rawmat` again.");
      }

      const billNo = view.state.values.bill_no_block?.bill_no?.value?.trim();
      const supplierName = view.state.values.supplier_block?.supplier_name?.value?.trim();
      if (!billNo) throw new ApiError(400, "Bill number is required");
      if (!supplierName) throw new ApiError(400, "Supplier name is required");

      session.billNo = billNo;
      session.supplierName = supplierName;
      session.supplierGstin = view.state.values.gstin_block?.supplier_gstin?.value?.trim() || null;
      session.vehicleNo = view.state.values.vehicle_block?.vehicle_no?.value?.trim() || null;
      session.destination =
        view.state.values.destination_block?.destination?.value?.trim() || null;
      session.step = "after_line";
      setRawMaterialSession(slackUserId, session);

      await ack();
      await postOrUpdateMessage(
        client,
        slackUserId,
        session,
        [
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${billNo}* · ${supplierName}\nAdd at least one line item.`,
            },
          },
          {
            type: "actions",
            block_id: "rm_first_line_actions",
            elements: [
              {
                type: "button",
                action_id: "rm_open_line_modal",
                text: { type: "plain_text", text: "Add line" },
                style: "primary",
              },
            ],
          },
          cancelButtonBlock("rm_cancel"),
        ]
      );
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Invalid bill details";
      await ack({
        response_action: "errors",
        errors: { bill_no_block: message },
      });
    }
  });

  app.action("rm_open_line_modal", async ({ ack, body, client }) => {
    await ack();
    const slackUserId = body.user.id;
    if (!isAllowed(config, slackUserId)) return;
    if (!getRawMaterialSession(slackUserId)?.billNo) return;

    const triggerId = (body as { trigger_id?: string }).trigger_id;
    if (!triggerId) return;

    await client.views.open({
      trigger_id: triggerId,
      view: rawMaterialLineModal(),
    });
  });

  app.view("rm_line_modal", async ({ ack, body, client, view }) => {
    const slackUserId = body.user.id;
    const session = getRawMaterialSession(slackUserId);

    try {
      if (!session?.billNo || !session.supplierName) {
        throw new ApiError(400, "Session expired. Run `/rawmat` again.");
      }

      const description = view.state.values.description_block?.description?.value?.trim();
      if (!description) throw new ApiError(400, "Description is required");

      const quantityKg = parsePositiveKg(view.state.values.quantity_block?.quantity_kg?.value);
      const ratePerKg = parsePositiveNumber(
        view.state.values.rate_block?.rate_per_kg?.value,
        "Rate per kg"
      );

      session.lines.push({
        description,
        hsn: view.state.values.hsn_block?.hsn?.value?.trim() || null,
        quantityKg,
        ratePerKg,
      });
      session.step = "after_line";
      setRawMaterialSession(slackUserId, session);

      const totals = rawMaterialTotals(session.lines);
      await ack();
      await postOrUpdateMessage(
        client,
        slackUserId,
        session,
        rawMaterialAfterLineBlocks(session.lines.length, totals.totalKg)
      );
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Invalid line";
      await ack({
        response_action: "errors",
        errors: { description_block: message },
      });
    }
  });

  app.action("rm_review", async ({ ack, body, client }) => {
    await ack();
    const slackUserId = body.user.id;
    if (!isAllowed(config, slackUserId)) return;

    const session = getRawMaterialSession(slackUserId);
    if (!session || session.lines.length === 0) return;

    session.step = "review";
    setRawMaterialSession(slackUserId, session);
    await postOrUpdateMessage(
      client,
      slackUserId,
      session,
      rawMaterialReviewBlocks(session, config.frontendUrl)
    );
  });

  app.action("rm_confirm", async ({ ack, body, client }) => {
    await ack();
    const slackUserId = body.user.id;
    if (!isAllowed(config, slackUserId)) return;

    const session = getRawMaterialSession(slackUserId);
    if (!session || session.lines.length === 0) return;

    try {
      const bill = await createRawMaterialBill(buildRawMaterialPayload(session));
      await postOrUpdateMessage(
        client,
        slackUserId,
        session,
        rawMaterialSuccessBlocks(bill.billNo, bill.id, config.frontendUrl)
      );
      clearSession(slackUserId);
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to create bill";
      await postOrUpdateMessage(client, slackUserId, session, errorBlocks(message));
    }
  });

  app.action("rm_cancel", async ({ ack, body, client }) => {
    await ack();
    await cancelFlowMessage(client, body, body.user.id, "Raw material bill cancelled.");
  });
}
