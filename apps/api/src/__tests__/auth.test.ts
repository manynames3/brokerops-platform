import assert from "node:assert/strict";
import {
  createSessionToken,
  hashPassword,
  verifyPassword,
  verifySessionToken,
  type AuthenticatedUser
} from "../auth.js";

const hash = hashPassword("correct-password");
assert.equal(verifyPassword("correct-password", hash), true);
assert.equal(verifyPassword("wrong-password", hash), false);

const user: AuthenticatedUser = {
  id: "00000000-0000-4000-8000-000000000001",
  organizationId: "00000000-0000-4000-8000-000000000002",
  email: "ops@brokerops.local",
  displayName: "BrokerOps Admin",
  role: "admin"
};

const session = createSessionToken(user);
const verified = verifySessionToken(session.token);
assert.deepEqual(verified, user);

const [payload, signature] = session.token.split(".");
assert.equal(verifySessionToken(`${payload}tampered.${signature}`), null);

console.log("auth tests passed");
