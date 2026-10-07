// Cliente único para la API REST del módulo Odoo `wispi_portal_api`.
// Reemplaza al middleware FastAPI `portal-backend`: el frontend habla
// directamente con Odoo (`/api/portal/*`).
//
// Para evitar el preflight CORS (y sus problemas con Odoo) NO se usan
// cabeceras personalizadas: la sesión y la compañía van como query params
// `_sid` / `_cid`, y el cuerpo se manda como `text/plain` para que la
// petición sea "simple" y no dispare preflight.

export const API_BASE = "/api/portal";

// Nombre de la cookie propia del frontend que guarda el sid de sesión de
// Odoo (para reenviarlo como `_sid` en cada request, ver más abajo).
//
// IMPORTANTE: NO puede llamarse "session_id". Ese es el nombre que Odoo usa
// para su propia cookie de sesión (HttpOnly), y como el rewrite de
// `next.config.ts` hace que las respuestas de Odoo lleguen al navegador como
// same-origin, esa cookie HttpOnly termina compartiendo dominio+path con
// cualquier cookie que el frontend intente escribir con el mismo nombre.
// Por spec (RFC 6265), JS no puede sobrescribir ni borrar una cookie
// HttpOnly existente — el intento simplemente se ignora en silencio. Eso
// rompía el logout: `document.cookie = "session_id=; expires=..."` nunca
// lograba borrar la cookie real de Odoo, así que el guard de sesión seguía
// viéndola "presente" y rebotaba al usuario de vuelta al dashboard.
export const SESSION_COOKIE = "portal_sid";

export function getCookie(name: string): string {
  if (typeof document === "undefined") return "";
  const match = document.cookie.match(
    new RegExp(
      "(?:^|; )" + name.replace(/([.$?*|{}()[\]\\/+^])/g, "\\$1") + "=([^;]*)",
    ),
  );
  return match ? decodeURIComponent(match[1]) : "";
}

export class ApiError extends Error {
  validation: boolean;
  constructor(message: string, validation = false) {
    super(message);
    this.name = "ApiError";
    this.validation = validation;
  }
}

function expirePortalSession() {
  if (typeof document === "undefined") return;
  document.cookie = `${SESSION_COOKIE}=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT`;
  if (window.location.pathname !== "/") window.location.assign("/?expired=1");
}

type ApiOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  /** Adjunta la compañía activa (`_cid`) desde la cookie `company_id`. */
  company?: boolean;
  signal?: AbortSignal;
};

/**
 * Llama a `${API_BASE}${path}` y devuelve el JSON ya validado.
 * Lanza `ApiError` cuando la respuesta trae `{success:false}`.
 */
export async function apiFetch<T = any>(
  path: string,
  { method = "GET", body, company = false, signal }: ApiOptions = {},
): Promise<T> {
  // Añade _sid / _cid como query params (sin cabeceras => sin preflight).
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  const session = getCookie(SESSION_COOKIE);
  if (session) url.searchParams.set("_sid", session);
  if (company) {
    const cid = getCookie("company_id");
    if (cid) url.searchParams.set("_cid", cid);
  }

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 60_000);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener("abort", forwardAbort, { once: true });
  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      // text/plain => "simple request", el navegador no hace preflight.
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      signal: controller.signal,
      body:
        body !== undefined
          ? JSON.stringify(body)
          : method === "POST"
            ? "{}"
            : undefined,
    });
  } catch (error: any) {
    if (error?.name === "AbortError") throw new ApiError("La solicitud tardó demasiado o fue cancelada.");
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener("abort", forwardAbort);
  }

  if (res.status === 401 || res.status === 303) {
    expirePortalSession();
    throw new ApiError("Tu sesión expiró. Inicia sesión de nuevo.");
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    if (res.ok) {
      expirePortalSession();
      throw new ApiError("La sesión expiró o el servidor devolvió una respuesta inválida.");
    }
  }

  if (!res.ok && !data) {
    throw new ApiError(`Error de comunicación con Odoo (${res.status})`);
  }
  if (data && data.success === false) {
    throw new ApiError(
      data.message || data.detail || "Operación rechazada por Odoo",
      Boolean(data.validation_error),
    );
  }
  return data as T;
}
