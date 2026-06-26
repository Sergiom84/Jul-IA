"use client";

import { createBrowserClient } from "@supabase/ssr";
import {
  assertPublicConfig,
  supabasePublishableKey,
  supabaseUrl,
} from "./config";

let client: ReturnType<typeof createBrowserClient> | null = null;

/** Cliente Supabase para el navegador (singleton). */
export function getBrowserClient() {
  if (client) return client;
  assertPublicConfig();
  client = createBrowserClient(supabaseUrl, supabasePublishableKey);
  return client;
}
