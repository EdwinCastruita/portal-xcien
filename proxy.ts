import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

// Debe coincidir con `SESSION_COOKIE` de `app/lib/api.ts`. No se importa
// directamente porque ese módulo no es válido en el runtime de middleware.
const SESSION_COOKIE = "portal_sid";
// Rol del usuario (`app/lib/role.ts`): "staff" = sin grupo de Ventas en Odoo.
const ROLE_COOKIE = "portal_role";

/**
 * Guard de sesión:
 *  - sin cookie `portal_sid` en una ruta protegida  -> redirige a `/`
 *  - con cookie en `/` (login)                      -> redirige al inicio del rol
 *  - rol "staff" (sin grupo de Ventas) en ruta de ventas -> redirige a `/asistencia`
 */
const PROTECTED = [
  "/dashboard",
  "/solicitud",
  "/solicitudes",
  "/configuracion",
  "/asistencia",
];

// Solo comerciales; quien es "staff" se manda al checador.
// Mismo arreglo que `SALES_ONLY` en `app/lib/role.ts`.
const SALES_ONLY = ["/dashboard", "/solicitud", "/solicitudes", "/configuracion"];

export function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const hasSession = Boolean(req.cookies.get(SESSION_COOKIE)?.value);
  const isStaff = req.cookies.get(ROLE_COOKIE)?.value === "staff";
  const home = isStaff ? "/asistencia" : "/dashboard";

  const isProtected = PROTECTED.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );

  if (isProtected && !hasSession) {
    const url = req.nextUrl.clone();
    url.pathname = "/";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  const isSalesOnly = SALES_ONLY.some(
    (p) => pathname === p || pathname.startsWith(`${p}/`),
  );
  if (hasSession && (pathname === "/" || (isStaff && isSalesOnly))) {
    const url = req.nextUrl.clone();
    url.pathname = home;
    url.search = "";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  // todo menos assets estáticos y la API interna de Next
  matcher: ["/((?!api/portal|api/attendance|web/image|sw\\.js|manifest\\.webmanifest|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
