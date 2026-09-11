import "dotenv/config";
import { getSheetsConfig } from "../src/modules/sheets/sheets.config.js";
import { syncGoogleSheets } from "../src/modules/sheets/sheets.sync.js";
import { prisma } from "../src/lib/prisma.js";

async function main() {
  const cfg = getSheetsConfig();
  if (!cfg.enabled) {
    console.error(
      "Missing Google Sheets env. Set GOOGLE_SHEETS_SPREADSHEET_ID, GOOGLE_SERVICE_ACCOUNT_EMAIL, GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY"
    );
    process.exitCode = 1;
    return;
  }
  console.log(`Syncing spreadsheet ${cfg.spreadsheetId} as ${cfg.clientEmail}…`);
  const result = await syncGoogleSheets();
  console.log(JSON.stringify(result, null, 2));
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
