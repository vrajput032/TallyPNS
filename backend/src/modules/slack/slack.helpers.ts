import type { KnownBlock } from "@slack/types";
import type { WebClient } from "@slack/web-api";
import type { SlackConfig } from "./slack.config.js";
import { truncateSlackText } from "./slack.format.js";
import { clearSession, setSession } from "./slack.session.js";
import type { SlackSession } from "./slack.types.js";

export function isAllowed(config: SlackConfig, userId: string) {
  return config.allowedUserIds.has(userId);
}

export async function openDm(client: WebClient, slackUserId: string) {
  const opened = await client.conversations.open({ users: slackUserId });
  const channelId = opened.channel?.id;
  if (!channelId) {
    throw new Error("Could not open Slack DM");
  }
  return channelId;
}

export async function postOrUpdateMessage(
  client: WebClient,
  slackUserId: string,
  session: SlackSession,
  blocks: KnownBlock[],
  text = "Telly"
) {
  if (session.messageTs) {
    await client.chat.update({
      channel: session.dmChannelId,
      ts: session.messageTs,
      blocks,
      text,
    });
  } else {
    const posted = await client.chat.postMessage({
      channel: session.dmChannelId,
      blocks,
      text,
    });
    session.messageTs = posted.ts ?? undefined;
  }
  setSession(slackUserId, session);
}

export function selectedOptionValue(action: {
  selected_option?: { value?: string };
  value?: string;
}) {
  return action.selected_option?.value ?? action.value;
}

export function cancelButtonBlock(actionId: string): KnownBlock {
  return {
    type: "actions",
    block_id: `${actionId}_cancel_actions`,
    elements: [
      {
        type: "button",
        action_id: actionId,
        text: { type: "plain_text", text: "Cancel" },
      },
    ],
  };
}

export async function cancelFlowMessage(
  client: WebClient,
  body: { channel?: { id?: string }; message?: { ts?: string } },
  slackUserId: string,
  label = "Cancelled."
) {
  clearSession(slackUserId);
  const channel = body.channel?.id;
  const messageTs = body.message?.ts;
  if (channel && messageTs) {
    await client.chat.update({
      channel,
      ts: messageTs,
      text: label,
      blocks: [
        {
          type: "section",
          text: { type: "mrkdwn", text: `_${label}_` },
        },
      ],
    });
  }
}

export function productSelectBlocks(
  title: string,
  subtitle: string,
  actionId: string,
  cancelActionId: string,
  products: { id: string; name: string }[]
): KnownBlock[] {
  const options = products.slice(0, 100).map((product) => ({
    text: { type: "plain_text" as const, text: truncateSlackText(product.name) },
    value: product.id,
  }));

  const blocks: KnownBlock[] = [
    {
      type: "section",
      text: { type: "mrkdwn", text: `*${title}*\n${subtitle}` },
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
    block_id: `${actionId}_actions`,
    elements: [
      {
        type: "static_select",
        action_id: actionId,
        placeholder: { type: "plain_text", text: "Select product" },
        options,
      },
    ],
  });
  blocks.push(cancelButtonBlock(cancelActionId));
  return blocks;
}

export function sizeSelectBlocks(
  title: string,
  actionId: string,
  sizes: readonly number[]
): KnownBlock[] {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: title },
    },
    {
      type: "actions",
      block_id: `${actionId}_actions`,
      elements: [
        {
          type: "static_select",
          action_id: actionId,
          placeholder: { type: "plain_text", text: "Select size" },
          options: sizes.map((size) => ({
            text: { type: "plain_text" as const, text: `${size}mm` },
            value: String(size),
          })),
        },
      ],
    },
  ];
}

export function errorBlocks(message: string): KnownBlock[] {
  return [
    {
      type: "section",
      text: { type: "mrkdwn", text: `:warning: ${message}` },
    },
  ];
}
