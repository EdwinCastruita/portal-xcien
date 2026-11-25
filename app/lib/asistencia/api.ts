// Cliente para la API REST de `wispi_attendance` (`/api/attendance/*`).
//
// Usa la MISMA sesión del portal: el sid de la cookie `portal_sid` viaja como
// `_sid` y Odoo lo acepta porque ambos módulos comparten el `session_store`
// (ver `wispi_attendance/models/ir_http.py`). No hay login propio.
//
// Es un cliente aparte del `apiFetch` del portal porque la asistencia
// necesita distinguir errores que el portal no expone: `status` HTTP
// (409 `state_mismatch`, 403 `no_employee`), `code`, `data` y, sobre todo,
// `status 0` para "sin red", del que depende la cola sin conexión.
// Mismas reglas: same-origin por el rewrite de `next.config.ts`, sin
// cabeceras personalizadas y cuerpo `text/plain` (sin preflight CORS).

import { expirePortalSession, getCookie, SESSION_COOKIE } from "../api";

export const API_BASE = "/api/attendance";

export class ApiError extends Error {
  status: number;
  code?: string;
  validation: boolean;
  data: unknown;

  constructor(message: string, status: number, data?: Record<string, unknown>) {
    super(message);
    this.name = "ApiError";
    this.status = status;
    this.code = typeof data?.code === "string" ? data.code : undefined;
    this.validation = Boolean(data?.validation_error);
    this.data = data;
  }
}

type ApiOptions = {
  method?: "GET" | "POST";
  body?: unknown;
  signal?: AbortSignal;
  timeoutMs?: number;
};

export async function apiFetch<T>(
  path: string,
  { method = "POST", body, signal, timeoutMs = 45_000 }: ApiOptions = {},
): Promise<T> {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  const sid = getCookie(SESSION_COOKIE);
  if (sid) url.searchParams.set("_sid", sid);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  const forwardAbort = () => controller.abort();
  signal?.addEventListener("abort", forwardAbort, { once: true });

  let res: Response;
  try {
    res = await fetch(url.toString(), {
      method,
      headers: { "Content-Type": "text/plain;charset=UTF-8" },
      body: method === "POST" ? JSON.stringify(body ?? {}) : undefined,
      signal: controller.signal,
      credentials: "same-origin",
      cache: "no-store",
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") {
      throw new ApiError(
        "La solicitud tardó demasiado. Revisa tu conexión.",
        0,
      );
    }
    throw new ApiError("Sin conexión con el servidor. Revisa tu internet.", 0);
  } finally {
    clearTimeout(timer);
    signal?.removeEventListener("abort", forwardAbort);
  }

  if (res.status === 401 || res.status === 303) {
    expirePortalSession();
    throw new ApiError("Tu sesión expiró. Inicia sesión de nuevo.", res.status);
  }

  let data: Record<string, unknown> | null = null;
  try {
    data = await res.json();
  } catch {
    // Odoo responde HTML (login web) cuando la sesión ya no es válida
    if (res.ok) {
      expirePortalSession();
      throw new ApiError(
        "Tu sesión expiró. Inicia sesión de nuevo.",
        res.status,
      );
    }
  }

  if (!data)
    throw new ApiError(
      `Error de comunicación con Odoo (${res.status}).`,
      res.status,
    );
  if (!res.ok || data.success === false) {
    const message =
      typeof data.message === "string"
        ? data.message
        : "Operación rechazada por Odoo.";
    throw new ApiError(message, res.status, data);
  }
  return data as T;
}
