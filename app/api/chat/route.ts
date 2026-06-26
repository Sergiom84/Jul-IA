import { type NextRequest } from "next/server";
import { streamText, stepCountIs, type ModelMessage } from "ai";
import { getServerClient, getUser } from "@/src/lib/supabase/server";
import { getChatModel } from "@/src/lib/ai/provider";
import { getWebSearchTools } from "@/src/lib/ai/web-search";
import { buildSystemPrompt } from "@/src/lib/ai/system-prompt";
import { retrieveContext } from "@/src/lib/rag/retrieve";
import type { Citation } from "@/src/lib/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const HISTORY_LIMIT = 12;

export async function POST(request: NextRequest) {
  const user = await getUser();
  if (!user) return new Response("No autenticado", { status: 401 });

  const { conversationId, message, webSearch } = (await request.json()) as {
    conversationId?: string;
    message?: string;
    webSearch?: boolean;
  };
  if (!conversationId || !message?.trim()) {
    return new Response("Petición inválida", { status: 400 });
  }

  const supabase = await getServerClient();

  // Verifica que la conversación es del usuario (RLS lo refuerza igualmente).
  const { data: conv } = await supabase
    .from("conversations")
    .select("id")
    .eq("id", conversationId)
    .single();
  if (!conv) return new Response("Conversación no encontrada", { status: 404 });

  // 1) Persistir el mensaje del usuario ANTES del stream.
  await supabase.from("messages").insert({
    conversation_id: conversationId,
    role: "user",
    content: message.trim(),
  });

  // 2) Historial reciente para contexto conversacional.
  const { data: history } = await supabase
    .from("messages")
    .select("role, content")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(HISTORY_LIMIT);

  const modelMessages: ModelMessage[] = (history ?? [])
    .reverse()
    .filter((m) => m.role === "user" || m.role === "assistant")
    .map((m) => ({
      role: m.role as "user" | "assistant",
      content: m.content,
    }));

  // 3) RAG: recuperar fragmentos relevantes (filtra por usuario en SQL).
  const chunks = await retrieveContext(message.trim());

  // Citas deduplicadas por fuente para mostrar en la UI.
  const citations: Citation[] = [];
  const seen = new Set<string>();
  for (const c of chunks) {
    if (seen.has(c.source_id)) continue;
    seen.add(c.source_id);
    citations.push({
      source_id: c.source_id,
      title: c.source_title || "Documento",
      type: (c.source_type as Citation["type"]) || "document",
    });
  }

  const useWebSearch = webSearch === true;
  const system = buildSystemPrompt(chunks, useWebSearch);

  // 4) Stream del modelo configurado; persistir respuesta al terminar.
  const result = streamText({
    model: getChatModel({ webSearch: useWebSearch }),
    system,
    messages: modelMessages,
    temperature: 0.2,
    tools: useWebSearch ? getWebSearchTools() : undefined,
    stopWhen: useWebSearch ? stepCountIs(5) : undefined,
    onFinish: async ({ text, sources }) => {
      // Añade las fuentes web usadas (si las hubo) a las citas persistidas.
      const allCitations = [...citations];
      const seenUrls = new Set<string>();
      for (const s of sources ?? []) {
        if (s.sourceType !== "url" || !s.url || seenUrls.has(s.url)) continue;
        seenUrls.add(s.url);
        allCitations.push({
          source_id: s.url,
          title: s.title || new URL(s.url).hostname,
          type: "url",
        });
      }
      await supabase.from("messages").insert({
        conversation_id: conversationId,
        role: "assistant",
        content: text,
        status: "complete",
        citations: allCitations,
      });
      await supabase
        .from("conversations")
        .update({ updated_at: new Date().toISOString() })
        .eq("id", conversationId);
    },
  });

  return result.toTextStreamResponse({
    headers: {
      "x-julia-sources": encodeURIComponent(JSON.stringify(citations)),
    },
  });
}
