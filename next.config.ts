import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // pdfjs-dist y otros paquetes pesados solo se usan en el worker / server.
  serverExternalPackages: ["pdfjs-dist", "mammoth"],
};

export default nextConfig;
