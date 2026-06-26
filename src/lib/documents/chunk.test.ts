import { test } from "node:test";
import assert from "node:assert/strict";
import { chunkText } from "./chunk";

test("texto vacío → sin chunks", () => {
  assert.deepEqual(chunkText(""), []);
  assert.deepEqual(chunkText("   \n  "), []);
});

test("texto corto → un único chunk", () => {
  const chunks = chunkText("Hola mundo fiscal");
  assert.equal(chunks.length, 1);
  assert.equal(chunks[0].index, 0);
  assert.match(chunks[0].content, /Hola mundo fiscal/);
  assert.ok(chunks[0].tokenCount > 0);
});

test("texto largo → varios chunks con índices correlativos", () => {
  const parrafo = "lorem ipsum ".repeat(200); // ~2400 chars
  const texto = `${parrafo}\n\n${parrafo}\n\n${parrafo}`; // ~7200 chars
  const chunks = chunkText(texto, 2000, 200);
  assert.ok(chunks.length > 1, "debe partir en varios chunks");
  chunks.forEach((c, i) => assert.equal(c.index, i));
  // Ningún chunk excede de forma flagrante el máximo (+ solape).
  for (const c of chunks) assert.ok(c.content.length <= 2000 + 400);
});
