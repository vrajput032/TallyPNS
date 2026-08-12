import { COMPANY } from "../../config/company.js";
import { activeOnly } from "../../lib/activeRecords.js";
import { prisma } from "../../lib/prisma.js";
import { resolveTaxPeriod } from "./gst.service.js";

type LineItem = {
  gstRate: unknown;
  quantity: unknown;
  rate: unknown;
  description: string | null;
  hsn: string | null;
  unit: string | null;
  product: { hsn: string | null; unit: string; name: string } | null;
};

function lineDescription(item: LineItem) {
  return (item.product?.name ?? item.description ?? "Item").trim() || "Item";
}

function lineHsn(item: LineItem) {
  return (item.product?.hsn ?? item.hsn ?? "").trim() || "00000000";
}

function lineUnit(item: LineItem) {
  return (item.product?.unit ?? item.unit ?? "NOS").trim() || "NOS";
}

/** Tax line matching Tally itm_det key order */
function makeItmDet(txval: number, rt: number, interState: boolean) {
  const tax = (txval * rt) / 100;
  const half = round2(tax / 2);
  return {
    txval: round2(txval),
    rt,
    iamt: interState ? round2(tax) : 0,
    camt: interState ? 0 : half,
    samt: interState ? 0 : half,
    csamt: 0,
  };
}

function round2(n: number) {
  return Math.round((n + Number.EPSILON) * 100) / 100;
}

/** Tally / portal date: DD-MM-YYYY */
function formatIdt(date: Date) {
  const y = date.getUTCFullYear();
  const m = String(date.getUTCMonth() + 1).padStart(2, "0");
  const d = String(date.getUTCDate()).padStart(2, "0");
  return `${d}-${m}-${y}`;
}

function normalizeGstin(gstin: string | null | undefined) {
  const cleaned = (gstin ?? "").trim().toUpperCase();
  return /^[0-9]{2}[A-Z0-9]{13}$/.test(cleaned) ? cleaned : null;
}

/** Keep PCS as PCS like Tally; unknown → OTH */
function mapUqc(unit: string): string {
  const u = unit.trim().toUpperCase();
  const map: Record<string, string> = {
    PCS: "PCS",
    PC: "PCS",
    NOS: "NOS",
    NO: "NOS",
    KG: "KGS",
    KGS: "KGS",
    G: "GMS",
    GM: "GMS",
    GMS: "GMS",
    MTR: "MTR",
    M: "MTR",
    LTR: "LTR",
    L: "LTR",
    BOX: "BOX",
    SET: "SET",
    OTH: "OTH",
  };
  return map[u] ?? "OTH";
}

function groupItemsByRate(items: LineItem[]) {
  const groups = new Map<number, number>();
  for (const item of items) {
    const rt = Number(item.gstRate);
    const txval = Number(item.quantity) * Number(item.rate);
    groups.set(rt, (groups.get(rt) ?? 0) + txval);
  }
  return [...groups.entries()].sort((a, b) => a[0] - b[0]);
}

type HsnAgg = {
  hsn_sc: string;
  user_desc: string;
  uqc: string;
  qty: number;
  rt: number;
  txval: number;
  iamt: number;
  camt: number;
  samt: number;
};

function addHsn(map: Map<string, HsnAgg>, item: LineItem, interState: boolean) {
  const hsn_sc = lineHsn(item);
  const rt = Number(item.gstRate);
  const qty = Number(item.quantity);
  const txval = Number(item.quantity) * Number(item.rate);
  const uqc = mapUqc(lineUnit(item));
  const det = makeItmDet(txval, rt, interState);
  const key = `${hsn_sc}|${uqc}|${rt}`;
  const existing = map.get(key);
  if (existing) {
    existing.qty += qty;
    existing.txval = round2(existing.txval + det.txval);
    existing.iamt = round2(existing.iamt + det.iamt);
    existing.camt = round2(existing.camt + det.camt);
    existing.samt = round2(existing.samt + det.samt);
  } else {
    map.set(key, {
      hsn_sc,
      user_desc: lineDescription(item).slice(0, 30),
      uqc,
      qty,
      rt,
      txval: det.txval,
      iamt: det.iamt,
      camt: det.camt,
      samt: det.samt,
    });
  }
}

function toHsnRows(map: Map<string, HsnAgg>) {
  // Tally order: num, hsn_sc, txval, iamt, camt, samt, csamt, desc, user_desc, uqc, qty, rt
  return [...map.values()].map((row, index) => ({
    num: index + 1,
    hsn_sc: row.hsn_sc,
    txval: round2(row.txval),
    iamt: round2(row.iamt),
    camt: round2(row.camt),
    samt: round2(row.samt),
    csamt: 0,
    desc: "",
    user_desc: row.user_desc,
    uqc: row.uqc,
    qty: round2(row.qty),
    rt: row.rt,
  }));
}

/**
 * Build GSTR-1 JSON compatible with TallyPrime offline upload format.
 * Reference: 05ANMPM5799B1ZO_GSTR1_JUN-2026_….json
 */
export async function buildGstr1Json(month?: number, year?: number) {
  const period = resolveTaxPeriod(month, year);
  const dateFilter = { gte: period.periodGte, lt: period.periodLt };
  const supplierState = COMPANY.stateCode;

  const salesInvoices = await prisma.salesInvoice.findMany({
    where: { ...activeOnly, invoiceDate: dateFilter },
    include: {
      customer: { select: { name: true, gstin: true } },
      items: {
        select: {
          gstRate: true,
          quantity: true,
          rate: true,
          description: true,
          hsn: true,
          unit: true,
          product: { select: { hsn: true, unit: true, name: true } },
        },
      },
    },
    orderBy: [{ invoiceDate: "asc" }, { invoiceNo: "asc" }],
  });

  type B2bInv = {
    inum: string;
    idt: string;
    val: number;
    pos: string;
    rchrg: "N";
    inv_typ: "R";
    itms: { num: number; itm_det: ReturnType<typeof makeItmDet> }[];
  };

  const b2bByCtin = new Map<string, B2bInv[]>();
  const b2csMap = new Map<
    string,
    { sply_ty: "INTRA" | "INTER"; pos: string; rt: number; txval: number }
  >();
  const hsnB2bMap = new Map<string, HsnAgg>();
  const hsnB2cMap = new Map<string, HsnAgg>();

  const skipped: { invoiceNo: string; reason: string }[] = [];
  let b2bCount = 0;
  let b2csCount = 0;

  for (const inv of salesInvoices) {
    if (inv.items.length === 0) {
      skipped.push({ invoiceNo: inv.invoiceNo, reason: "No line items" });
      continue;
    }

    const partyGstin = normalizeGstin(inv.customer.gstin);
    const pos = partyGstin ? partyGstin.slice(0, 2) : supplierState;
    const interState = pos !== supplierState;
    const val = round2(Number(inv.totalAmount));

    const itms = groupItemsByRate(inv.items).map(([rt, txval], index) => ({
      num: index + 1,
      itm_det: makeItmDet(txval, rt, interState),
    }));

    if (partyGstin) {
      const list = b2bByCtin.get(partyGstin) ?? [];
      list.push({
        inum: inv.invoiceNo,
        idt: formatIdt(inv.invoiceDate),
        val,
        pos,
        rchrg: "N",
        inv_typ: "R",
        itms,
      });
      b2bByCtin.set(partyGstin, list);
      b2bCount += 1;
      for (const item of inv.items) addHsn(hsnB2bMap, item, interState);
    } else {
      for (const [rt, txval] of groupItemsByRate(inv.items)) {
        const key = `${interState ? "INTER" : "INTRA"}|${pos}|${rt}`;
        const existing = b2csMap.get(key);
        if (existing) existing.txval += txval;
        else {
          b2csMap.set(key, {
            sply_ty: interState ? "INTER" : "INTRA",
            pos,
            rt,
            txval,
          });
        }
      }
      b2csCount += 1;
      for (const item of inv.items) addHsn(hsnB2cMap, item, interState);
    }
  }

  const b2b = [...b2bByCtin.entries()].map(([ctin, inv]) => ({ ctin, inv }));

  const b2cs = [...b2csMap.values()].map((row) => {
    const det = makeItmDet(row.txval, row.rt, row.sply_ty === "INTER");
    // Tally INTRA sample has no iamt; INTER should use iamt
    if (row.sply_ty === "INTER") {
      return {
        typ: "OE" as const,
        sply_ty: "INTER" as const,
        rt: row.rt,
        pos: row.pos,
        txval: det.txval,
        iamt: det.iamt,
        camt: 0,
        samt: 0,
        csamt: 0,
      };
    }
    return {
      typ: "OE" as const,
      sply_ty: "INTRA" as const,
      rt: row.rt,
      pos: row.pos,
      txval: det.txval,
      camt: det.camt,
      samt: det.samt,
      csamt: 0,
    };
  });

  const hsn_b2b = toHsnRows(hsnB2bMap);
  const hsn_b2c = toHsnRows(hsnB2cMap);

  const totnum = salesInvoices.length;
  const fromNo = totnum > 0 ? salesInvoices[0]!.invoiceNo : "";
  const toNo = totnum > 0 ? salesInvoices[totnum - 1]!.invoiceNo : "";

  // Tally doc field order: cancel, from, net_issue, num, to, totnum
  const doc_issue = {
    doc_det: [
      {
        doc_num: 1,
        docs: [
          {
            cancel: 0,
            from: fromNo,
            net_issue: totnum,
            num: 1,
            to: toNo,
            totnum,
          },
        ],
      },
    ],
  };

  const fp = `${String(period.month).padStart(2, "0")}${period.year}`;

  // Build in Tally key order: gstin, fp, b2b?, b2cs?, hsn?, doc_issue
  const payload: Record<string, unknown> = {
    gstin: COMPANY.gstin,
    fp,
  };
  if (b2b.length > 0) payload.b2b = b2b;
  if (b2cs.length > 0) payload.b2cs = b2cs;
  if (hsn_b2b.length > 0 || hsn_b2c.length > 0) {
    const hsn: Record<string, unknown> = {};
    if (hsn_b2b.length > 0) hsn.hsn_b2b = hsn_b2b;
    if (hsn_b2c.length > 0) hsn.hsn_b2c = hsn_b2c;
    payload.hsn = hsn;
  }
  payload.doc_issue = doc_issue;

  const monthAbbr = period.periodFrom
    .toLocaleString("en-GB", { month: "short", timeZone: "UTC" })
    .toUpperCase();
  const filename = `${COMPANY.gstin}_GSTR1_${monthAbbr}-${period.year}.json`;

  return {
    filename,
    payload,
    meta: {
      company: COMPANY.name,
      gstin: COMPANY.gstin,
      taxPeriod: period.monthLabel,
      fp,
      filingDueDate: period.filingDueDate.toISOString().slice(0, 10),
      salesInvoiceCount: salesInvoices.length,
      b2bInvoiceCount: b2bCount,
      b2cInvoiceCount: b2csCount,
      skipped,
      compatibleWith: "TallyPrime GSTR-1 JSON (Prepare Offline)",
      portalUrl: "https://www.gst.gov.in/",
      returnsUrl: "https://services.gst.gov.in/services/login",
      uploadHint:
        "Download JSON → GST Portal → Returns Dashboard → GSTR-1 → Prepare Offline → Upload (same as Tally).",
    },
  };
}
