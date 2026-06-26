"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  UploadCloud,
  FileText,
  Globe,
  Trash2,
  Link as LinkIcon,
  RotateCw,
  Pencil,
  Eye,
  Download,
  FolderInput,
} from "lucide-react";
import type { Source, SourceCategory } from "@/src/lib/types";
import styles from "../documents.module.css";

const ACCEPT = ".pdf,.docx,.txt,.md";
const TABS: { key: SourceCategory; label: string; hint: string }[] = [
  {
    key: "knowledge",
    label: "Fuente de conocimiento",
    hint: "Documentos y enlaces que jul-IA usa para responder (RAG).",
  },
  {
    key: "upload",
    label: "Documentos subidos",
    hint: "Documentos sueltos que subes para gestión puntual (p.ej. una factura).",
  },
];
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
  const [tab, setTab] = useState<SourceCategory>("knowledge");
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [url, setUrl] = useState("");
  const [addingUrl, setAddingUrl] = useState(false);
  const [menuId, setMenuId] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Documentos antiguos sin categoría se tratan como base de conocimiento.
  const visible = sources.filter((s) => (s.category ?? "knowledge") === tab);

  const load = useCallback(async () => {
    const res = await fetch("/api/sources");
    if (res.ok) setSources(await res.json());
  }, []);

  useEffect(() => {
    // Carga inicial de fuentes al montar (fetch async; el setState ocurre tras
    // la red, no de forma síncrona). Patrón estándar de data-fetch en efecto.
    // eslint-disable-next-line react-hooks/set-state-in-effect
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
        form.append("category", tab);
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
        body: JSON.stringify({ url: value, category: tab }),
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

  // Abre el documento (URL firmada). download=true fuerza la descarga.
  async function openSource(id: string, download: boolean) {
    setMenuId(null);
    const res = await fetch(
      `/api/sources?id=${id}${download ? "&download=1" : ""}`,
    );
    if (!res.ok) {
      setError(await res.text());
      return;
    }
    const { url: signed } = (await res.json()) as { url: string };
    window.open(signed, "_blank", "noopener,noreferrer");
  }

  // Mueve un documento entre pestañas (conocimiento <-> subidos).
  async function moveCategory(id: string, category: SourceCategory) {
    setMenuId(null);
    await fetch(`/api/sources?id=${id}&category=${category}`, {
      method: "PATCH",
    });
    await load();
  }

  async function retry(id: string) {
    setSources((prev) =>
      prev.map((s) => (s.id === id ? { ...s, status: "uploaded", error: null } : s)),
    );
    await fetch(`/api/sources?id=${id}`, { method: "PATCH" });
    await load();
  }

  return (
    <div className={styles.panel}>
      <div className={styles.inner}>
        <div className={styles.head}>
          <h2>Documentos y fuentes</h2>
        </div>

        <div className={styles.tabs} role="tablist">
          {TABS.map((t) => (
            <button
              key={t.key}
              role="tab"
              aria-selected={tab === t.key}
              className={`${styles.tab} ${tab === t.key ? styles.tabActive : ""}`}
              onClick={() => {
                setTab(t.key);
                setError(null);
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
        <p className={styles.tabHint}>
          {TABS.find((t) => t.key === tab)?.hint}
        </p>

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

        {tab === "knowledge" && (
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
        )}

        {error && <div className={styles.error}>{error}</div>}

        <div className={styles.list}>
          {visible.length === 0 && (
            <div className={styles.emptyList}>
              Aún no hay documentos en esta sección.
            </div>
          )}
          {visible.map((s) => (
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
              {s.status === "error" && (
                <button
                  className={styles.itemDelete}
                  onClick={() => retry(s.id)}
                  aria-label="Reintentar"
                  title="Reintentar análisis"
                >
                  <RotateCw size={16} />
                </button>
              )}
              <div className={styles.itemMenuWrap}>
                <button
                  className={styles.itemAction}
                  onClick={() => setMenuId(menuId === s.id ? null : s.id)}
                  aria-label="Editar"
                  title="Ver / editar"
                >
                  <Pencil size={16} />
                </button>
                {menuId === s.id && (
                  <>
                    <div
                      className={styles.menuBackdrop}
                      onClick={() => setMenuId(null)}
                    />
                    <div className={styles.itemMenu}>
                      <button
                        className={styles.menuItem}
                        onClick={() => openSource(s.id, false)}
                      >
                        <Eye size={15} /> Ver
                      </button>
                      {(s.category ?? "knowledge") === "upload" ? (
                        <button
                          className={styles.menuItem}
                          onClick={() => moveCategory(s.id, "knowledge")}
                        >
                          <FolderInput size={15} /> Mover a Fuente de conocimiento
                        </button>
                      ) : (
                        <button
                          className={styles.menuItem}
                          onClick={() => openSource(s.id, true)}
                        >
                          <Download size={15} /> Descargar
                        </button>
                      )}
                    </div>
                  </>
                )}
              </div>
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
