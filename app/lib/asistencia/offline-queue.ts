// Cola local de registros hechos sin señal (IndexedDB).
//
// Cada registro guarda la hora, el GPS y la selfie del momento en que se
// marcó; `sync.ts` los manda a Odoo en orden cuando vuelve la conexión.
// La selfie se borra del celular en cuanto Odoo confirma el registro.

import type { PunchAction } from "./types";

export type QueuedPunch = {
  uuid: string;
  employee_id: number;
  action: PunchAction;
  /** Motivo de la salida temporal (solo break_start). */
  reason?: string | null;
  reason_note?: string | null;
  /** Hora del reloj del celular (ISO UTC), solo informativa. */
  device_time: string;
  /** Hora corregida con el último desfase conocido contra Odoo (ISO UTC). */
  client_time: string;
  clock_offset_s: number;
  latitude: number | null;
  longitude: number | null;
  photo: string | null;
  status: "pending" | "rejected";
  error?: string;
  created: number;
};

const DB_NAME = "wispi-asistencia";
const STORE = "punches";
const CHANGED_EVENT = "asist-queue-changed";

let dbPromise: Promise<IDBDatabase> | null = null;

function openDb(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(
        new Error("Este navegador no permite guardar registros sin conexión."),
      );
      return;
    }
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => {
      req.result.createObjectStore(STORE, { keyPath: "uuid" });
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () =>
      reject(
        req.error ?? new Error("No se pudo abrir el almacenamiento local."),
      );
  });
  dbPromise.catch(() => {
    dbPromise = null;
  });
  return dbPromise;
}

async function run<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await openDb();
  return new Promise((resolve, reject) => {
    const tx = db.transaction(STORE, mode);
    const req = fn(tx.objectStore(STORE));
    tx.oncomplete = () => resolve(req.result);
    tx.onerror = () =>
      reject(tx.error ?? new Error("Error del almacenamiento local."));
    tx.onabort = () =>
      reject(tx.error ?? new Error("Error del almacenamiento local."));
  });
}

function notifyChanged() {
  if (typeof window !== "undefined")
    window.dispatchEvent(new Event(CHANGED_EVENT));
}

export function onQueueChanged(listener: () => void) {
  window.addEventListener(CHANGED_EVENT, listener);
  return () => window.removeEventListener(CHANGED_EVENT, listener);
}

/** Registros en orden de creación. Si no hay IndexedDB devuelve []. */
export async function listQueue(): Promise<QueuedPunch[]> {
  try {
    const all = await run<QueuedPunch[]>(
      "readonly",
      (s) => s.getAll() as IDBRequest<QueuedPunch[]>,
    );
    return all.sort((a, b) => a.created - b.created);
  } catch {
    return [];
  }
}

export async function addToQueue(punch: QueuedPunch) {
  await run("readwrite", (s) => s.put(punch));
  notifyChanged();
}

export async function updateQueued(punch: QueuedPunch) {
  await run("readwrite", (s) => s.put(punch));
  notifyChanged();
}

export async function removeQueued(uuid: string) {
  await run("readwrite", (s) => s.delete(uuid));
  notifyChanged();
}

export async function clearQueue() {
  try {
    await run("readwrite", (s) => s.clear());
  } finally {
    notifyChanged();
  }
}

export function newUuid(): string {
  if (typeof crypto.randomUUID === "function") return crypto.randomUUID();
  // Respaldo para contextos no seguros (http en red local)
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  bytes[6] = (bytes[6] & 0x0f) | 0x40;
  bytes[8] = (bytes[8] & 0x3f) | 0x80;
  const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join(
    "",
  );
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}
