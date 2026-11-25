// Último estado conocido y desfase del reloj, para trabajar sin señal.
// localStorage puede fallar (modo privado): todo va en try/catch.

import type { HistoryRecord, Status } from "./types";

const STATUS_KEY = "asist_status_cache";
const OFFSET_KEY = "asist_clock_offset_ms";
const HISTORY_KEY = "asist_history_cache";

export type CachedStatus = { status: Status; receivedAt: number };

function read<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : null;
  } catch {
    return null;
  }
}

function write(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // sin espacio o almacenamiento bloqueado: se sigue sin caché
  }
}

export function loadCachedStatus() {
  return read<CachedStatus>(STATUS_KEY);
}

/** Guarda el estado y el desfase reloj de Odoo − reloj del celular. */
export function saveCachedStatus(status: Status, receivedAt: number) {
  write(STATUS_KEY, { status, receivedAt });
  const server = Date.parse(status.server_time);
  if (!Number.isNaN(server)) write(OFFSET_KEY, server - receivedAt);
}

/** Milisegundos a sumar al reloj del celular para obtener la hora de Odoo. */
export function clockOffsetMs() {
  return read<number>(OFFSET_KEY) ?? 0;
}

export function loadCachedHistory(days: number) {
  return (
    read<Record<string, HistoryRecord[]>>(HISTORY_KEY)?.[String(days)] ?? null
  );
}

export function saveCachedHistory(days: number, records: HistoryRecord[]) {
  write(HISTORY_KEY, {
    ...(read<Record<string, HistoryRecord[]>>(HISTORY_KEY) ?? {}),
    [days]: records,
  });
}

export function clearOfflineCache() {
  try {
    for (const key of [STATUS_KEY, OFFSET_KEY, HISTORY_KEY])
      localStorage.removeItem(key);
  } catch {
    // nada que limpiar
  }
}
