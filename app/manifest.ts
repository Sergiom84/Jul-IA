import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "jul-IA · Asesor fiscal y laboral",
    short_name: "jul-IA",
    description:
      "Asistente con IA para fiscalidad, laboral y gestoría. Sube tu documentación y consulta con respuestas citadas.",
    start_url: "/chat",
    display: "standalone",
    background_color: "#f6f7f9",
    theme_color: "#0f6f5c",
    lang: "es",
    icons: [
      {
        src: "/icon.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "any",
      },
      {
        src: "/icon-maskable.svg",
        sizes: "any",
        type: "image/svg+xml",
        purpose: "maskable",
      },
    ],
  };
}
