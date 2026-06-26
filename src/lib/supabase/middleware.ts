import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";
import {
  requireAuth,
  supabasePublishableKey,
  supabaseUrl,
} from "./config";

// Rutas accesibles sin sesión.
const PUBLIC_PATHS = ["/login", "/auth"];

/**
 * Refresca la sesión de Supabase en cada request y, si REQUIRE_AUTH,
 * redirige a /login cuando no hay usuario.
 */
export async function updateSession(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(supabaseUrl, supabasePublishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = NextResponse.next({ request });
        for (const { name, value, options } of cookiesToSet) {
          response.cookies.set(name, value, options);
        }
      },
    },
  });

  // IMPORTANTE: getUser() valida el token contra Supabase (no confía en cookie).
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = request.nextUrl;
  const isPublic = PUBLIC_PATHS.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  // Las rutas /api gestionan su propia auth (devuelven 401), no se redirigen.
  const isApi = pathname.startsWith("/api");

  if (requireAuth && !user && !isPublic && !isApi) {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  // Si ya hay sesión y entra a /login, lo mandamos al chat.
  if (user && pathname === "/login") {
    const url = request.nextUrl.clone();
    url.pathname = "/chat";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return response;
}
