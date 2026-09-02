import type { KnownBlock, View } from "@slack/types";
import { formatInr } from "./slack.format.js";
import { cancelButtonBlock } from "./slack.helpers.js";
import type { SlackRawMaterialLineDraft, SlackRawMaterialSession } from "./slack.types.js";

function lineAmount(line: SlackRawMaterialLineDraft) {
  return Math.round(line.quantityKg * line.ratePerKg * 100) / 100;
}

export function rawMaterialTotals(lines: SlackRawMaterialLineDraft[]) {
  const taxableAmount = Math.round(lines.reduce((sum, line) => sum + lineAmount(line), 0) * 100) / 100;
  const cgstAmount = Math.round(taxableAmount * 0.09 * 100) / 100;
  const sgstAmount = Math.round(taxableAmount * 0.09 * 100) / 100;
  const totalAmount = Math.round((taxableAmount + cgstAmount + sgstAmount) * 100) / 100;
  const totalKg =
    Math.round(lines.reduce((sum, line) => sum + line.quantityKg, 0) * 1000) / 1000;
  return { taxableAmount, cgstAmount, sgstAmount, totalAmount, totalKg };
}

export function rawMaterialStartBlocks() {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: "*Raw material bill*\nRecord a steel / MS tube supplier bill.",
      },
    },
    {
      type: "actions",
      block_id: "rm_header_actions",
      elements: [
        {
          type: "button",
          action_id: "rm_open_header_modal",
          text: { type: "plain_text", text: "Enter bill details" },
          style: "primary",
        },
      ],
    },
    cancelButtonBlock("rm_cancel"),
  ] satisfies KnownBlock[];
}

export function rawMaterialAfterLineBlocks(lineCount: number, totalKg: number) {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:white_check_mark: Line added. *${lineCount}* line${lineCount === 1 ? "" : "s"} · ${totalKg.toLocaleString("en-IN")} kg total.`,
      },
    },
    {
      type: "actions",
      block_id: "rm_after_line_actions",
      elements: [
        {
          type: "button",
          action_id: "rm_open_line_modal",
          text: { type: "plain_text", text: "Add line" },
        },
        {
          type: "button",
          action_id: "rm_review",
          text: { type: "plain_text", text: "Review bill" },
          style: "primary",
        },
      ],
    },
    cancelButtonBlock("rm_cancel"),
  ] satisfies KnownBlock[];
}

export function rawMaterialReviewBlocks(session: SlackRawMaterialSession, frontendUrl: string) {
  const totals = rawMaterialTotals(session.lines);
  const lineText = session.lines
    .map(
      (line) =>
        `• ${line.description} — ${line.quantityKg.toLocaleString("en-IN")} kg × ₹${formatInr(line.ratePerKg)}/kg → *₹${formatInr(lineAmount(line))}*`
    )
    .join("\n");

  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `*Review raw material bill*\n*Bill no:* ${session.billNo}\n*Supplier:* ${session.supplierName}\n\n${lineText}\n\n*Taxable:* ₹${formatInr(totals.taxableAmount)}\n*CGST / SGST:* ₹${formatInr(totals.cgstAmount)} each\n*Total:* ₹${formatInr(totals.totalAmount)}`,
      },
    },
    {
      type: "context",
      elements: [
        {
          type: "mrkdwn",
          text: `<${frontendUrl}/raw-material|View in Telly>`,
        },
      ],
    },
    {
      type: "actions",
      block_id: "rm_review_actions",
      elements: [
        {
          type: "button",
          action_id: "rm_confirm",
          text: { type: "plain_text", text: "Create bill" },
          style: "primary",
        },
        {
          type: "button",
          action_id: "rm_open_line_modal",
          text: { type: "plain_text", text: "Add more" },
        },
      ],
    },
    cancelButtonBlock("rm_cancel"),
  ] satisfies KnownBlock[];
}

export function rawMaterialSuccessBlocks(
  billNo: string,
  billId: string,
  frontendUrl: string
): KnownBlock[] {
  return [
    {
      type: "section",
      text: {
        type: "mrkdwn",
        text: `:tada: Raw material bill *${billNo}* created.\n<${frontendUrl}/raw-material/${billId}|Open in Telly>`,
      },
    },
  ];
}

export function rawMaterialHeaderModal(): View {
  return {
    type: "modal",
    callback_id: "rm_header_modal",
    title: { type: "plain_text", text: "Bill details" },
    submit: { type: "plain_text", text: "Continue" },
    close: { type: "plain_text", text: "Cancel" },
    blocks: [
      {
        type: "input",
        block_id: "bill_no_block",
        label: { type: "plain_text", text: "Bill / invoice no." },
        element: {
          type: "plain_text_input",
          action_id: "bill_no",
        },
      },
      {
        type: "input",
        block_id: "supplier_block",
        label: { type: "plain_text", text: "Supplier name" },
        element: {
          type: "plain_text_input",
          action_id: "supplier_name",
        },
      },
      {
        type: "input",
        block_id: "gstin_block",
        label: { type: "plain_text", text: "Supplier GSTIN" },
        optional: true,
        element: {
          type: "plain_text_input",
          action_id: "supplier_gstin",
        },
      },
      {
        type: "input",
        block_id: "vehicle_block",
        label: { type: "plain_text", text: "Vehicle no." },
        optional: true,
        element: {
          type: "plain_text_input",
          action_id: "vehicle_no",
        },
      },
      {
        type: "input",
        block_id: "destination_block",
        label: { type: "plain_text", text: "Destination" },
        optional: true,
        element: {
          type: "plain_text_input",
          action_id: "destination",
        },
      },
    ],
  };
}

export function rawMaterialLineModal(): View {
  return {
    type: "modal",
    callback_id: "rm_line_modal",
    title: { type: "plain_text", text: "Bill line" },
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
          initial_value: "STEEL TUBE CDW",
        },
      },
      {
        type: "input",
        block_id: "hsn_block",
        label: { type: "plain_text", text: "HSN" },
        optional: true,
        element: {
          type: "plain_text_input",
          action_id: "hsn",
          initial_value: "73069090",
        },
      },
      {
        type: "input",
        block_id: "quantity_block",
        label: { type: "plain_text", text: "Quantity (kg)" },
        element: {
          type: "plain_text_input",
          action_id: "quantity_kg",
          initial_value: "0",
        },
      },
      {
        type: "input",
        block_id: "rate_block",
        label: { type: "plain_text", text: "Rate per kg" },
        element: {
          type: "plain_text_input",
          action_id: "rate_per_kg",
          initial_value: "0",
        },
      },
    ],
  };
}

export function buildRawMaterialPayload(session: SlackRawMaterialSession) {
  const totals = rawMaterialTotals(session.lines);
  return {
    billNo: session.billNo!.trim(),
    supplierName: session.supplierName!.trim(),
    supplierGstin: session.supplierGstin?.trim() || null,
    vehicleNo: session.vehicleNo?.trim() || null,
    destination: session.destination?.trim() || null,
    taxableAmount: totals.taxableAmount,
    cgstAmount: totals.cgstAmount,
    sgstAmount: totals.sgstAmount,
    igstAmount: 0,
    roundOff: 0,
    totalAmount: totals.totalAmount,
    notes: null,
    items: session.lines.map((line) => ({
      description: line.description,
      hsn: line.hsn?.trim() || null,
      quantityKg: line.quantityKg,
      ratePerKg: line.ratePerKg,
    })),
  };
}
