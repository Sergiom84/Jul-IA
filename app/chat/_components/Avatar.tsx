"use client";

import { User } from "lucide-react";

/**
 * Foto de perfil del usuario. Si hay imagen la muestra recortada en círculo;
 * si no, cae a la inicial del email o a un icono genérico.
 */
export default function Avatar({
  src,
  email,
  size = 32,
  className,
}: {
  src?: string | null;
  email?: string | null;
  size?: number;
  className?: string;
}) {
  const initial = email?.trim()?.[0]?.toUpperCase();
  return (
    <span
      className={className}
      style={{ width: size, height: size, fontSize: Math.round(size * 0.42) }}
    >
      {src ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={src}
          alt="Foto de perfil"
          width={size}
          height={size}
          style={{
            width: "100%",
            height: "100%",
            objectFit: "cover",
            borderRadius: "inherit",
          }}
        />
      ) : initial ? (
        initial
      ) : (
        <User size={Math.round(size * 0.55)} />
      )}
    </span>
  );
}
