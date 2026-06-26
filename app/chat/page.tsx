import { redirect } from "next/navigation";
import { getServerClient, getUser } from "@/src/lib/supabase/server";
import { requireAuth } from "@/src/lib/supabase/config";
import type { Conversation } from "@/src/lib/types";
import ChatLayout from "./_components/ChatLayout";

export const dynamic = "force-dynamic";

export default async function ChatPage() {
  const user = await getUser();
  if (requireAuth && !user) redirect("/login");

  const supabase = await getServerClient();
  const { data } = await supabase
    .from("conversations")
    .select("id, title, created_at, updated_at")
    .order("updated_at", { ascending: false });

  return (
    <ChatLayout
      initialConversations={(data ?? []) as Conversation[]}
      userEmail={user?.email ?? null}
    />
  );
}
