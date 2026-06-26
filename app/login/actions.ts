"use server";

import { getAdminClient } from "@/src/lib/supabase/admin";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Registro con auto-confirmación en servidor: crea el usuario ya confirmado
 * (no depende del envío de email de Supabase, poco fiable sin SMTP propio).
 * Tras esto, el cliente inicia sesión con email+contraseña.
 */
export async function registerUser(
  email: string,
  password: string,
): Promise<Result> {
  const mail = email.trim().toLowerCase();
  if (!mail || !mail.includes("@")) {
    return { ok: false, error: "Correo no válido." };
  }
  if (password.length < 6) {
    return { ok: false, error: "La contraseña debe tener al menos 6 caracteres." };
  }

  const admin = getAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: mail,
    password,
    email_confirm: true,
  });

  if (error) {
    const msg = error.message.toLowerCase();
    if (msg.includes("already") || msg.includes("registered") || msg.includes("exists")) {
      return {
        ok: false,
        error: "Este correo ya tiene cuenta. Inicia sesión.",
      };
    }
    return { ok: false, error: error.message };
  }

  return { ok: true };
}
