import { test } from "node:test";
import assert from "node:assert/strict";
import { sanitizeNextPath } from "./safe-path";

test("acepta rutas internas", () => {
  assert.equal(sanitizeNextPath("/chat"), "/chat");
  assert.equal(sanitizeNextPath("/chat?x=1"), "/chat?x=1");
  assert.equal(sanitizeNextPath("/documentos"), "/documentos");
});

test("rechaza open redirects y vuelve a /chat", () => {
  assert.equal(sanitizeNextPath(null), "/chat");
  assert.equal(sanitizeNextPath(undefined), "/chat");
  assert.equal(sanitizeNextPath(""), "/chat");
  assert.equal(sanitizeNextPath("//evil.com"), "/chat");
  assert.equal(sanitizeNextPath("https://evil.com"), "/chat");
  assert.equal(sanitizeNextPath("http://evil.com"), "/chat");
  assert.equal(sanitizeNextPath("javascript:alert(1)"), "/chat");
  assert.equal(sanitizeNextPath("/\\evil.com"), "/chat");
  assert.equal(sanitizeNextPath("relative/path"), "/chat");
});

test("neutraliza codificaciones que esconden // o backslash", () => {
  assert.equal(sanitizeNextPath("%2F%2Fevil.com"), "/chat"); // //evil.com
  assert.equal(sanitizeNextPath("/%5Cevil"), "/chat"); // /\evil
});
