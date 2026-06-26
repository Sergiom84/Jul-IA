"use client";

import { useEffect, useState } from "react";
import { Palette } from "lucide-react";

type Theme = "default" | "aurora";

/**
 * Alterna entre el tema sobrio (verde/gris/blanco) y "Aurora Glass" (lila).
 * El tema vive en data-theme de <html> y se persiste en localStorage; el
 * script en layout lo aplica antes del primer pintado.
 */
export default function ThemeToggle({ className }: { className?: string }) {
  const [theme, setTheme] = useState<Theme>("default");

  useEffect(() => {
    const current = document.documentElement.dataset.theme as Theme | undefined;
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (current) setTheme(current);
  }, []);

  function toggle() {
    const next: Theme = theme === "aurora" ? "default" : "aurora";
    document.documentElement.dataset.theme = next;
    localStorage.setItem("julia-theme", next);
    setTheme(next);
  }

  return (
    <button
      type="button"
      className={className}
      onClick={toggle}
      aria-pressed={theme === "aurora"}
      title={
        theme === "aurora"
          ? "Tema Aurora (lila) activo — cambiar al sobrio"
          : "Cambiar al tema Aurora (lila)"
      }
      aria-label="Cambiar tema"
    >
      <Palette size={18} />
    </button>
  );
}
