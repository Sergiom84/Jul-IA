"use client";

import { useState } from "react";
import { PenLine, FileSearch, Quote, ChevronDown } from "lucide-react";
import styles from "../window.module.css";

// Plantillas de redacción (prompts guiados con huecos que la usuaria completa).
const TEMPLATES: { label: string; prompt: string }[] = [
  {
    label: "Recurso administrativo",
    prompt:
      "Redacta un recurso de reposición.\n\n" +
      "- Interesado: [nombre y NIF]\n" +
      "- Órgano: [órgano que dictó la resolución]\n" +
      "- Resolución recurrida: [referencia y fecha]\n" +
      "- Motivo: [por qué no estoy de acuerdo]\n\n" +
      "Tono formal, con encabezado, hechos, fundamentos de derecho y solicitud.",
  },
  {
    label: "Contrato",
    prompt:
      "Redacta un contrato de [arrendamiento / servicios / compraventa].\n\n" +
      "- Parte A: [nombre y NIF]\n" +
      "- Parte B: [nombre y NIF]\n" +
      "- Objeto: [descripción]\n" +
      "- Precio: [importe y forma de pago]\n" +
      "- Duración: [plazo]\n\n" +
      "Incluye las cláusulas habituales y avísame de los puntos a revisar.",
  },
  {
    label: "Escrito / Requerimiento",
    prompt:
      "Redacta un escrito de [requerimiento / alegaciones / solicitud] dirigido a [destinatario].\n\n" +
      "- Remitente: [nombre y NIF]\n" +
      "- Asunto: [resumen]\n" +
      "- Lo que solicito: [detalle]\n\n" +
      "Tono formal y claro.",
  },
];

const REVIEW_PROMPT =
  "Revisa el documento que te indico y dame:\n" +
  "1) Resumen breve\n" +
  "2) Puntos o cláusulas clave\n" +
  "3) Posibles riesgos o cosas a vigilar\n\n" +
  "Documento: [nombre del documento que he subido]";

const CITES_SUFFIX =
  " (Cita los artículos exactos y añade enlaces a las fuentes oficiales.)";

export default function QuickActions({
  onInsert,
  onAppend,
}: {
  onInsert: (text: string) => void;
  onAppend: (text: string) => void;
}) {
  const [openTemplates, setOpenTemplates] = useState(false);

  return (
    <div className={styles.quickActions}>
      <div className={styles.qaGroup}>
        <button
          type="button"
          className={styles.quickAction}
          onClick={() => setOpenTemplates((v) => !v)}
          aria-expanded={openTemplates}
        >
          <PenLine size={15} /> Redactar
          <ChevronDown size={13} />
        </button>
        {openTemplates && (
          <>
            <div
              className={styles.qaBackdrop}
              onClick={() => setOpenTemplates(false)}
              aria-hidden
            />
            <div className={styles.templatesPop} role="menu">
              {TEMPLATES.map((t) => (
                <button
                  key={t.label}
                  type="button"
                  className={styles.templateItem}
                  role="menuitem"
                  onClick={() => {
                    onInsert(t.prompt);
                    setOpenTemplates(false);
                  }}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      <button
        type="button"
        className={styles.quickAction}
        onClick={() => onInsert(REVIEW_PROMPT)}
      >
        <FileSearch size={15} /> Revisar documento
      </button>

      <button
        type="button"
        className={styles.quickAction}
        onClick={() => onAppend(CITES_SUFFIX)}
        title="Añade a tu mensaje: cita artículos y enlaces"
      >
        <Quote size={15} /> Citas detalladas
      </button>
    </div>
  );
}
