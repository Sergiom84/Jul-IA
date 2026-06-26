"use client";

import { useRef, useState } from "react";
import { Loader2 } from "lucide-react";
import Avatar from "./Avatar";
import styles from "../chat.module.css";

/**
 * Botón de foto de perfil: al pulsar abre el selector de imagen, la sube a
 * Supabase Storage vía /api/avatar y notifica la nueva URL al padre.
 */
export default function AvatarUploader({
  avatarUrl,
  email,
  onChange,
}: {
  avatarUrl: string | null;
  email: string | null;
  onChange: (url: string) => void;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function upload(file: File) {
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("file", file);
      const res = await fetch("/api/avatar", { method: "POST", body: form });
      if (!res.ok) {
        setError((await res.text()) || "No se pudo subir la imagen");
        return;
      }
      const { avatarUrl: url } = (await res.json()) as { avatarUrl: string };
      onChange(url);
    } catch {
      setError("No se pudo subir la imagen");
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={inputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) upload(f);
          e.target.value = "";
        }}
      />
      <button
        type="button"
        className={styles.avatarBtn}
        onClick={() => inputRef.current?.click()}
        disabled={busy}
        title={error ?? "Cambiar foto de perfil"}
        aria-label="Cambiar foto de perfil"
      >
        <Avatar
          src={avatarUrl}
          email={email}
          size={32}
          className={styles.topAvatar}
        />
        {busy && (
          <span className={styles.avatarBusy}>
            <Loader2 size={16} className={styles.avatarSpin} />
          </span>
        )}
      </button>
    </>
  );
}
