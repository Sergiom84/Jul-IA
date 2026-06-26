import type { NextRequest } from "next/server";
import { updateSession } from "@/src/lib/supabase/middleware";

export async function proxy(request: NextRequest) {
  return updateSession(request);
}

export const config = {
  matcher: [
    // Todo excepto estáticos, imágenes, favicon, manifest y service worker.
    "/((?!_next/static|_next/image|favicon.ico|icon.svg|manifest.webmanifest|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
