"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import styles from "../window.module.css";

/** Copia el texto dado al portapapeles con feedback breve "Copiado". */
export default function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* portapapeles no disponible: no hacemos nada visible */
    }
  }

  return (
    <button
      type="button"
      className={styles.copyBtn}
      onClick={copy}
      aria-label={copied ? "Copiado" : "Copiar respuesta"}
      title={copied ? "Copiado" : "Copiar respuesta"}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
      <span>{copied ? "Copiado" : "Copiar"}</span>
    </button>
  );
}
