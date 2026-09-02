import type { App } from "@slack/bolt";
import type { WebClient } from "@slack/web-api";
import { listCustomers } from "../customers/customer.service.js";
import { listProducts } from "../products/product.service.js";
import { createSalesInvoice } from "../sales/sales.service.js";
import { ApiError } from "../../middleware/errorHandler.js";
import type { SlackConfig } from "./slack.config.js";
import {
  afterLineBlocks,
  catalogLineModal,
  customerStepBlocks,
  fallbackText,
  manualLineModal,
  productStepBlocks,
  reviewBlocks,
  sizeStepBlocks,
  successBlocks,
} from "./slack.blocks.js";
import {
  cancelFlowMessage,
  errorBlocks,
  isAllowed,
  openDm,
  postOrUpdateMessage,
  selectedOptionValue,
} from "./slack.helpers.js";
import { clearSession, getBillSession, setBillSession } from "./slack.session.js";
import type { SlackBillSession, SlackLineDraft } from "./slack.types.js";

function parsePositiveNumber(raw: string | undefined, label: string) {
  const value = Number(raw?.trim());
  if (!Number.isFinite(value) || value < 0) {
    throw new ApiError(400, `${label} must be a valid number`);
  }
  return value;
}

function parseQuantity(raw: string | undefined) {
  const value = parsePositiveNumber(raw, "Quantity");
  if (value <= 0) {
    throw new ApiError(400, "Quantity must be greater than 0");
  }
  return value;
}

async function postBillMessage(
  client: WebClient,
  slackUserId: string,
  session: SlackBillSession,
  blocks: ReturnType<typeof customerStepBlocks>
) {
  await postOrUpdateMessage(client, slackUserId, session, blocks, fallbackText(blocks));
}

async function startBillFlow(client: WebClient, slackUserId: string) {
  const dmChannelId = await openDm(client, slackUserId);
  const customers = await listCustomers();
  const session: SlackBillSession = {
    flow: "bill",
    dmChannelId,
    step: "customer",
    lines: [],
    transport: "REGULAR",
  };
  setBillSession(slackUserId, session);
  await postBillMessage(client, slackUserId, session, customerStepBlocks(customers));
}

async function lineLabels(lines: SlackLineDraft[]) {
  const products = await listProducts();
  const productMap = new Map(products.map((p) => [p.id, p.name]));
  return lines.map((line) => {
    if (line.isManual) return line.description?.trim() || "Manual item";
    const name = productMap.get(line.productId ?? "") ?? "Product";
    const size = line.sizeMm ? ` ${line.sizeMm}mm` : "";
    return `${name}${size}`;
  });
}

function buildCreatePayload(session: SlackBillSession) {
  if (!session.customerId) {
    throw new ApiError(400, "Customer is required");
  }
  if (session.lines.length === 0) {
    throw new ApiError(400, "Add at least one line item");
  }

  return {
    customerId: session.customerId,
    transport: session.transport,
    items: session.lines.map((line) => {
      if (line.isManual) {
        return {
          productId: null,
          description: line.description?.trim() || null,
          hsn: line.hsn?.trim() || null,
          unit: line.unit?.trim() || "NOS",
          sizeMm: null,
          quantity: line.quantity,
          rate: line.rate,
          gstRate: line.gstRate,
        };
      }
      return {
        productId: line.productId,
        description: null,
        hsn: null,
        unit: null,
        sizeMm:
          line.sizeMm != null && !Number.isNaN(line.sizeMm) && line.sizeMm > 0
            ? line.sizeMm
            : null,
        quantity: line.quantity,
        rate: line.rate,
        gstRate: line.gstRate,
      };
    }),
  };
}

export function registerBillHandlers(app: App, config: SlackConfig) {
  async function ensureSession(
    slackUserId: string,
    client: WebClient
  ): Promise<SlackBillSession | null> {
    const session = getBillSession(slackUserId);
    if (!session) {
      await client.chat.postMessage({
        channel: await openDm(client, slackUserId),
        text: "Start a new bill with `/bill`.",
      });
      return null;
    }
    return session;
  }

  async function showReviewStep(client: WebClient, slackUserId: string, session: SlackBillSession) {
    const customers = await listCustomers();
    const customer = customers.find((c) => c.id === session.customerId);
    if (!customer) {
      throw new ApiError(400, "Customer not found");
    }
    session.step = "review";
    const labels = await lineLabels(session.lines);
    await postOrUpdateMessage(
      client,
      slackUserId,
      session,
      reviewBlocks(customer.name, session.lines, labels, config.frontendUrl)
    );
  }

  app.command("/bill", async ({ ack, command, client }) => {
    await ack();
    if (!isAllowed(config, command.user_id)) {
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: "You are not authorized to create bills from Slack.",
      });
      return;
    }

    try {
      await startBillFlow(client, command.user_id);
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Could not start bill flow";
      await client.chat.postEphemeral({
        channel: command.channel_id,
        user: command.user_id,
        text: message,
      });
    }
  });

  app.action("bill_customer_select", async ({ ack, body, client, action }) => {
    await ack();
    const slackUserId = body.user.id;
    if (!isAllowed(config, slackUserId)) return;

    const session = await ensureSession(slackUserId, client);
    if (!session) return;

    const selected = selectedOptionValue(action as { selected_option?: { value?: string } });
    if (!selected) return;

    session.customerId = selected;
    session.step = "product";
    session.draftProductId = undefined;
    session.draftSizeMm = undefined;

    const products = await listProducts();
    await postOrUpdateMessage(client, slackUserId, session, productStepBlocks(products));
  });

  app.action("bill_product_select", async ({ ack, body, client, action }) => {
    await ack();
    const slackUserId = body.user.id;
    if (!isAllowed(config, slackUserId)) return;

    const session = await ensureSession(slackUserId, client);
    if (!session) return;

    try {
      const selected = selectedOptionValue(action as { selected_option?: { value?: string } });
      if (!selected) return;

      const products = await listProducts();
      const product = products.find((p) => p.id === selected);
      if (!product) return;

      session.draftProductId = selected;
      session.draftSizeMm = undefined;
      session.step = "size";
      setBillSession(slackUserId, session);
      await postOrUpdateMessage(
        client,
        slackUserId,
        session,
        sizeStepBlocks(product.name)
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Could not load product step";
      const session = getBillSession(slackUserId);
      if (session) {
        await postOrUpdateMessage(client, slackUserId, session, errorBlocks(message));
      }
    }
  });

  app.action("bill_size_select", async ({ ack, body, action }) => {
    await ack();
    const slackUserId = body.user.id;
    if (!isAllowed(config, slackUserId)) return;

    const session = getBillSession(slackUserId);
    if (!session) return;

    const value = selectedOptionValue(action as { selected_option?: { value?: string } });
    if (!value || value === "skip") {
      session.draftSizeMm = null;
    } else {
      session.draftSizeMm = Number(value);
    }
    setBillSession(slackUserId, session);
  });

  app.action("bill_open_catalog_modal", async ({ ack, body, client }) => {
    await ack();
    const slackUserId = body.user.id;
    if (!isAllowed(config, slackUserId)) return;

    const session = getBillSession(slackUserId);
    if (!session?.draftProductId) return;

    const products = await listProducts();
    const product = products.find((p) => p.id === session.draftProductId);
    if (!product) return;

    const triggerId = (body as { trigger_id?: string }).trigger_id;
    if (!triggerId) return;

    await client.views.open({
      trigger_id: triggerId,
      view: catalogLineModal(session, product.name, {
        rate: Number(product.price),
        gstRate: Number(product.gstRate),
      }),
    });
  });

  app.action("bill_open_manual_modal", async ({ ack, body, client }) => {
    await ack();
    const slackUserId = body.user.id;
    if (!isAllowed(config, slackUserId)) return;

    if (!getBillSession(slackUserId)) return;

    const triggerId = (body as { trigger_id?: string }).trigger_id;
    if (!triggerId) return;

    await client.views.open({
      trigger_id: triggerId,
      view: manualLineModal(),
    });
  });

  app.view("bill_catalog_modal", async ({ ack, body, client, view }) => {
    const slackUserId = body.user.id;
    const session = getBillSession(slackUserId);

    try {
      if (!session?.draftProductId) {
        throw new ApiError(400, "Session expired. Run `/bill` again.");
      }

      const quantity = parseQuantity(view.state.values.quantity_block?.quantity?.value);
      const rate = parsePositiveNumber(view.state.values.rate_block?.rate?.value, "Rate");
      const gstRate = parsePositiveNumber(view.state.values.gst_block?.gst_rate?.value, "GST %");
      if (gstRate > 100) {
        throw new ApiError(400, "GST % cannot exceed 100");
      }

      session.lines.push({
        isManual: false,
        productId: session.draftProductId,
        sizeMm: session.draftSizeMm ?? null,
        quantity,
        rate,
        gstRate,
      });
      session.draftProductId = undefined;
      session.draftSizeMm = undefined;
      session.step = "after_line";
      setBillSession(slackUserId, session);

      await ack();
      await postOrUpdateMessage(
        client,
        slackUserId,
        session,
        afterLineBlocks(session.lines.length)
      );
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Invalid line details";
      await ack({
        response_action: "errors",
        errors: {
          quantity_block: message,
        },
      });
    }
  });

  app.view("bill_manual_modal", async ({ ack, body, client, view }) => {
    const slackUserId = body.user.id;
    const session = getBillSession(slackUserId);

    try {
      if (!session) {
        throw new ApiError(400, "Session expired. Run `/bill` again.");
      }

      const description = view.state.values.description_block?.description?.value?.trim();
      if (!description) {
        throw new ApiError(400, "Description is required");
      }

      const quantity = parseQuantity(view.state.values.quantity_block?.quantity?.value);
      const rate = parsePositiveNumber(view.state.values.rate_block?.rate?.value, "Rate");
      const gstRate = parsePositiveNumber(view.state.values.gst_block?.gst_rate?.value, "GST %");

      session.lines.push({
        isManual: true,
        description,
        unit: "NOS",
        quantity,
        rate,
        gstRate,
      });
      session.step = "after_line";
      setBillSession(slackUserId, session);

      await ack();
      await postOrUpdateMessage(
        client,
        slackUserId,
        session,
        afterLineBlocks(session.lines.length)
      );
    } catch (error) {
      const message = error instanceof ApiError ? error.message : "Invalid line details";
      await ack({
        response_action: "errors",
        errors: {
          description_block: message,
        },
      });
    }
  });

  app.action("bill_add_product", async ({ ack, body, client }) => {
    await ack();
    const slackUserId = body.user.id;
    if (!isAllowed(config, slackUserId)) return;

    const session = await ensureSession(slackUserId, client);
    if (!session) return;

    session.step = "product";
    session.draftProductId = undefined;
    session.draftSizeMm = undefined;
    const products = await listProducts();
    await postOrUpdateMessage(client, slackUserId, session, productStepBlocks(products));
  });

  app.action("bill_review", async ({ ack, body, client }) => {
    await ack();
    const slackUserId = body.user.id;
    if (!isAllowed(config, slackUserId)) return;

    const session = await ensureSession(slackUserId, client);
    if (!session || session.lines.length === 0) return;

    await showReviewStep(client, slackUserId, session);
  });

  app.action("bill_confirm", async ({ ack, body, client }) => {
    await ack();
    const slackUserId = body.user.id;
    if (!isAllowed(config, slackUserId)) return;

    const session = getBillSession(slackUserId);
    if (!session) return;

    try {
      const invoice = await createSalesInvoice(buildCreatePayload(session));
      clearSession(slackUserId);
      await postOrUpdateMessage(
        client,
        slackUserId,
        { ...session, messageTs: session.messageTs },
        successBlocks(invoice.invoiceNo, invoice.id, config.frontendUrl)
      );
    } catch (error) {
      const message =
        error instanceof ApiError
          ? error.message
          : error instanceof Error
            ? error.message
            : "Failed to create invoice";
      await postOrUpdateMessage(client, slackUserId, session, errorBlocks(message));
    }
  });

  app.action("bill_cancel", async ({ ack, body, client }) => {
    await ack();
    await cancelFlowMessage(client, body, body.user.id, "Bill cancelled.");
  });
}
