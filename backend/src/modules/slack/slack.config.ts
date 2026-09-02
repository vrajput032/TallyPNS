export type SlackConfig = {
  enabled: boolean;
  botToken: string;
  signingSecret: string;
  allowedUserIds: Set<string>;
  frontendUrl: string;
};

export function getSlackConfig(): SlackConfig {
  const botToken = process.env.SLACK_BOT_TOKEN?.trim() ?? "";
  const signingSecret = process.env.SLACK_SIGNING_SECRET?.trim() ?? "";
  const allowedUserIds = new Set(
    (process.env.SLACK_ALLOWED_USER_IDS ?? "")
      .split(",")
      .map((id) => id.trim())
      .filter(Boolean)
  );
  const frontendUrl =
    process.env.FRONTEND_URL?.trim().replace(/\/$/, "") || "https://tallypns.pages.dev";

  return {
    enabled: Boolean(botToken && signingSecret && allowedUserIds.size > 0),
    botToken,
    signingSecret,
    allowedUserIds,
    frontendUrl,
  };
}
