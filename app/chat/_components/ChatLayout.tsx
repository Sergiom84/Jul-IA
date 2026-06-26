"use client";

import { useCallback, useState } from "react";
import type { Conversation, Message } from "@/src/lib/types";
import {
  createConversation,
  deleteConversation,
  getMessages,
} from "../actions";
import Sidebar from "./Sidebar";
import ChatWindow from "./ChatWindow";
import DocumentsPanel from "./DocumentsPanel";
import styles from "../chat.module.css";

type View = "chat" | "docs";

export default function ChatLayout({
  initialConversations,
  userEmail,
}: {
  initialConversations: Conversation[];
  userEmail: string | null;
}) {
  const [conversations, setConversations] =
    useState<Conversation[]>(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [view, setView] = useState<View>("chat");
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const closeDrawer = useCallback(() => setSidebarOpen(false), []);

  const handleNew = useCallback(() => {
    setActiveId(null);
    setMessages([]);
    setView("chat");
    closeDrawer();
  }, [closeDrawer]);

  const handleSelect = useCallback(
    async (id: string) => {
      setActiveId(id);
      setView("chat");
      closeDrawer();
      const msgs = await getMessages(id);
      setMessages(msgs);
    },
    [closeDrawer],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      await deleteConversation(id);
      setConversations((prev) => prev.filter((c) => c.id !== id));
      if (activeId === id) {
        setActiveId(null);
        setMessages([]);
      }
    },
    [activeId],
  );

  // Crea una conversación al enviar el primer mensaje sin una activa.
  const ensureConversation = useCallback(
    async (firstMessage: string): Promise<string> => {
      const title =
        firstMessage.trim().slice(0, 60) +
        (firstMessage.trim().length > 60 ? "…" : "");
      const conv = await createConversation(title);
      setConversations((prev) => [conv, ...prev]);
      setActiveId(conv.id);
      return conv.id;
    },
    [],
  );

  // Mueve la conversación al principio del historial tras actividad.
  const bumpConversation = useCallback((id: string) => {
    setConversations((prev) => {
      const idx = prev.findIndex((c) => c.id === id);
      if (idx <= 0) return prev;
      const copy = [...prev];
      const [c] = copy.splice(idx, 1);
      return [c, ...copy];
    });
  }, []);

  return (
    <div className={styles.app}>
      <div
        className={`${styles.overlay} ${
          sidebarOpen ? styles.overlayVisible : ""
        }`}
        onClick={closeDrawer}
        aria-hidden
      />

      <Sidebar
        open={sidebarOpen}
        conversations={conversations}
        activeId={activeId}
        view={view}
        userEmail={userEmail}
        onNew={handleNew}
        onSelect={handleSelect}
        onDelete={handleDelete}
        onShowDocs={() => {
          setView("docs");
          closeDrawer();
        }}
      />

      <main className={styles.main}>
        <header className={styles.topbar}>
          <button
            className={styles.hamburger}
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <MenuIcon />
          </button>
          <span className={styles.topTitle}>
            {view === "docs"
              ? "Documentos y fuentes"
              : activeId
                ? conversations.find((c) => c.id === activeId)?.title ??
                  "Conversación"
                : "Nueva consulta"}
          </span>
        </header>

        {view === "docs" ? (
          <DocumentsPanel />
        ) : (
          <ChatWindow
            key={activeId ?? "new"}
            conversationId={activeId}
            messages={messages}
            setMessages={setMessages}
            ensureConversation={ensureConversation}
            onActivity={bumpConversation}
          />
        )}
      </main>
    </div>
  );
}

function MenuIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
      <path d="M3 6h18M3 12h18M3 18h18" />
    </svg>
  );
}
