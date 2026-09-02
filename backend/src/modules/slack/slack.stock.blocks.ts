import type { KnownBlock, View } from "@slack/types";
import { PIPE_SIZES_MM } from "../../lib/pipeSizes.js";
import { truncateSlackText } from "./slack.format.js";
import {
  cancelButtonBlock,
  productSelectBlocks,
  sizeSelectBlocks,
} from "./slack.helpers.js";
import type { SlackStockSession } from "./slack.types.js";

export function stockStartBlocks(products: { id: string; name: string }[]) {
  return productSelectBlocks(
    "Stock adjustment",
    "Pick a product to adjust pipe stock by size.",
    "stock_product_select",
    "stock_cancel",
    products
  );
}

export function stockSizeBlocks(productName: string) {
  return [
    ...sizeSelectBlocks(
      `*${truncateSlackText(productName, 60)}*\nSelect pipe size:`,
      "stock_size_select",
      PIPE_SIZES_MM
    ),
    cancelButtonBlock("stock_cancel"),
  ] satisfies KnownBlock[];
}

export function stockDirectionBlocks(productName: string, sizeMm: number) {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${truncateSlackText(productName, 50)}* · ${sizeMm}mm\nIncrease or decrease stock?`,
      },
    },
    {
      type: "actions",
      block_id: "stock_direction_actions",
      elements: [
        {
          type: "static_select",
          action_id: "stock_direction_select",
          placeholder: { type: "plain_text", text: "Direction" },
          options: [
            {
              text: { type: "plain_text", text: "+ Increase" },
              value: "increase",
            },
            {
              text: { type: "plain_text", text: "− Decrease" },
              value: "decrease",
            },
          ],
        },
      ],
    },
    {
      type: "actions",
      block_id: "stock_modal_actions",
      elements: [
        {
          type: "button",
          action_id: "stock_open_modal",
          text: { type: "plain_text", text: "Enter quantity" },
          style: "primary",
        },
      ],
    },
    cancelButtonBlock("stock_cancel"),
  ] satisfies KnownBlock[];
}

export function stockAdjustModal(session: SlackStockSession, productName: string): View {
  const direction = session.direction === "decrease" ? "Decrease" : "Increase";
  return {
    type: "modal",
    callback_id: "stock_adjust_modal",
    title: { type: "plain_text", text: "Stock adjustment" },
    submit: { type: "plain_text", text: "Apply" },
    close: { type: "plain_text", text: "Back" },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${truncateSlackText(productName, 50)}* · ${session.sizeMm}mm · ${direction}`,
        },
      },
      {
        type: "input",
        block_id: "quantity_block",
        label: { type: "plain_text", text: "Quantity" },
        element: {
          type: "plain_text_input",
          action_id: "quantity",
          initial_value: "1",
        },
      },
      {
        type: "input",
        block_id: "reason_block",
        label: { type: "plain_text", text: "Reason (optional)" },
        optional: true,
        element: {
          type: "plain_text_input",
          action_id: "reason",
          placeholder: { type: "plain_text", text: "Physical count" },
        },
      },
    ],
  };
}

export function stockSuccessBlocks(
  productName: string,
  sizeMm: number,
  signedQty: number,
  frontendUrl: string
) {
  const verb = signedQty >= 0 ? "Increased" : "Decreased";
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:white_check_mark: ${verb} *${truncateSlackText(productName, 50)}* ${sizeMm}mm by *${Math.abs(signedQty).toLocaleString("en-IN")}*.\n<${frontendUrl}/inventory|View inventory>`,
      },
    },
  ] satisfies KnownBlock[];
}
