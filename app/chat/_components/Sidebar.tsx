"use client";

import { Scale, Plus, FileText, MessageSquare, Trash2, LogOut } from "lucide-react";
import type { Conversation } from "@/src/lib/types";
import { signOut } from "../actions";
import styles from "../chat.module.css";

export default function Sidebar({
  open,
  conversations,
  activeId,
  view,
  userEmail,
  onNew,
  onSelect,
  onDelete,
  onShowDocs,
}: {
  open: boolean;
  conversations: Conversation[];
  activeId: string | null;
  view: "chat" | "docs";
  userEmail: string | null;
  onNew: () => void;
  onSelect: (id: string) => void;
  onDelete: (id: string) => void;
  onShowDocs: () => void;
}) {
  return (
    <aside className={`${styles.sidebar} ${open ? styles.sidebarOpen : ""}`}>
      <div className={styles.sidebarHeader}>
        <span className={styles.logo}>
          <Scale size={18} />
        </span>
        <span className={styles.logoText}>
          <b>jul-IA</b>
          <span>Asesor fiscal y laboral</span>
        </span>
      </div>

      <div className={styles.sidebarActions}>
        <button className={`btn btn-primary ${styles.newBtn}`} onClick={onNew}>
          <Plus size={16} /> Nueva conversación
        </button>
        <button
          className={`${styles.navBtn} ${
            view === "docs" ? styles.navBtnActive : ""
          }`}
          onClick={onShowDocs}
        >
          <FileText size={16} /> Subir documentos
        </button>
      </div>

      <div className={styles.sectionLabel}>Historial</div>
      <nav className={styles.history}>
        {conversations.length === 0 ? (
          <div className={styles.empty}>Aún no hay conversaciones.</div>
        ) : (
          conversations.map((c) => (
            <div
              key={c.id}
              className={`${styles.convItem} ${
                view === "chat" && c.id === activeId ? styles.convItemActive : ""
              }`}
              onClick={() => onSelect(c.id)}
            >
              <MessageSquare size={15} className={styles.itemIcon} />
              <span className={styles.convTitle}>
                {c.title || "Conversación sin título"}
              </span>
              <button
                className={styles.convDelete}
                aria-label="Borrar conversación"
                onClick={(e) => {
                  e.stopPropagation();
                  if (confirm("¿Borrar esta conversación?")) onDelete(c.id);
                }}
              >
                <Trash2 size={15} />
              </button>
            </div>
          ))
        )}
      </nav>

      <div className={styles.sidebarFooter}>
        <span className={styles.userEmail}>{userEmail ?? "Invitado"}</span>
        <form action={signOut}>
          <button className={styles.convDelete} aria-label="Cerrar sesión" type="submit">
            <LogOut size={16} />
          </button>
        </form>
      </div>
    </aside>
  );
}
