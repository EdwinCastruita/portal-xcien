// Limpieza de los datos de asistencia guardados en este navegador al cerrar
// sesión en el portal. Los registros sin conexión viven solo aquí: antes de
// borrarlos se intenta enviarlos y, si no se puede, se pide confirmación.

import { clearOfflineCache, loadCachedStatus } from "./offline-cache";
import { clearQueue, listQueue } from "./offline-queue";
import { syncQueue } from "./sync";

/**
 * Devuelve `false` si el usuario decide no cerrar sesión para no perder
 * registros pendientes. Si devuelve `true`, la cola y la caché ya se borraron.
 */
export async function clearAttendanceForLogout(): Promise<boolean> {
  try {
    const employeeId = loadCachedStatus()?.status.employee.id;
    const pendingFor = async () =>
      (await listQueue()).filter((p) => p.status === "pending");

    if (employeeId && navigator.onLine && (await pendingFor()).length) {
      await syncQueue(employeeId).catch(() => undefined);
    }
    const left = (await pendingFor()).length;
    if (
      left &&
      !window.confirm(
        `Tienes ${left} registro(s) de asistencia sin enviar a Odoo. Si cierras sesión se perderán. ¿Cerrar sesión de todos modos?`,
      )
    ) {
      return false;
    }
    await clearQueue().catch(() => undefined);
  } catch {
    // Sin IndexedDB: no hay nada que conservar
  }
  clearOfflineCache();
  return true;
}
