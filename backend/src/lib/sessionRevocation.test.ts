import assert from "node:assert/strict";
import {
  revokedSessionValue,
  sessionIsRevoked,
  storedTokenAfterLogin,
} from "./sessionRevocation.js";

const now = new Date("2026-10-05T10:00:00.700Z");
const mark = revokedSessionValue(now);
const nowSeconds = Math.floor(now.getTime() / 1000);
const iatBefore = nowSeconds - 60;
const iatAfter = nowSeconds + 60;

assert.equal(mark, "revoked:2026-10-05T10:00:00.000Z");
assert.equal(sessionIsRevoked(null, iatBefore), true);
assert.equal(sessionIsRevoked("jwt-token", iatBefore), false);
assert.equal(sessionIsRevoked("jwt-token", iatAfter), false);
assert.equal(sessionIsRevoked(mark, iatBefore), true);
assert.equal(sessionIsRevoked(mark, iatAfter), false);
// Tokens handed out in the same second as the revoke (the device that changed the password).
assert.equal(sessionIsRevoked(mark, nowSeconds), false);
assert.equal(sessionIsRevoked(mark, undefined), true);
assert.equal(sessionIsRevoked("revoked:not-a-date", iatAfter), true);

assert.equal(storedTokenAfterLogin(mark, "new-jwt"), mark);
assert.equal(storedTokenAfterLogin("old-jwt", "new-jwt"), "new-jwt");
assert.equal(storedTokenAfterLogin(null, "new-jwt"), "new-jwt");

console.log("sessionRevocation tests passed");
