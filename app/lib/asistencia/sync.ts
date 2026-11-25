// Envía a Odoo los registros hechos sin señal, en orden y de uno en uno.
//
// - Éxito (o `duplicate`: ya había llegado): se borra del celular.
// - Error de red: se detiene y se reintenta en el siguiente disparo.
// - Rechazo de Odoo (409/422/validación): queda `rejected` con el mensaje
//   para que el empleado lo vea y avise a RH. No se reintenta.

import { ApiError, apiFetch } from "./api";
import {
  listQueue,
  type QueuedPunch,
  removeQueued,
  updateQueued,
} from "./offline-queue";
import type { PunchResponse } from "./types";

export type SyncResult = {
  sent: PunchResponse[];
  rejected: QueuedPunch[];
  /** true si se detuvo por falta de red con registros aún pendientes. */
  networkError: boolean;
};

let running: Promise<SyncResult> | null = null;

export function syncQueue(employeeId: number): Promise<SyncResult> {
  // Un solo envío a la vez en esta pestaña; entre pestañas, Web Locks.
  if (running) return running;
  const task = async () => {
    const result: SyncResult = { sent: [], rejected: [], networkError: false };
    const items = (await listQueue()).filter(
      (p) => p.status === "pending" && p.employee_id === employeeId,
    );
    for (const item of items) {
      try {
        const res = await apiFetch<PunchResponse>("/punch", {
          body: {
            action: item.action,
            reason: item.reason ?? null,
            reason_note: item.reason_note ?? null,
            offline: true,
            client_uuid: item.uuid,
            client_time: item.client_time,
            device_time: item.device_time,
            clock_offset_s: Math.round(item.clock_offset_s),
            latitude: item.latitude,
            longitude: item.longitude,
            photo: item.photo,
          },
        });
        await removeQueued(item.uuid);
        result.sent.push(res);
      } catch (err) {
        if (
          err instanceof ApiError &&
          (err.status === 0 || err.status === 401 || err.status === 303)
        ) {
          // Sin red o sesión expirada: se conserva para el siguiente intento
          result.networkError = true;
          break;
        }
        const rejected: QueuedPunch = {
          ...item,
          status: "rejected",
          photo: null,
          error:
            err instanceof Error ? err.message : "Odoo rechazó el registro.",
        };
        await updateQueued(rejected);
        result.rejected.push(rejected);
      }
    }
    return result;
  };

  const locked = async (): Promise<SyncResult> => {
    if (typeof navigator === "undefined" || !navigator.locks) return task();
    let result: SyncResult = { sent: [], rejected: [], networkError: false };
    await navigator.locks.request(
      "asist-sync",
      { ifAvailable: true },
      async (lock) => {
        // Otra pestaña ya está enviando: no se hace nada aquí
        if (lock) result = await task();
      },
    );
    return result;
  };

  running = locked().finally(() => {
    running = null;
  });
  return running;
}
