import { anthropic } from "@ai-sdk/anthropic";
import { openai } from "@ai-sdk/openai";
import type { ToolSet } from "ai";
import { getChatProvider } from "./provider";

/**
 * Devuelve el set de herramientas de búsqueda web NATIVAS del proveedor activo.
 * Las tools difieren entre proveedores, por eso se abstrae aquí y no solo el modelo.
 * Son "provider-executed": el propio proveedor ejecuta la búsqueda.
 */
export function getWebSearchTools(): ToolSet {
  if (getChatProvider() === "anthropic") {
    return {
      web_search: anthropic.tools.webSearch_20250305({ maxUses: 5 }),
    };
  }
  return {
    web_search: openai.tools.webSearch({}),
  };
}
