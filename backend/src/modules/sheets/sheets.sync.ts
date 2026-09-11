import { google } from "googleapis";
import { getSheetsConfig } from "./sheets.config.js";
import { ALL_SHEET_TABS, loadSheetValues, type SheetTabName } from "./sheets.data.js";

let debounceTimer: ReturnType<typeof setTimeout> | null = null;
let syncInFlight: Promise<SheetsSyncResult> | null = null;
let knownTabs: Set<string> | null = null;

export type SheetsSyncResult = {
  ok: boolean;
  skipped?: boolean;
  reason?: string;
  tabs?: Record<string, number>;
  syncedAt?: string;
};

function sheetsClient() {
  const cfg = getSheetsConfig();
  const auth = new google.auth.JWT({
    email: cfg.clientEmail,
    key: cfg.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

async function ensureTabsExist(tabs: SheetTabName[]): Promise<void> {
  const cfg = getSheetsConfig();
  const sheets = sheetsClient();

  if (!knownTabs) {
    const meta = await sheets.spreadsheets.get({
      spreadsheetId: cfg.spreadsheetId,
      fields: "sheets.properties.title",
    });
    knownTabs = new Set(
      (meta.data.sheets ?? [])
        .map((s) => s.properties?.title)
        .filter((title): title is string => Boolean(title))
    );
  }

  const missing = tabs.filter((tab) => !knownTabs!.has(tab));
  if (missing.length === 0) return;

  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: cfg.spreadsheetId,
    requestBody: {
      requests: missing.map((title) => ({
        addSheet: { properties: { title } },
      })),
    },
  });

  for (const title of missing) knownTabs.add(title);
}

async function writeTab(tab: SheetTabName): Promise<number> {
  const cfg = getSheetsConfig();
  const sheets = sheetsClient();
  const values = await loadSheetValues(tab);
  const range = `'${tab}'!A:Z`;

  await sheets.spreadsheets.values.clear({
    spreadsheetId: cfg.spreadsheetId,
    range,
  });

  await sheets.spreadsheets.values.update({
    spreadsheetId: cfg.spreadsheetId,
    range: `'${tab}'!A1`,
    valueInputOption: "RAW",
    requestBody: { values },
  });

  return Math.max(0, values.length - 1);
}

export async function syncGoogleSheets(tabs: SheetTabName[] = ALL_SHEET_TABS): Promise<SheetsSyncResult> {
  const cfg = getSheetsConfig();
  if (!cfg.enabled) {
    return {
      ok: false,
      skipped: true,
      reason: "Google Sheets sync is not configured (missing env vars)",
    };
  }

  if (syncInFlight) {
    return syncInFlight;
  }

  syncInFlight = (async () => {
    await ensureTabsExist(tabs);
    const resultTabs: Record<string, number> = {};
    for (const tab of tabs) {
      resultTabs[tab] = await writeTab(tab);
    }
    const syncedAt = new Date().toISOString();
    console.log(`[sheets] synced ${tabs.join(", ")} at ${syncedAt}`);
    return { ok: true, tabs: resultTabs, syncedAt };
  })();

  try {
    return await syncInFlight;
  } finally {
    syncInFlight = null;
  }
}

/** Fire-and-forget after DB writes. Debounced so bursts of edits become one sync. */
export function scheduleSheetsSync(reason = "change") {
  const cfg = getSheetsConfig();
  if (!cfg.enabled) return;

  if (debounceTimer) clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    debounceTimer = null;
    void syncGoogleSheets().catch((err) => {
      console.error(`[sheets] sync failed after ${reason}:`, err);
    });
  }, 2500);
}
