"use client";

import { useEffect } from "react";

/**
 * Registra `public/sw.js` para que la sección de asistencia abra sin señal.
 * Solo en producción: en desarrollo los chunks cambian a cada momento y la
 * caché estorbaría. Se monta dentro de `/asistencia` (con sesión) para que el
 * SW pueda guardar esas páginas.
 */
export function ServiceWorker() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      !("serviceWorker" in navigator)
    )
      return;
    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .catch(() => undefined);
  }, []);
  return null;
}
