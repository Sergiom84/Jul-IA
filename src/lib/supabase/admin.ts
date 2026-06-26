import { createClient } from "@supabase/supabase-js";
import { assertSecretConfig, supabaseSecretKey, supabaseUrl } from "./config";

/**
 * Cliente con clave secreta (bypassa RLS). SOLO para servidor/worker:
 * subir/borrar en Storage, escribir source_chunks desde el worker, etc.
 * Nunca importar desde código de cliente.
 */
export function getAdminClient() {
  assertSecretConfig();
  return createClient(supabaseUrl, supabaseSecretKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}
