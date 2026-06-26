"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Scale } from "lucide-react";
import { getBrowserClient } from "@/src/lib/supabase/browser";
import { sanitizeNextPath } from "@/src/lib/safe-path";
import { registerUser } from "./actions";
import styles from "./login.module.css";

export default function LoginPage() {
  return (
    <Suspense fallback={<div className={styles.wrap} />}>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const next = sanitizeNextPath(params.get("next"));

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function switchMode(next: "signin" | "signup") {
    setMode(next);
    setError(null);
    setNotice(null);
    setConfirmPassword("");
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);

    // Validación de confirmación de contraseña en registro.
    if (mode === "signup") {
      if (password !== confirmPassword) {
        setError("Las contraseñas no coinciden.");
        return;
      }
      if (password.length < 6) {
        setError("La contraseña debe tener al menos 6 caracteres.");
        return;
      }
    }

    setLoading(true);
    const supabase = getBrowserClient();

    try {
      if (mode === "signup") {
        // Registro auto-confirmado en servidor (no depende de email).
        const res = await registerUser(email, password);
        if (!res.ok) {
          setError(res.error);
          return;
        }
      }
      // En ambos casos terminamos iniciando sesión con email+contraseña.
      const { error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (error) throw error;
      router.push(next);
      router.refresh();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "No se pudo completar la acción.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.card}>
        <div className={styles.brand}>
          <span className={styles.logo}>
            <Scale size={22} />
          </span>
          <span className={styles.brandText}>
            <b>jul-IA</b>
            <span>Asesor fiscal y laboral</span>
          </span>
        </div>

        <h1 className={styles.title}>
          {mode === "signin" ? "Inicia sesión" : "Crea tu cuenta"}
        </h1>
        <p className={styles.subtitle}>
          Accede para consultar tu documentación de forma privada.
        </p>

        {error && <div className={styles.error}>{error}</div>}
        {notice && <div className={styles.notice}>{notice}</div>}

        <form onSubmit={handleSubmit}>
          <div className={styles.field}>
            <label className={styles.label} htmlFor="email">
              Correo electrónico
            </label>
            <input
              id="email"
              className="input"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="tu@correo.com"
            />
          </div>

          <div className={styles.field}>
            <label className={styles.label} htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              className="input"
              type="password"
              autoComplete={
                mode === "signin" ? "current-password" : "new-password"
              }
              required
              minLength={6}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {mode === "signup" && (
            <div className={styles.field}>
              <label className={styles.label} htmlFor="confirmPassword">
                Repite la contraseña
              </label>
              <input
                id="confirmPassword"
                className="input"
                type="password"
                autoComplete="new-password"
                required
                minLength={6}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
              />
            </div>
          )}

          <button
            type="submit"
            className={`btn btn-primary ${styles.submit}`}
            disabled={loading}
          >
            {loading
              ? "Un momento…"
              : mode === "signin"
                ? "Entrar"
                : "Crear cuenta"}
          </button>
        </form>

        <div className={styles.toggle}>
          {mode === "signin" ? (
            <>
              ¿No tienes cuenta?{" "}
              <button onClick={() => switchMode("signup")}>Regístrate</button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{" "}
              <button onClick={() => switchMode("signin")}>Inicia sesión</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
