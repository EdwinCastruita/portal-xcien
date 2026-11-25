"use client";

// Rol del usuario en el portal, según sus grupos de Odoo:
//  - "sales": tiene algún grupo de Ventas → Dashboard, Solicitudes y Asistencia.
//  - "staff": sin grupo de Ventas → solo el checador (/asistencia).
//
// Lo informa Odoo (`is_sales` en /login y /me) y se guarda en la cookie
// `portal_role` para que `proxy.ts` redirija desde el servidor. Es un control
// de navegación, no de seguridad: los datos siguen sujetos a los permisos
// de Odoo. Si la cookie falta (sesión previa o módulo sin actualizar), se
// trata como "sales" para no dejar fuera a nadie.

import { useEffect, useState } from "react";
import { getCookie } from "./api";

// Duplicado a propósito en `proxy.ts` (no puede importar este módulo).
export const ROLE_COOKIE = "portal_role";
const ROLE_EVENT = "portal-role-changed";

export type PortalRole = "sales" | "staff";

/** Rutas exclusivas de comerciales (mismo arreglo que `SALES_ONLY` en proxy.ts). */
export const SALES_ONLY = [
  "/dashboard",
  "/solicitud",
  "/solicitudes",
  "/configuracion",
];

export function isSalesPath(pathname: string) {
  return SALES_ONLY.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

/** Rol guardado, o null si aún no se conoce. */
export function getRole(): PortalRole | null {
  const v = getCookie(ROLE_COOKIE);
  return v === "sales" || v === "staff" ? v : null;
}

/** Guarda el rol a partir de `is_sales` de Odoo; ignora valores no booleanos. */
export function saveRole(isSales: unknown): PortalRole | null {
  if (typeof isSales !== "boolean") return null;
  const role: PortalRole = isSales ? "sales" : "staff";
  // biome-ignore lint/suspicious/noDocumentCookie: cookie leída por proxy.ts
  document.cookie = `${ROLE_COOKIE}=${role}; path=/`;
  window.dispatchEvent(new Event(ROLE_EVENT));
  return role;
}

export function homePath(role: PortalRole | null = getRole()) {
  return role === "staff" ? "/asistencia" : "/dashboard";
}

/** Rol actual en componentes cliente; null hasta montar o si no se conoce. */
export function useRole(): PortalRole | null {
  const [role, setRole] = useState<PortalRole | null>(null);
  useEffect(() => {
    const sync = () => setRole(getRole());
    sync();
    window.addEventListener(ROLE_EVENT, sync);
    return () => window.removeEventListener(ROLE_EVENT, sync);
  }, []);
  return role;
}
