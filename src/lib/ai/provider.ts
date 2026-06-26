import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { LanguageModel } from "ai";

export type ChatProvider = "anthropic" | "openai";

export function getChatProvider(): ChatProvider {
  return process.env.CHAT_PROVIDER === "anthropic" ? "anthropic" : "openai";
}

/**
 * Modelo de chat según CHAT_PROVIDER (configurable por entorno).
 * Con `webSearch`, OpenAI usa la Responses API (requisito de su web search tool).
 */
export function getChatModel(opts?: { webSearch?: boolean }): LanguageModel {
  if (getChatProvider() === "anthropic") {
    return anthropic(process.env.ANTHROPIC_MODEL ?? "claude-sonnet-4-6");
  }
  const model = process.env.OPENAI_CHAT_MODEL ?? "gpt-4o";
  return opts?.webSearch ? openai.responses(model) : openai(model);
}
