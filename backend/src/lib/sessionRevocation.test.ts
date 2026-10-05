import assert from "node:assert/strict";
import { revokedSessionValue, sessionIsRevoked } from "./sessionRevocation.js";

function fakeJwt(iat: number) {
  const header = Buffer.from(JSON.stringify({ alg: "none" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ iat })).toString("base64url");
  return `${header}.${payload}.sig`;
}

const now = new Date("2026-10-05T10:00:00.000Z");
const mark = revokedSessionValue(now);
const iatBefore = Math.floor(now.getTime() / 1000) - 60;
const iatAfter = Math.floor(now.getTime() / 1000) + 60;

assert.equal(sessionIsRevoked(null, iatBefore), true);
assert.equal(sessionIsRevoked("jwt-token", iatBefore), false);
assert.equal(sessionIsRevoked(mark, iatBefore), true);
assert.equal(sessionIsRevoked(mark, iatAfter), true);
assert.equal(sessionIsRevoked("revoked:not-a-date", iatAfter), true);

const stored = fakeJwt(1_000);
assert.equal(sessionIsRevoked(stored, 999), true);
assert.equal(sessionIsRevoked(stored, 1_000), false);
assert.equal(sessionIsRevoked(stored, 1_001), false);
assert.equal(sessionIsRevoked(stored, undefined), true);

console.log("sessionRevocation tests passed");
