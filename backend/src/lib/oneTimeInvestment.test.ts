/**
 * One-time investment classifier.
 * Run: npx tsx backend/src/lib/oneTimeInvestment.test.ts
 */
import assert from "node:assert/strict";
import { isOneTimeInvestmentDescription } from "./oneTimeInvestment.js";

assert.equal(isOneTimeInvestmentDescription("Cnc payment to mb tools"), true);
assert.equal(isOneTimeInvestmentDescription("CNC machine advance"), true);
assert.equal(isOneTimeInvestmentDescription("Traub (Bhatia manufacturer)"), true);
assert.equal(isOneTimeInvestmentDescription("DIGITAL CALIPER : 1112-150"), true);
assert.equal(isOneTimeInvestmentDescription("Camera"), true);
assert.equal(isOneTimeInvestmentDescription("Tools"), true);
assert.equal(isOneTimeInvestmentDescription("Saman mb tools with porter"), true);
assert.equal(isOneTimeInvestmentDescription("Light meter"), true);
assert.equal(isOneTimeInvestmentDescription("Given to vishal - traub"), true);
assert.equal(isOneTimeInvestmentDescription("मशीन खरीद"), true);
assert.equal(isOneTimeInvestmentDescription("सीएनसी एडवांस"), true);
assert.equal(isOneTimeInvestmentDescription("कैमरा"), true);
assert.equal(isOneTimeInvestmentDescription("औजार"), true);
assert.equal(isOneTimeInvestmentDescription("mashin kharidi"), true);
assert.equal(isOneTimeInvestmentDescription("masheen li"), true);
assert.equal(isOneTimeInvestmentDescription("auzar kharid"), true);
assert.equal(isOneTimeInvestmentDescription("nivesh CNC"), true);
assert.equal(isOneTimeInvestmentDescription("vishal ka hisab clear till 24 July"), true);
assert.equal(isOneTimeInvestmentDescription("Bhatia Traub (ye entry reh gyi thi)"), true);

assert.equal(isOneTimeInvestmentDescription("Kiraya - 500"), false);
assert.equal(isOneTimeInvestmentDescription("3500 traub kiraya"), false);
assert.equal(isOneTimeInvestmentDescription("किराया बद्दी"), false);
assert.equal(isOneTimeInvestmentDescription("Electricity bill"), false);
assert.equal(isOneTimeInvestmentDescription("Ajay saman list and 200 porter"), false);
assert.equal(isOneTimeInvestmentDescription("Sent to current acc via sheetal"), false);

console.log("oneTimeInvestment tests ok");
