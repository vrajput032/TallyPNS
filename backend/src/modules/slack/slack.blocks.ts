import type { Block, KnownBlock, View } from "@slack/types";
import { PIPE_SIZES_MM } from "../../lib/pipeSizes.js";
import { formatInr, invoiceGrandTotal, lineAmount, truncateSlackText } from "./slack.format.js";
import type { SlackBillSession, SlackLineDraft } from "./slack.types.js";

type CustomerOption = { id: string; name: string };
type ProductOption = { id: string; name: string; price: number; gstRate: number };

export function unauthorizedBlocks() {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: ":no_entry: You are not allowed to create bills from Slack. Ask an admin to add your Slack user ID to `SLACK_ALLOWED_USER_IDS`.",
      },
    },
  ] satisfies KnownBlock[];
}

export function customerStepBlocks(customers: CustomerOption[]) {
  const options = customers.slice(0, 100).map((customer) => ({
    text: { type: "plain_text" as const, text: truncateSlackText(customer.name) },
    value: customer.id,
  }));

  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Quick bill*\nWho is this invoice for?",
      },
    },
  ];

  if (options.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "_No customers found. Add customers in Telly first._" },
    });
    return blocks;
  }

  blocks.push({
    type: "actions",
    block_id: "bill_customer_actions",
    elements: [
      {
        type: "static_select",
        action_id: "bill_customer_select",
        placeholder: { type: "plain_text", text: "Select customer" },
        options,
      },
    ],
  });

  blocks.push(cancelButtonBlock());
  return blocks;
}

export function productStepBlocks(products: ProductOption[]) {
  const options = products.slice(0, 100).map((product) => ({
    text: { type: "plain_text" as const, text: truncateSlackText(product.name) },
    value: product.id,
  }));

  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Add a product line*\nPick a product. Pipe stock will be deducted when the invoice is created.",
      },
    },
  ];

  if (options.length === 0) {
    blocks.push({
      type: "section",
      text: { type: "mrkdwn", text: "_No products found._" },
    });
    return blocks;
  }

  blocks.push({
    type: "actions",
    block_id: "bill_product_actions",
    elements: [
      {
        type: "static_select",
        action_id: "bill_product_select",
        placeholder: { type: "plain_text", text: "Select product" },
        options,
      },
    ],
  });

  blocks.push(cancelButtonBlock());
  return blocks;
}

export function sizeStepBlocks(productName: string) {
  const sizeOptions = [
    ...PIPE_SIZES_MM.map((size) => ({
      text: { type: "plain_text" as const, text: `${size}mm` },
      value: String(size),
    })),
    {
      text: { type: "plain_text" as const, text: "No size" },
      value: "skip",
    },
  ];

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*${truncateSlackText(productName, 60)}*\nChoose pipe size (optional), then enter qty & rate:`,
      },
    },
    {
      type: "actions",
      block_id: "bill_size_actions",
      elements: [
        {
          type: "static_select",
          action_id: "bill_size_select",
          placeholder: { type: "plain_text", text: "Pipe size (optional)" },
          options: sizeOptions,
        },
      ],
    },
    {
      type: "actions",
      block_id: "bill_catalog_modal_actions",
      elements: [
        {
          type: "button",
          action_id: "bill_open_catalog_modal",
          text: { type: "plain_text", text: "Enter qty & rate" },
          style: "primary",
        },
      ],
    },
    cancelButtonBlock(),
  ] satisfies KnownBlock[];
}

export function afterLineBlocks(lineCount: number) {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:white_check_mark: Line added. You have *${lineCount}* line${lineCount === 1 ? "" : "s"}.`,
      },
    },
    {
      type: "actions",
      block_id: "bill_after_line_actions",
      elements: [
        {
          type: "button",
          action_id: "bill_add_product",
          text: { type: "plain_text", text: "Add product line" },
        },
        {
          type: "button",
          action_id: "bill_open_manual_modal",
          text: { type: "plain_text", text: "Add manual line" },
        },
        {
          type: "button",
          action_id: "bill_review",
          text: { type: "plain_text", text: "Review bill" },
          style: "primary",
        },
      ],
    },
    cancelButtonBlock(),
  ] satisfies KnownBlock[];
}

export function reviewBlocks(
  customerName: string,
  lines: SlackLineDraft[],
  lineLabels: string[],
  frontendUrl: string
) {
  const total = invoiceGrandTotal(lines);
  const lineText = lines
    .map(
      (line, index) =>
        `• *${truncateSlackText(lineLabels[index] ?? "Line", 50)}* — ${line.quantity.toLocaleString("en-IN")} × ₹${formatInr(line.rate)} + ${line.gstRate}% GST → *₹${formatInr(lineAmount(line))}*`
    )
    .join("\n");

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Review bill*\n*Customer:* ${truncateSlackText(customerName, 80)}\n\n${lineText}\n\n*Grand total:* ₹${formatInr(total)}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `Transport defaults to REGULAR. View in Telly: ${frontendUrl}/sales`,
        },
      ],
    },
    {
      type: "actions",
      block_id: "bill_review_actions",
      elements: [
        {
          type: "button",
          action_id: "bill_confirm",
          text: { type: "plain_text", text: "Create invoice" },
          style: "primary",
        },
        {
          type: "button",
          action_id: "bill_add_product",
          text: { type: "plain_text", text: "Add more" },
        },
      ],
    },
    cancelButtonBlock(),
  ] satisfies KnownBlock[];
}

export function successBlocks(invoiceNo: string, invoiceId: string, frontendUrl: string) {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:tada: Invoice *${invoiceNo}* created.\n<${frontendUrl}/sales/${invoiceId}|Open in Telly>`,
      },
    },
  ] satisfies KnownBlock[];
}

export function errorBlocks(message: string) {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: `:warning: ${message}` },
    },
  ] satisfies KnownBlock[];
}

function cancelButtonBlock(): KnownBlock {
  return {
    type: "actions",
    block_id: "bill_cancel_actions",
    elements: [
      {
        type: "button",
        action_id: "bill_cancel",
        text: { type: "plain_text", text: "Cancel" },
      },
    ],
  };
}

export function catalogLineModal(
  session: SlackBillSession,
  productName: string,
  defaults?: { rate: number; gstRate: number }
): View {
  return {
    type: "modal",
    callback_id: "bill_catalog_modal",
    private_metadata: JSON.stringify({ step: "catalog" }),
    title: { type: "plain_text", text: "Product line" },
    submit: { type: "plain_text", text: "Add line" },
    close: { type: "plain_text", text: "Back" },
    blocks: [
      {
        type: "section",
        text: {
          type: "mrkdwn",
          text: `*${truncateSlackText(productName, 60)}*${session.draftSizeMm ? ` · ${session.draftSizeMm}mm` : ""}`,
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
        block_id: "rate_block",
        label: { type: "plain_text", text: "Rate (before GST)" },
        element: {
          type: "plain_text_input",
          action_id: "rate",
          initial_value: String(defaults?.rate ?? 0),
        },
      },
      {
        type: "input",
        block_id: "gst_block",
        label: { type: "plain_text", text: "GST %" },
        element: {
          type: "plain_text_input",
          action_id: "gst_rate",
          initial_value: String(defaults?.gstRate ?? 18),
        },
      },
    ],
  };
}

export function manualLineModal(): View {
  return {
    type: "modal",
    callback_id: "bill_manual_modal",
    private_metadata: JSON.stringify({ step: "manual" }),
    title: { type: "plain_text", text: "Manual line" },
    submit: { type: "plain_text", text: "Add line" },
    close: { type: "plain_text", text: "Back" },
    blocks: [
      {
        type: "input",
        block_id: "description_block",
        label: { type: "plain_text", text: "Description" },
        element: {
          type: "plain_text_input",
          action_id: "description",
          placeholder: { type: "plain_text", text: "Scrap, freight, etc." },
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
        block_id: "rate_block",
        label: { type: "plain_text", text: "Rate (before GST)" },
        element: {
          type: "plain_text_input",
          action_id: "rate",
          initial_value: "0",
        },
      },
      {
        type: "input",
        block_id: "gst_block",
        label: { type: "plain_text", text: "GST %" },
        element: {
          type: "plain_text_input",
          action_id: "gst_rate",
          initial_value: "18",
        },
      },
    ],
  };
}

export function fallbackText(blocks: Block[]) {
  return "Telly sales bill";
}
