// Política de registro (pura, testeable). Por defecto CERRADO: solo se permite el
// alta si el registro público está activado o el correo está en la allowlist.

export function isSignupAllowed(
  mail: string,
  opts: { allowPublic: boolean; allowlistCsv?: string },
): boolean {
  if (opts.allowPublic) return true;
  const allow = (opts.allowlistCsv ?? "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  return allow.includes(mail.trim().toLowerCase());
}
