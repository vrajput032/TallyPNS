export type SheetsConfig = {
  enabled: boolean;
  spreadsheetId: string;
  clientEmail: string;
  privateKey: string;
  /** Optional shared secret for unauthenticated cron refresh */
  cronSecret: string;
};

export function getSheetsConfig(): SheetsConfig {
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID?.trim() ?? "";
  const clientEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL?.trim() ?? "";
  const privateKeyRaw = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY?.trim() ?? "";
  const privateKey = privateKeyRaw.replace(/\\n/g, "\n");
  const cronSecret = process.env.GOOGLE_SHEETS_CRON_SECRET?.trim() ?? "";

  return {
    enabled: Boolean(spreadsheetId && clientEmail && privateKey),
    spreadsheetId,
    clientEmail,
    privateKey,
    cronSecret,
  };
}
