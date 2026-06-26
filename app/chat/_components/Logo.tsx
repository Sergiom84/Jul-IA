/**
 * Marca jul-IA (emblema balanza/ola). Imagen circular reutilizable para el
 * login, la cabecera lateral y el avatar de las respuestas de jul-IA.
 */
export default function Logo({
  size = 32,
  className,
}: {
  size?: number;
  className?: string;
}) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="jul-IA"
      width={size}
      height={size}
      className={className}
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        objectFit: "cover",
        background: "#fff",
        display: "block",
        flexShrink: 0,
      }}
    />
  );
}
