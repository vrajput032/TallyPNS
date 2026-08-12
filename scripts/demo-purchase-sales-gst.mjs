/**
 * Records a walkthrough demo:
 * 1) Login → create purchase bill
 * 2) Create sales invoice → record receipt
 * 3) Open GST summary
 *
 * Usage (dev servers must be running):
 *   node scripts/demo-purchase-sales-gst.mjs
 *
 * Output: demos/purchase-sales-gst-demo/
 */
import { chromium } from "playwright";
import { mkdirSync, readdirSync, copyFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUT_DIR = join(ROOT, "demos", "purchase-sales-gst-demo");
const BASE_URL = process.env.DEMO_BASE_URL ?? "http://localhost:5173";
const EMAIL = process.env.DEMO_EMAIL ?? "admin@pnsenterprises.com";
const PASSWORD = process.env.DEMO_PASSWORD;
if (!PASSWORD) {
  throw new Error("Set DEMO_PASSWORD before running the demo script.");
}

function pause(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function visibleInput(page, name) {
  return page.locator(`input[name="${name}"]`).locator("visible=true").first();
}

async function selectByLabelNear(page, labelText) {
  // Prefer FormItem: label then combobox in same block
  const field = page
    .locator(".grid, [class*='FormItem'], form")
    .filter({ has: page.getByText(labelText, { exact: true }) })
    .first();
  const trigger = field.getByRole("combobox").first();
  await trigger.click();
  await pause(400);
  const option = page.getByRole("option").first();
  await option.waitFor({ state: "visible" });
  const label = (await option.innerText()).trim();
  await option.click();
  await pause(500);
  return label;
}

async function main() {
  mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    headless: true,
    slowMo: 80,
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    recordVideo: {
      dir: OUT_DIR,
      size: { width: 1440, height: 900 },
    },
  });

  const page = await context.newPage();
  page.setDefaultTimeout(20000);

  try {
    // —— Login ——
    await page.goto(`${BASE_URL}/login`);
    await pause(800);
    await page.getByLabel(/email/i).fill(EMAIL);
    await pause(300);
    await page.getByLabel(/password/i).fill(PASSWORD);
    await pause(300);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/$/, { timeout: 15000 }).catch(() => {});
    await pause(1200);

    // —— Purchase ——
    await page.getByRole("link", { name: "Purchase" }).click();
    await pause(900);
    await page.getByRole("button", { name: /new bill/i }).click();
    await page.waitForURL(/\/purchase\/new/);
    await pause(700);

    await selectByLabelNear(page, "Bill From");
    await page.getByLabel(/transport/i).fill("REGULAR");
    await pause(200);
    await page.getByLabel(/vehicle/i).fill("HR55AB1234");
    await pause(400);

    // Material / product select in line items (desktop table)
    const materialTrigger = page.locator("table").getByRole("combobox").first();
    await materialTrigger.click();
    await pause(400);
    await page.getByRole("option").first().click();
    await pause(500);

    await (await visibleInput(page, "items.0.quantity")).fill("1.5");
    await pause(300);
    const priceKg = page.locator('input[name="items.0.pricePerKg"]').locator("visible=true");
    if ((await priceKg.count()) > 0) {
      await priceKg.first().fill("42");
    }
    await pause(800);

    await page.getByRole("button", { name: /save bill/i }).click();
    await page.waitForURL(/\/purchase\/[^/]+$/, { timeout: 20000 });
    await pause(1800);

    // —— Sales invoice ——
    await page.getByRole("link", { name: "Sales" }).click();
    await pause(900);
    await page.getByRole("button", { name: /new invoice/i }).click();
    await page.waitForURL(/\/sales\/new/);
    await pause(700);

    await selectByLabelNear(page, "Bill To");
    await page.getByLabel(/vehicle/i).fill("DL05EC5993");
    await pause(400);

    const productTrigger = page.locator("table").getByRole("combobox").first();
    await productTrigger.click();
    await pause(400);
    await page.getByRole("option").first().click();
    await pause(500);

    const size = page.locator('input[name="items.0.sizeMm"]').locator("visible=true");
    if ((await size.count()) > 0) {
      await size.first().fill("95");
    }
    await (await visibleInput(page, "items.0.quantity")).fill("100");
    await pause(300);
    await (await visibleInput(page, "items.0.rate")).fill("85");
    await pause(900);

    await page.getByRole("button", { name: /save invoice/i }).click();
    await page.waitForURL(/\/sales\/[^/]+$/, { timeout: 20000 });
    await pause(1500);

    // —— Sales receipt ——
    await page.getByRole("button", { name: /record receipt/i }).click();
    await pause(800);
    await page.getByRole("button", { name: /save receipt/i }).click();
    await pause(2000);

    // —— GST ——
    await page.getByRole("link", { name: "GST" }).click();
    await page.waitForURL(/\/gst/);
    await pause(1500);
    await page.mouse.wheel(0, 400);
    await pause(1200);
    await page.mouse.wheel(0, 400);
    await pause(1800);

    // Highlight download if present
    const downloadBtn = page.getByRole("button", { name: /gstr-1|download/i }).first();
    if (await downloadBtn.count()) {
      await downloadBtn.scrollIntoViewIfNeeded();
      await pause(1200);
    }

    await pause(1500);
  } finally {
    const video = page.video();
    await page.close();
    await context.close();
    await browser.close();

    if (video) {
      const rawPath = await video.path();
      const finalPath = join(OUT_DIR, "demo.webm");
      if (existsSync(rawPath) && rawPath !== finalPath) {
        copyFileSync(rawPath, finalPath);
      }
      console.log(`Demo video: ${finalPath}`);
      console.log("Raw captures:", readdirSync(OUT_DIR).join(", "));
    }
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
