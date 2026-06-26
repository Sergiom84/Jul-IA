export type TextChunk = {
  index: number;
  content: string;
  tokenCount: number;
};

const estimateTokens = (text: string) => Math.ceil(text.length / 4);

/**
 * Trocea texto en fragmentos de ~maxChars con solape, respetando límites de
 * párrafo cuando es posible. ~4000 chars ≈ 1000 tokens.
 */
export function chunkText(
  text: string,
  maxChars = 4000,
  overlapChars = 400,
): TextChunk[] {
  const clean = text.replace(/\r\n/g, "\n").trim();
  if (!clean) return [];

  const paragraphs = clean.split(/\n{2,}/);
  const chunks: string[] = [];
  let current = "";

  const push = () => {
    const trimmed = current.trim();
    if (trimmed) chunks.push(trimmed);
  };

  for (const para of paragraphs) {
    // Párrafo gigante: trocear por ventana de caracteres.
    if (para.length > maxChars) {
      push();
      current = "";
      for (let i = 0; i < para.length; i += maxChars - overlapChars) {
        chunks.push(para.slice(i, i + maxChars).trim());
      }
      continue;
    }

    if (current && current.length + para.length + 2 > maxChars) {
      push();
      // Solape: arrastra la cola del fragmento anterior.
      const tail = current.slice(-overlapChars);
      current = `${tail}\n\n${para}`;
    } else {
      current = current ? `${current}\n\n${para}` : para;
    }
  }
  push();

  return chunks.map((content, index) => ({
    index,
    content,
    tokenCount: estimateTokens(content),
  }));
}
