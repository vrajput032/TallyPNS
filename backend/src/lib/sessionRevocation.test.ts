import assert from "node:assert/strict";
import { revokedSessionValue, sessionIsRevoked } from "./sessionRevocation.js";

const now = new Date("2026-10-05T10:00:00.000Z");
const mark = revokedSessionValue(now);
const iatBefore = Math.floor(now.getTime() / 1000) - 60;
const iatAfter = Math.floor(now.getTime() / 1000);

assert.equal(sessionIsRevoked(null, iatBefore), true);
assert.equal(sessionIsRevoked("jwt-token", iatBefore), false);
assert.equal(sessionIsRevoked(mark, iatBefore), true);
assert.equal(sessionIsRevoked(mark, iatAfter), false);
assert.equal(sessionIsRevoked("revoked:not-a-date", iatAfter), true);

console.log("sessionRevocation tests passed");
