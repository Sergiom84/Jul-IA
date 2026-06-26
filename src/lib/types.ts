export type Role = "user" | "assistant" | "system";

export type Citation = {
  source_id: string;
  title: string;
  type: SourceType;
};

export type Message = {
  id: string;
  conversation_id: string;
  role: Role;
  content: string;
  status: "complete" | "incomplete";
  citations: Citation[];
  created_at: string;
};

export type Conversation = {
  id: string;
  title: string | null;
  created_at: string;
  updated_at: string;
};

export type SourceType = "document" | "url" | "official_site";
export type SourceStatus = "uploaded" | "processing" | "ready" | "error";

export type Source = {
  id: string;
  type: SourceType;
  title: string | null;
  file_name: string | null;
  mime_type: string | null;
  url: string | null;
  status: SourceStatus;
  error: string | null;
  chunk_count: number;
  created_at: string;
};
