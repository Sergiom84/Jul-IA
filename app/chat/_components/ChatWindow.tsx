"use client";

import {
  useEffect,
  useRef,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import {
  Scale,
  Send,
  FileText,
  Globe,
  Paperclip,
  Loader2,
  CheckCircle2,
  AlertCircle,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import type { Citation, Message } from "@/src/lib/types";
import styles from "../window.module.css";

const SUGGESTIONS = [
  "¿Qué gastos puedo deducir como autónomo en el IRPF?",
  "Resume las obligaciones de una nómina según el documento que subí.",
  "¿Cuándo se presenta el modelo 303 y qué incluye?",
];

const UPLOAD_ACCEPT = ".pdf,.docx,.txt,.md";

type Attachment = {
  id: string;
  name: string;
  status: "uploaded" | "processing" | "ready" | "error";
};

let tempId = 0;
const nextTempId = () => `temp-${Date.now()}-${tempId++}`;

export default function ChatWindow({
  conversationId,
  messages,
  setMessages,
  ensureConversation,
  onActivity,
}: {
  conversationId: string | null;
  messages: Message[];
  setMessages: Dispatch<SetStateAction<Message[]>>;
  ensureConversation: (firstMessage: string) => Promise<string>;
  onActivity: (id: string) => void;
}) {
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [webSearch, setWebSearch] = useState(false);
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  // Sube documentos adjuntados desde el chat y los añade a la biblioteca.
  async function handleAttach(files: FileList | File[]) {
    for (const file of Array.from(files)) {
      const form = new FormData();
      form.append("file", file);
      try {
        const res = await fetch("/api/sources", { method: "POST", body: form });
        if (!res.ok) {
          setAttachments((p) => [
            ...p,
            { id: `err-${Date.now()}`, name: file.name, status: "error" },
          ]);
          continue;
        }
        const src = (await res.json()) as { id: string; status: Attachment["status"] };
        setAttachments((p) => [
          ...p,
          { id: src.id, name: file.name, status: src.status },
        ]);
      } catch {
        setAttachments((p) => [
          ...p,
          { id: `err-${Date.now()}`, name: file.name, status: "error" },
        ]);
      }
    }
  }

  // Polling del estado de los adjuntos mientras se procesan.
  useEffect(() => {
    const pending = attachments.some(
      (a) => a.status === "uploaded" || a.status === "processing",
    );
    if (!pending) return;
    const t = setInterval(async () => {
      try {
        const res = await fetch("/api/sources");
        if (!res.ok) return;
        const list = (await res.json()) as { id: string; status: Attachment["status"] }[];
        const byId = new Map(list.map((s) => [s.id, s.status]));
        setAttachments((prev) =>
          prev.map((a) =>
            byId.has(a.id) ? { ...a, status: byId.get(a.id)! } : a,
          ),
        );
      } catch {
        /* reintenta en el siguiente tick */
      }
    }, 3000);
    return () => clearInterval(t);
  }, [attachments]);

  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);

  function autoGrow() {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = Math.min(ta.scrollHeight, 180) + "px";
  }

  async function send(text: string) {
    const content = text.trim();
    if (!content || sending) return;
    setSending(true);
    setInput("");
    requestAnimationFrame(autoGrow);

    let convId = conversationId;
    try {
      if (!convId) convId = await ensureConversation(content);
    } catch {
      setSending(false);
      return;
    }

    const userMsg: Message = {
      id: nextTempId(),
      conversation_id: convId,
      role: "user",
      content,
      status: "complete",
      citations: [],
      created_at: new Date().toISOString(),
    };
    const aiMsg: Message = {
      id: nextTempId(),
      conversation_id: convId,
      role: "assistant",
      content: "",
      status: "incomplete",
      citations: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, userMsg, aiMsg]);
    onActivity(convId);

    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          conversationId: convId,
          message: content,
          webSearch,
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error((await res.text()) || "Error en el servidor");
      }

      const sourcesHeader = res.headers.get("x-julia-sources");
      const citations: Citation[] = sourcesHeader
        ? JSON.parse(decodeURIComponent(sourcesHeader))
        : [];

      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMessages((prev) =>
          prev.map((m) => (m.id === aiMsg.id ? { ...m, content: acc } : m)),
        );
      }

      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsg.id
            ? { ...m, content: acc, status: "complete", citations }
            : m,
        ),
      );
    } catch (err) {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === aiMsg.id
            ? {
                ...m,
                content:
                  m.content ||
                  "⚠️ No se pudo obtener respuesta. Revisa la conexión o la configuración del proveedor de IA.",
                status: "incomplete",
              }
            : m,
        ),
      );
      console.error(err);
    } finally {
      setSending(false);
    }
  }

  const showEmpty = messages.length === 0;

  return (
    <div className={styles.window}>
      <div className={styles.scroll} ref={scrollRef}>
        {showEmpty ? (
          <div className={styles.empty}>
            <span className={styles.emptyLogo}>
              <Scale size={28} />
            </span>
            <h2 className={styles.emptyTitle}>¿En qué puedo ayudarte?</h2>
            <p>
              Asesor fiscal y laboral para España. Responde con base en tus
              documentos y cita sus fuentes.
            </p>
            <div className={styles.suggestions}>
              {SUGGESTIONS.map((s) => (
                <button
                  key={s}
                  className={styles.suggestion}
                  onClick={() => send(s)}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <div className={styles.thread}>
            {messages.map((m) => (
              <MessageRow key={m.id} message={m} sending={sending} />
            ))}
          </div>
        )}
      </div>

      <div className={styles.composerWrap}>
        {attachments.length > 0 && (
          <div className={styles.attachments}>
            {attachments.map((a) => (
              <span key={a.id} className={styles.attachment}>
                {a.status === "ready" ? (
                  <CheckCircle2 size={14} className={styles.attReady} />
                ) : a.status === "error" ? (
                  <AlertCircle size={14} className={styles.attError} />
                ) : (
                  <Loader2 size={14} className={styles.attSpin} />
                )}
                <span className={styles.attName}>{a.name}</span>
                <span className={styles.attStatus}>
                  {a.status === "ready"
                    ? "listo"
                    : a.status === "error"
                      ? "error"
                      : "procesando…"}
                </span>
                <button
                  type="button"
                  className={styles.attClose}
                  aria-label="Quitar de la lista"
                  onClick={() =>
                    setAttachments((p) => p.filter((x) => x.id !== a.id))
                  }
                >
                  <X size={13} />
                </button>
              </span>
            ))}
          </div>
        )}
        <form
          className={styles.composer}
          onSubmit={(e) => {
            e.preventDefault();
            send(input);
          }}
        >
          <input
            ref={fileRef}
            type="file"
            accept={UPLOAD_ACCEPT}
            multiple
            hidden
            onChange={(e) => {
              if (e.target.files?.length) handleAttach(e.target.files);
              e.target.value = "";
            }}
          />
          <button
            type="button"
            className={styles.tool}
            onClick={() => fileRef.current?.click()}
            title="Adjuntar documento (PDF, DOCX, TXT, MD)"
            aria-label="Adjuntar documento"
          >
            <Paperclip size={18} />
          </button>
          <button
            type="button"
            className={`${styles.tool} ${webSearch ? styles.toolOn : ""}`}
            onClick={() => setWebSearch((v) => !v)}
            aria-pressed={webSearch}
            title={
              webSearch
                ? "Búsqueda web activada"
                : "Activar búsqueda en internet"
            }
          >
            <Globe size={18} />
          </button>
          <textarea
            ref={taRef}
            className={styles.textarea}
            placeholder="Escribe tu consulta fiscal o laboral…"
            rows={1}
            value={input}
            onChange={(e) => {
              setInput(e.target.value);
              autoGrow();
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                send(input);
              }
            }}
          />
          <button
            type="submit"
            className={styles.send}
            disabled={!input.trim() || sending}
            aria-label="Enviar"
          >
            <Send size={18} />
          </button>
        </form>
        <p className={styles.disclaimer}>
          jul-IA puede cometer errores. No sustituye el asesoramiento
          profesional. Verifica la información importante.
        </p>
      </div>
    </div>
  );
}

function MessageRow({
  message,
  sending,
}: {
  message: Message;
  sending: boolean;
}) {
  const isUser = message.role === "user";
  const streaming =
    !isUser && message.status === "incomplete" && message.content === "";

  return (
    <div className={`${styles.row} ${isUser ? styles.rowUser : ""}`}>
      <span
        className={`${styles.avatar} ${
          isUser ? styles.avatarUser : styles.avatarAi
        }`}
      >
        {isUser ? "Tú" : <Scale size={16} />}
      </span>
      <div
        className={`${styles.bubble} ${
          isUser ? styles.bubbleUser : styles.bubbleAi
        }`}
      >
        {isUser ? (
          message.content
        ) : (
          <div className={styles.md}>
            <ReactMarkdown remarkPlugins={[remarkGfm]}>
              {message.content}
            </ReactMarkdown>
          </div>
        )}
        {!isUser && sending && message.status === "incomplete" && (
          <span className={styles.cursor} />
        )}
        {streaming && <span style={{ opacity: 0.6 }}>Pensando…</span>}
        {message.citations.length > 0 && (
          <div className={styles.sources}>
            {message.citations.map((c) => (
              <span key={c.source_id} className={styles.sourceChip}>
                <FileText size={12} /> {c.title}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
