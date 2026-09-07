/**
 * Partner expense parsing (kiraya + itemized lumps).
 * Run: npx tsx backend/src/lib/kirayaDelivery.test.ts
 */
import assert from "node:assert/strict";
import {
  breakdownFromExpenses,
  kirayaAmountsFromText,
  mergeSplitExpenses,
  parseAmountFirstLines,
  sumKirayaByMonth,
} from "./kirayaDelivery.js";

assert.deepEqual(kirayaAmountsFromText("6000 kiraya baddi"), [6000]);
assert.deepEqual(kirayaAmountsFromText("200 bestone kiraya"), [200]);
assert.deepEqual(kirayaAmountsFromText("3500 traub kiraya 1400 hydra traub"), [3500]);
assert.deepEqual(kirayaAmountsFromText("Kiraya - 500 (250 rikshaw, 250 porter)"), [500]);
assert.deepEqual(kirayaAmountsFromText("ram ind pipe tempo kiraya 500"), [500]);

const lumpedSep =
  "6000 kiraya baddi 200 bestone kiraya 3500 traub kiraya 1400 hydra traub 1600 mistry 3000 programmer 540 shim rajesh cnc Electric saman mcb 14700 ,2 mcb ,box , wire bundle 2000 wifi akshay 20000 rent 1500 electrician 390 ,Self screw 54850 total 800 hand gloves 650 Bit porter Hydra 1200 Cnc kiraya 7100 300 katte 64900 total";

const parsed = parseAmountFirstLines(lumpedSep);
assert.equal(parsed.find((l) => l.label.toLowerCase().includes("kiraya baddi"))?.amount, 6000);
assert.equal(parsed.find((l) => l.label.toLowerCase().includes("bestone"))?.amount, 200);
assert.equal(parsed.find((l) => l.label.toLowerCase().includes("traub kiraya"))?.amount, 3500);
assert.equal(parsed.find((l) => l.label.toLowerCase().includes("cnc kiraya"))?.amount, 1200);
assert.ok(parsed.some((l) => l.amount === 7100));
assert.ok(!parsed.some((l) => l.amount === 2));

const merged = mergeSplitExpenses([
  { id: "a", date: "2026-09-01", description: lumpedSep, amount: 32450 },
  { id: "b", date: "2026-09-01", description: lumpedSep, amount: 32450 },
]);
assert.equal(merged.length, 1);
assert.equal(merged[0].amount, 64900);

const lumpedAug =
  "Servo - 40k Hyd oil - 20k Traub tool - 10k Kiraya - 500 (250 rikshaw, 250 porter) Fars ka saman 5360 Fibre sheet and pipe 4000 Jcb 1200 1600 camera installation 850 power supply 900 ram ind pipe tempo kiraya 500 cnc jorge 200 porter 600 pipe unload 900 bin Total 3100";
assert.deepEqual(kirayaAmountsFromText(lumpedAug), [500, 500]);

const byMonth = sumKirayaByMonth([
  { id: "a", date: "2026-09-01", description: lumpedSep, amount: 32450 },
  { id: "b", date: "2026-09-01", description: lumpedSep, amount: 32450 },
  { id: "c", date: "2026-08-26", description: lumpedAug, amount: 86560 },
  { id: "d", date: "2026-08-04", description: "Saman mb tools with porter", amount: 13650 },
]);
assert.equal(byMonth["2026-09"], 10900);
assert.equal(byMonth["2026-08"], 1000);

const sep = breakdownFromExpenses([
  { id: "a", date: "2026-09-01", description: lumpedSep, amount: 32450 },
  { id: "b", date: "2026-09-01", description: lumpedSep, amount: 32450 },
])["2026-09"];
assert.ok(sep);
assert.equal(sep.entries.filter((e) => e.kind === "delivery").length, 4);
assert.ok(sep.entries.some((e) => e.kind === "skipped" && e.amount === 20000));
assert.ok(sep.entries.some((e) => e.kind === "skipped" && e.label.toLowerCase().includes("total")));
assert.ok(sep.other > 0);

const tools = breakdownFromExpenses([
  { id: "d", date: "2026-08-04", description: "Saman mb tools with porter", amount: 13650 },
])["2026-08"];
assert.ok(tools);
assert.equal(tools.other, 0);
assert.equal(tools.entries[0]?.kind, "skipped");

const transfer = breakdownFromExpenses([
  { id: "x", date: "2026-09-06", description: "Sent to current acc via sheetal", amount: 25000 },
])["2026-09"];
assert.ok(transfer);
assert.equal(transfer.other, 0);
assert.equal(transfer.entries[0]?.kind, "skipped");

const power = breakdownFromExpenses([
  { id: "e", date: "2026-08-31", description: "Electricity bill", amount: 2890 },
])["2026-08"];
assert.ok(power);
assert.equal(power.electricity, 2890);
assert.equal(power.other, 0);

console.log("kirayaDelivery tests ok");
