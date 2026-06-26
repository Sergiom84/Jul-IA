import type { Metadata, Viewport } from "next";
import "./globals.css";
import ServiceWorkerRegister from "./sw-register";

export const metadata: Metadata = {
  title: "jul-IA · Asesor fiscal y laboral",
  description:
    "Asistente con IA para fiscalidad, laboral y gestoría. Sube tu documentación y consulta con respuestas citadas.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "jul-IA",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
  themeColor: "#0f6f5c",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <ServiceWorkerRegister />
      </body>
    </html>
  );
}
