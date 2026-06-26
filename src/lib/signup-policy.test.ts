import { test } from "node:test";
import assert from "node:assert/strict";
import { isSignupAllowed } from "./signup-policy";

test("registro público permite cualquier correo", () => {
  assert.equal(isSignupAllowed("x@y.com", { allowPublic: true }), true);
});

test("registro cerrado: solo correos de la allowlist", () => {
  const opts = { allowPublic: false, allowlistCsv: "owner@jul.com, jefe@jul.com" };
  assert.equal(isSignupAllowed("owner@jul.com", opts), true);
  assert.equal(isSignupAllowed("OWNER@JUL.COM", opts), true); // case-insensitive
  assert.equal(isSignupAllowed("  jefe@jul.com ", opts), true); // trim
  assert.equal(isSignupAllowed("intruso@evil.com", opts), false);
});

test("registro cerrado sin allowlist → nadie puede", () => {
  assert.equal(isSignupAllowed("x@y.com", { allowPublic: false }), false);
  assert.equal(isSignupAllowed("x@y.com", { allowPublic: false, allowlistCsv: "" }), false);
});
