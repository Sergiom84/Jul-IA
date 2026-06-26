"use server";

import { getAdminClient } from "@/src/lib/supabase/admin";
import { isSignupAllowed } from "@/src/lib/signup-policy";

type Result = { ok: true } | { ok: false; error: string };

/**
 * Registro con auto-confirmación en servidor (no depende del email de Supabase).
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
  const allowed = isSignupAllowed(mail, {
    allowPublic: process.env.ALLOW_PUBLIC_SIGNUP === "true",
    allowlistCsv: process.env.SIGNUP_ALLOWLIST,
  });
  if (!allowed) {
    return {
      ok: false,
      error: "El registro no está abierto. Solicita acceso al administrador.",
    };
  }

  const admin = getAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: mail,
    password,
    email_confirm: true,
  });

  if (error) {
    // Log interno con el detalle; al cliente solo mensajes mapeados/genéricos.
    console.error("registerUser createUser error:", error.message);
    const msg = error.message.toLowerCase();
    if (
      msg.includes("already") ||
      msg.includes("registered") ||
      msg.includes("exists")
    ) {
      return { ok: false, error: "Este correo ya tiene cuenta. Inicia sesión." };
    }
    return {
      ok: false,
      error: "No se pudo crear la cuenta. Inténtalo de nuevo más tarde.",
    };
  }

  return { ok: true };
}
