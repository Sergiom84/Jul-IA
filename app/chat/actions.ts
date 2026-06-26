"use server";

import { redirect } from "next/navigation";
import { getServerClient, getUser } from "@/src/lib/supabase/server";
import type { Conversation, Message } from "@/src/lib/types";

export async function createConversation(
  title?: string,
): Promise<Conversation> {
  const user = await getUser();
  if (!user) throw new Error("No autenticado");
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("conversations")
    .insert({ user_id: user.id, title: title ?? null })
    .select("id, title, created_at, updated_at")
    .single();
  if (error) throw new Error(error.message);
  return data as Conversation;
}

export async function renameConversation(id: string, title: string) {
  const supabase = await getServerClient();
  const { error } = await supabase
    .from("conversations")
    .update({ title })
    .eq("id", id);
  if (error) throw new Error(error.message);
}

export async function deleteConversation(id: string) {
  const supabase = await getServerClient();
  const { error } = await supabase.from("conversations").delete().eq("id", id);
  if (error) throw new Error(error.message);
}

export async function getMessages(conversationId: string): Promise<Message[]> {
  const supabase = await getServerClient();
  const { data, error } = await supabase
    .from("messages")
    .select("id, conversation_id, role, content, status, citations, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });
  if (error) throw new Error(error.message);
  return (data ?? []) as Message[];
}

export async function signOut() {
  const supabase = await getServerClient();
  await supabase.auth.signOut();
  redirect("/login");
}
