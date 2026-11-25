"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import type { NoticeData } from "../../components/asistencia/Notice";
import { ApiError, apiFetch } from "./api";
import {
  type CachedStatus,
  clearOfflineCache,
  loadCachedStatus,
  saveCachedStatus,
} from "./offline-cache";
import {
  listQueue,
  onQueueChanged,
  type QueuedPunch,
  removeQueued,
} from "./offline-queue";
import { syncQueue } from "./sync";
import type { Status } from "./types";

const RETRY_MS = 30_000;

type StatusContextValue = {
  /** Estado de Odoo con los registros pendientes aplicados encima. */
  status: Status | null;
  /** Desde cuándo (ms) sumar tiempo en vivo al contador de horas; null si no hay turno abierto. */
  liveSince: number | null;
  online: boolean;
  /** Registros guardados en el celular que faltan por enviar. */
  pending: QueuedPunch[];
  /** Registros que Odoo rechazó al sincronizar. */
  rejected: QueuedPunch[];
  syncing: boolean;
  syncNotice: NoticeData | null;
  error: string;
  /** Código del último error de Odoo (p. ej. `no_employee`). */
  errorCode: string;
  refresh: () => Promise<void>;
  setStatus: (status: Status) => void;
  markOffline: () => void;
  syncNow: () => Promise<void>;
  clearSyncNotice: () => void;
  dismissRejected: (uuid: string) => Promise<void>;
};

const StatusContext = createContext<StatusContextValue | null>(null);

/** Aplica los registros pendientes (en orden) sobre el último estado de Odoo. */
function applyPending(base: CachedStatus, items: QueuedPunch[]) {
  let s: Status = { ...base.status, today: { ...base.status.today } };
  let liveSince: number | null =
    s.attendance_state === "checked_in" || s.next_action === "check_out"
      ? base.receivedAt
      : null;
  for (const p of items) {
    const t = Date.parse(p.client_time);
    if (p.action === "check_in" || p.action === "break_end") {
      s = {
        ...s,
        attendance_state: "checked_in",
        next_action: "check_out",
        allowed_actions: ["check_out", "break_start"],
        break_since: null,
        break_reason: null,
        break_reason_label: null,
        check_in: p.client_time,
        today: {
          ...s.today,
          first_check_in: s.today.first_check_in ?? p.client_time,
          last_check_out: null,
          records: s.today.records + 1,
        },
      };
      liveSince = t;
    } else {
      const add = liveSince ? Math.max(0, t - liveSince) / 3_600_000 : 0;
      const onBreak = p.action === "break_start";
      s = {
        ...s,
        // En comida el tiempo no corre hasta registrar el regreso
        attendance_state: onBreak ? "on_break" : "checked_out",
        next_action: onBreak ? "break_end" : "check_in",
        allowed_actions: onBreak ? ["break_end"] : ["check_in"],
        break_since: onBreak ? p.client_time : null,
        break_reason: onBreak ? (p.reason ?? null) : null,
        break_reason_label: null,
        check_in: null,
        last_check_out: p.client_time,
        worked_hours_today: s.worked_hours_today + add,
        today: { ...s.today, last_check_out: p.client_time },
      };
      liveSince = null;
    }
  }
  return { status: s, liveSince };
}

export function StatusProvider({ children }: { children: React.ReactNode }) {
  const [base, setBase] = useState<CachedStatus | null>(null);
  const [queue, setQueue] = useState<QueuedPunch[]>([]);
  const [error, setError] = useState("");
  const [errorCode, setErrorCode] = useState("");
  const [navOnline, setNavOnline] = useState(true);
  const [netDown, setNetDown] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [syncNotice, setSyncNotice] = useState<NoticeData | null>(null);

  const employeeId = base?.status.employee.id;
  const pending = useMemo(
    () =>
      queue.filter(
        (p) => p.status === "pending" && p.employee_id === employeeId,
      ),
    [queue, employeeId],
  );
  const rejected = useMemo(
    () =>
      queue.filter(
        (p) => p.status === "rejected" && p.employee_id === employeeId,
      ),
    [queue, employeeId],
  );
  const pendingRef = useRef(pending);
  pendingRef.current = pending;
  const baseRef = useRef(base);
  baseRef.current = base;

  const setStatus = useCallback((next: Status) => {
    const receivedAt = Date.now();
    saveCachedStatus(next, receivedAt);
    setBase({ status: next, receivedAt });
    setNetDown(false);
    setError("");
    setErrorCode("");
  }, []);

  const markOffline = useCallback(() => setNetDown(true), []);

  const syncNow = useCallback(async () => {
    const current = baseRef.current;
    if (!current || pendingRef.current.length === 0) return;
    setSyncing(true);
    try {
      const result = await syncQueue(current.status.employee.id);
      if (result.networkError) setNetDown(true);
      const last = result.sent.at(-1);
      if (last) {
        setStatus(last);
        // Actualiza horas del día y estado con lo que quedó en Odoo
        apiFetch<Status>("/status")
          .then(setStatus)
          .catch(() => undefined);
      }
      if (result.rejected.length) {
        setSyncNotice({
          type: "danger",
          sticky: true,
          title: `${result.rejected.length} registro(s) sin conexión no se aceptaron`,
          message: result.rejected[0].error,
        });
      } else if (result.sent.length) {
        const warning = result.sent
          .map((r) => r.feedback)
          .find((f) => f && f.type !== "success");
        setSyncNotice({
          type: warning ? warning.type : "success",
          sticky: Boolean(warning),
          title: `${result.sent.length} registro(s) enviados a Odoo`,
          message: warning
            ? `${warning.title}. ${warning.message}`
            : "Tus registros sin conexión ya están en Odoo.",
        });
      }
    } finally {
      setSyncing(false);
    }
  }, [setStatus]);

  const refresh = useCallback(async () => {
    try {
      setStatus(await apiFetch<Status>("/status"));
      if (pendingRef.current.length) await syncNow();
    } catch (err) {
      if (err instanceof ApiError && err.status === 0) {
        setNetDown(true);
        if (!baseRef.current) {
          setError(
            "Sin conexión. Abre la app con señal al menos una vez para poder registrar sin ella.",
          );
        }
        return;
      }
      if (err instanceof ApiError && err.code === "no_employee") {
        // El usuario del portal no tiene empleado: no se muestra el estado
        // que haya quedado en caché de otro usuario en este navegador.
        clearOfflineCache();
        setBase(null);
      }
      setErrorCode(err instanceof ApiError ? (err.code ?? "") : "");
      setError(
        err instanceof Error
          ? err.message
          : "No se pudo cargar tu información.",
      );
    }
  }, [setStatus, syncNow]);

  const reloadQueue = useCallback(async () => setQueue(await listQueue()), []);

  const dismissRejected = useCallback(async (uuid: string) => {
    await removeQueued(uuid);
  }, []);

  // Arranque: pinta el último estado guardado y luego pregunta a Odoo
  useEffect(() => {
    const cached = loadCachedStatus();
    if (cached) setBase(cached);
    setNavOnline(navigator.onLine);
    reloadQueue().then(refresh);

    const offQueue = onQueueChanged(reloadQueue);
    const onOnline = () => {
      setNavOnline(true);
      refresh();
    };
    const onOffline = () => setNavOnline(false);
    const onVisible = () => document.visibilityState === "visible" && refresh();
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      offQueue();
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh, reloadQueue]);

  // Reintento periódico mientras haya pendientes o no haya red
  const shouldRetry = pending.length > 0 || netDown;
  useEffect(() => {
    if (!shouldRetry) return;
    const t = setInterval(() => {
      if (navigator.onLine) refresh();
    }, RETRY_MS);
    return () => clearInterval(t);
  }, [shouldRetry, refresh]);

  const effective = useMemo(
    () => (base ? applyPending(base, pending) : null),
    [base, pending],
  );

  const value = useMemo<StatusContextValue>(
    () => ({
      status: effective?.status ?? null,
      liveSince: effective?.liveSince ?? null,
      online: navOnline && !netDown,
      pending,
      rejected,
      syncing,
      syncNotice,
      error,
      errorCode,
      refresh,
      setStatus,
      markOffline,
      syncNow,
      clearSyncNotice: () => setSyncNotice(null),
      dismissRejected,
    }),
    [
      effective,
      navOnline,
      netDown,
      pending,
      rejected,
      syncing,
      syncNotice,
      error,
      errorCode,
      refresh,
      setStatus,
      markOffline,
      syncNow,
      dismissRejected,
    ],
  );
  return (
    <StatusContext.Provider value={value}>{children}</StatusContext.Provider>
  );
}

export function useStatus() {
  const ctx = useContext(StatusContext);
  if (!ctx) throw new Error("useStatus debe usarse dentro de <StatusProvider>");
  return ctx;
}
