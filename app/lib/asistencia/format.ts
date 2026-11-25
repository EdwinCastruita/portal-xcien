// Formato de fechas y horas. Odoo manda todo en UTC (ISO con "Z"); se
// muestra en la zona horaria del empleado (`employee.tz`), no la del celular.

const LOCALE = "es-MX";

function safeTz(tz?: string) {
  try {
    if (tz) new Intl.DateTimeFormat(LOCALE, { timeZone: tz });
    return tz;
  } catch {
    return undefined;
  }
}

export function formatTime(iso: string | null | undefined, tz?: string) {
  if (!iso) return null;
  return new Intl.DateTimeFormat(LOCALE, {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: safeTz(tz),
  }).format(new Date(iso));
}

/** "MARTES 17 DE NOVIEMBRE" */
export function formatLongDate(date: Date, tz?: string) {
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: safeTz(tz),
  })
    .format(date)
    .replace(",", "")
    .toUpperCase();
}

/** Clave de día (YYYY-MM-DD) en la zona del empleado, para agrupar. */
export function dayKey(iso: string, tz?: string) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: safeTz(tz),
  }).format(new Date(iso));
}

/** "Hoy", "Ayer" o "lun 16 nov" */
export function formatDayLabel(iso: string, tz?: string) {
  const key = dayKey(iso, tz);
  const now = new Date();
  if (key === dayKey(now.toISOString(), tz)) return "Hoy";
  if (key === dayKey(new Date(now.getTime() - 86_400_000).toISOString(), tz))
    return "Ayer";
  return new Intl.DateTimeFormat(LOCALE, {
    weekday: "short",
    day: "numeric",
    month: "short",
    timeZone: safeTz(tz),
  })
    .format(new Date(iso))
    .replace(/\./g, "")
    .replace(",", "")
    .replace(/^./, (c) => c.toUpperCase());
}

export function hourIn(tz?: string) {
  const h = new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    hour12: false,
    timeZone: safeTz(tz),
  }).format(new Date());
  return Number(h) % 24;
}

export function greeting(tz?: string) {
  const h = hourIn(tz);
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

/** 7.5 -> "7h 30m" */
export function formatHours(hours: number) {
  const totalMinutes = Math.max(0, Math.floor(hours * 60 + 1e-6));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  return `${h}h ${String(m).padStart(2, "0")}m`;
}

export function firstName(name: string) {
  return name.trim().split(/\s+/)[0] ?? name;
}

export function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    (parts[0]?.[0] ?? "?").toUpperCase() + (parts[1]?.[0] ?? "").toUpperCase()
  );
}

/** Odoo manda la imagen en base64 sin prefijo; deduce el tipo. */
export function imageDataUrl(b64: string | null | undefined) {
  if (!b64) return null;
  const mime = b64.startsWith("/9j/")
    ? "image/jpeg"
    : b64.startsWith("iVBOR")
      ? "image/png"
      : b64.startsWith("PHN2") || b64.startsWith("PD94")
        ? "image/svg+xml"
        : b64.startsWith("UklG")
          ? "image/webp"
          : "image/png";
  return `data:${mime};base64,${b64}`;
}

const ACTION_LABELS: Record<string, string> = {
  check_in: "Entrada",
  check_out: "Salida",
  break_start: "Salida temporal",
  break_end: "Regreso",
};

/** Nombre corto de una acción de registro ("Entrada", "Salida a comer", …). */
export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? "Registro";
}
