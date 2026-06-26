import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";
import {
  assertPublicConfig,
  supabasePublishableKey,
  supabaseUrl,
} from "./config";

/**
 * Cliente Supabase para Server Components / Route Handlers / Server Actions.
 * Ligado a la sesión del usuario vía cookies (RLS aplica con su JWT).
 */
export async function getServerClient() {
  assertPublicConfig();
  const cookieStore = await cookies();

  return createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Llamado desde un Server Component sin respuesta mutable: lo ignora.
          // El middleware se encarga de refrescar la sesión.
        }
      },
    },
  });
}

/** Devuelve el usuario autenticado validado en el servidor, o null. */
export async function getUser() {
  const supabase = await getServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
