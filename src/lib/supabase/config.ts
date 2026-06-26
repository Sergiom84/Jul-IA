// Configuración central de Supabase. Soporta el esquema nuevo de claves
// (publishable/secret) y el legacy (anon/service_role) como respaldo.

export const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL ?? process.env.SUPABASE_URL ?? "";

export const supabasePublishableKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ??
  "";

// Solo servidor / worker. Nunca debe llegar al cliente.
export const supabaseSecretKey =
  process.env.SUPABASE_SECRET_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

// Si es 'false' la app se abre sin login (no recomendado con datos sensibles).
export const requireAuth = process.env.REQUIRE_AUTH !== "false";

export const STORAGE_BUCKET = "julia-documents";
// Bucket público para las fotos de perfil (lectura pública, escritura server-side).
export const AVATAR_BUCKET = "julia-avatars";

export function assertPublicConfig() {
  if (!supabaseUrl || !supabasePublishableKey) {
    throw new Error(
      "Faltan NEXT_PUBLIC_SUPABASE_URL o NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
    );
  }
}

export function assertSecretConfig() {
  if (!supabaseUrl || !supabaseSecretKey) {
    throw new Error("Faltan SUPABASE_URL o SUPABASE_SECRET_KEY");
  }
}
