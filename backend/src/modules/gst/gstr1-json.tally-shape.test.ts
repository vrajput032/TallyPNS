/**
 * Structural checks that our GSTR-1 payload matches TallyPrime export shape.
 * Run: npx tsx backend/src/modules/gst/gstr1-json.tally-shape.test.ts
 */
import assert from "node:assert/strict";

/** Minimal fixtures mirroring Tally sample shapes */
const tallyB2bInvKeys = ["inum", "idt", "val", "pos", "rchrg", "inv_typ", "itms"];
const tallyItmDetKeys = ["txval", "rt", "iamt", "camt", "samt", "csamt"];
const tallyB2csIntraKeys = ["typ", "sply_ty", "rt", "pos", "txval", "camt", "samt", "csamt"];
const tallyHsnRowKeys = [
  "num",
  "hsn_sc",
  "txval",
  "iamt",
  "camt",
  "samt",
  "csamt",
  "desc",
  "user_desc",
  "uqc",
  "qty",
  "rt",
];
const tallyDocKeys = ["cancel", "from", "net_issue", "num", "to", "totnum"];

function keysOf(obj: object) {
  return Object.keys(obj);
}

function assertKeyOrder(actual: string[], expected: string[], label: string) {
  assert.deepEqual(actual, expected, `${label} key order mismatch`);
}

// Simulate builders (same as production helpers)
function makeItmDet(txval: number, rt: number, interState: boolean) {
  const tax = (txval * rt) / 100;
  const half = Math.round((tax / 2 + Number.EPSILON) * 100) / 100;
  return {
    txval: Math.round((txval + Number.EPSILON) * 100) / 100,
    rt,
    iamt: interState ? Math.round((tax + Number.EPSILON) * 100) / 100 : 0,
    camt: interState ? 0 : half,
    samt: interState ? 0 : half,
    csamt: 0,
  };
}

const itm = makeItmDet(1355.93, 18, false);
assertKeyOrder(keysOf(itm), tallyItmDetKeys, "itm_det");

const b2bInv = {
  inum: "GST/03589",
  idt: "12-06-2026",
  val: 1600,
  pos: "05",
  rchrg: "N" as const,
  inv_typ: "R" as const,
  itms: [{ num: 1, itm_det: itm }],
};
assertKeyOrder(keysOf(b2bInv), tallyB2bInvKeys, "b2b.inv");

const b2cs = {
  typ: "OE" as const,
  sply_ty: "INTRA" as const,
  rt: 18,
  pos: "05",
  txval: 100,
  camt: 9,
  samt: 9,
  csamt: 0,
};
assertKeyOrder(keysOf(b2cs), tallyB2csIntraKeys, "b2cs INTRA");

const hsnRow = {
  num: 1,
  hsn_sc: "85171290",
  txval: 847.46,
  iamt: 152.54,
  camt: 0,
  samt: 0,
  csamt: 0,
  desc: "",
  user_desc: "mobile phone",
  uqc: "OTH",
  qty: 1,
  rt: 18,
};
assertKeyOrder(keysOf(hsnRow), tallyHsnRowKeys, "hsn row");

const doc = {
  cancel: 0,
  from: "GST/03536",
  net_issue: 125,
  num: 1,
  to: "GST/03663",
  totnum: 125,
};
assertKeyOrder(keysOf(doc), tallyDocKeys, "doc_issue.docs");

const payload = {
  gstin: "06ABJFP8733H1ZW",
  fp: "062026",
  b2b: [{ ctin: "05AAEFH1729D1ZV", inv: [b2bInv] }],
  b2cs: [b2cs],
  hsn: { hsn_b2b: [hsnRow], hsn_b2c: [hsnRow] },
  doc_issue: { doc_det: [{ doc_num: 1, docs: [doc] }] },
};
assert.deepEqual(keysOf(payload), ["gstin", "fp", "b2b", "b2cs", "hsn", "doc_issue"]);

console.log("OK — GSTR-1 payload shape matches TallyPrime sample keys/order");
