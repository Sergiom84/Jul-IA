"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { UploadCloud, FileText, Globe, Trash2, Link as LinkIcon } from "lucide-react";
import type { Source } from "@/src/lib/types";
import styles from "../documents.module.css";

const ACCEPT = ".pdf,.docx,.txt,.md";
const STATUS_LABEL: Record<Source["status"], string> = {
  uploaded: "En cola",
  processing: "Procesando",
  ready: "Listo",
  error: "Error",
};
const STATUS_CLASS: Record<Source["status"], string> = {
  uploaded: styles.badgeUploaded,
  processing: styles.badgeProcessing,
  ready: styles.badgeReady,
  error: styles.badgeError,
};

export default function DocumentsPanel() {
  const [sources, setSources] = useState<Source[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const res = await fetch("/api/sources");
    if (res.ok) setSources(await res.json());
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  // Polling mientras haya fuentes en proceso.
  useEffect(() => {
    const pending = sources.some(
      (s) => s.status === "uploaded" || s.status === "processing",
    );
    if (!pending) return;
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, [sources, load]);

  async function uploadFiles(files: FileList | File[]) {
    setError(null);
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const form = new FormData();
        form.append("file", file);
        const res = await fetch("/api/sources", {
          method: "POST",
          body: form,
        });
        if (!res.ok) {
          const msg = await res.text();
          setError(`No se pudo subir "${file.name}": ${msg}`);
        }
      }
      await load();
    } finally {
      setUploading(false);
    }
  }

  async function addUrl(e: React.FormEvent) {
    e.preventDefault();
    const value = url.trim();
    if (!value || addingUrl) return;
    setError(null);
    setAddingUrl(true);
    try {
      const res = await fetch("/api/sources", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: value }),
      });
      if (!res.ok) {
        setError(await res.text());
      } else {
        setUrl("");
        await load();
      }
    } finally {
      setAddingUrl(false);
    }
  }

  async function remove(id: string) {
    if (!confirm("¿Eliminar este documento y su análisis?")) return;
    await fetch(`/api/sources?id=${id}`, { method: "DELETE" });
    setSources((prev) => prev.filter((s) => s.id !== id));
  }

  return (
    <div className={styles.panel}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2>Documentos y fuentes</h2>
          <p>
            Sube tu documentación fiscal y laboral. jul-IA la analiza y la usa
            para responder citando las fuentes.
          </p>
        </div>

        <div
          className={`${styles.dropzone} ${dragOver ? styles.dropzoneActive : ""}`}
          onClick={() => inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragOver(false);
            if (e.dataTransfer.files.length) uploadFiles(e.dataTransfer.files);
          }}
        >
          <UploadCloud size={32} className={styles.dropIcon} />
          <div>
            {uploading
              ? "Subiendo…"
              : "Arrastra archivos aquí o pulsa para seleccionar"}
          </div>
          <div className={styles.dropHint}>PDF, DOCX, TXT, MD · máx. 25 MB</div>
          <input
            ref={inputRef}
            type="file"
            accept={ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) uploadFiles(e.target.files);
              e.target.value = "";
            }}
          />
        </div>

        <form className={styles.urlRow} onSubmit={addUrl}>
          <input
            className="input"
            type="url"
            placeholder="https://www.boe.es/... (fuentes oficiales)"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
          />
          <button
            type="submit"
            className="btn btn-subtle"
            disabled={!url.trim() || addingUrl}
          >
            <LinkIcon size={16} /> {addingUrl ? "Añadiendo…" : "Añadir URL"}
          </button>
        </form>

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.list}>
          {sources.map((s) => (
            <div key={s.id} className={styles.item}>
              {s.type === "document" ? (
                <FileText size={20} className={styles.itemIcon} />
              ) : (
                <Globe size={20} className={styles.itemIcon} />
              )}
              <div className={styles.itemBody}>
                <div className={styles.itemName}>
                  {s.title || s.file_name || s.url || "Sin nombre"}
                </div>
                <div className={styles.itemMeta}>
                  {s.status === "ready"
                    ? `${s.chunk_count} fragmentos indexados`
                    : s.status === "error"
                      ? s.error || "Fallo al procesar"
                      : "Esperando análisis…"}
                </div>
              </div>
              <span className={`${styles.badge} ${STATUS_CLASS[s.status]}`}>
                {STATUS_LABEL[s.status]}
              </span>
              <button
                className={styles.itemDelete}
                onClick={() => remove(s.id)}
                aria-label="Eliminar"
              >
                <Trash2 size={16} />
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
