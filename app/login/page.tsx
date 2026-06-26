"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Scale } from "lucide-react";
import { getBrowserClient } from "@/src/lib/supabase/browser";
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
  const next = params.get("next") || "/chat";

  const [mode, setMode] = useState<"signin" | "signup">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);
    const supabase = getBrowserClient();

    try {
      if (mode === "signin") {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        router.push(next);
        router.refresh();
      } else {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        if (data.session) {
          router.push(next);
          router.refresh();
        } else {
          setNotice(
            "Cuenta creada. Revisa tu correo para confirmar y luego inicia sesión.",
          );
          setMode("signin");
        }
      }
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
              <button onClick={() => setMode("signup")}>Regístrate</button>
            </>
          ) : (
            <>
              ¿Ya tienes cuenta?{" "}
              <button onClick={() => setMode("signin")}>Inicia sesión</button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
