import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "jul-IA · Asesor fiscal y laboral",
    short_name: "jul-IA",
    description:
      "Asistente con IA para fiscalidad, laboral y gestoría. Sube tu documentación y consulta con respuestas citadas.",
    start_url: "/chat",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#8364e0",
    lang: "es",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
