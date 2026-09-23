import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

/**
 * Guard de sesión:
 *  - sin cookie `session_id` en una ruta protegida  -> redirige a `/`
 *  - con cookie en `/` (login)                      -> redirige a `/dashboard`
 */
const PROTECTED = ["/dashboard", "/solicitud", "/solicitudes", "/configuracion"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get("session_id")?.value);

  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (pathname === "/" && hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/dashboard";
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // todo menos assets estáticos y la API interna de Next
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
