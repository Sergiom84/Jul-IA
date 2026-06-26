import { test } from "node:test";
import assert from "node:assert/strict";
import { isAllowedUrl, htmlToText, extractTitle } from "./url";

test("allowlist: acepta dominios oficiales por https", () => {
  assert.equal(isAllowedUrl("https://www.boe.es/diario_boe/"), true);
  assert.equal(isAllowedUrl("https://boe.es"), true);
  assert.equal(isAllowedUrl("https://sede.agenciatributaria.gob.es/x"), true);
});

test("allowlist: rechaza http, dominios ajenos y suplantaciones", () => {
  assert.equal(isAllowedUrl("http://www.boe.es"), false); // no https
  assert.equal(isAllowedUrl("https://evil.com"), false);
  assert.equal(isAllowedUrl("https://boe.es.evil.com"), false); // sufijo falso
  assert.equal(isAllowedUrl("no-es-una-url"), false);
  assert.equal(isAllowedUrl("ftp://boe.es/x"), false);
});

test("htmlToText limpia scripts y etiquetas", () => {
  const html = "<p>Hola <b>mundo</b></p><script>alert(1)</script>";
  const text = htmlToText(html);
  assert.match(text, /Hola/);
  assert.match(text, /mundo/);
  assert.doesNotMatch(text, /alert/);
  assert.doesNotMatch(text, /</);
});

test("extractTitle devuelve el título de la página", () => {
  assert.equal(extractTitle("<html><title>BOE</title></html>"), "BOE");
  assert.equal(extractTitle("<html>sin título</html>"), null);
});
