export type PushConfig = {
  enabled: boolean;
  publicKey: string;
  privateKey: string;
  subject: string;
  /** Shared secret for the unauthenticated daily cron call */
  cronSecret: string;
};

export function getPushConfig(): PushConfig {
  const publicKey = process.env.VAPID_PUBLIC_KEY?.trim() ?? "";
  const privateKey = process.env.VAPID_PRIVATE_KEY?.trim() ?? "";
  const subject = process.env.VAPID_SUBJECT?.trim() || "mailto:admin@example.com";
  const cronSecret = process.env.NOTIFICATIONS_CRON_SECRET?.trim() ?? "";
  return {
    enabled: Boolean(publicKey && privateKey),
    publicKey,
    privateKey,
    subject,
    cronSecret,
  };
}
