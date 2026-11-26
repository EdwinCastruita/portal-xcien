"use client";

import {
  ClipboardList,
  CloudOff,
  CloudUpload,
  DoorOpen,
  Loader2,
  LogIn,
  LogOut,
  MapPin,
  UserX,
  Utensils,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Notice, type NoticeData } from "@/app/components/asistencia/Notice";
import {
  ReasonSheet,
  reasonLabel,
} from "@/app/components/asistencia/ReasonSheet";
import { SelfieCamera } from "@/app/components/asistencia/SelfieCamera";
import { ApiError, apiFetch } from "@/app/lib/asistencia/api";
import { type Coords, getPosition } from "@/app/lib/asistencia/device";
import {
  actionLabel,
  firstName,
  formatHours,
  formatLongDate,
  formatTime,
  greeting,
} from "@/app/lib/asistencia/format";
import { clockOffsetMs } from "@/app/lib/asistencia/offline-cache";
import { addToQueue, newUuid } from "@/app/lib/asistencia/offline-queue";
import { useStatus } from "@/app/lib/asistencia/status-context";
import type {
  AttendanceState,
  PunchAction,
  PunchResponse,
  Status,
} from "@/app/lib/asistencia/types";

type Step = "idle" | "reason" | "camera" | "locating" | "sending";

/** Lo que se va a registrar: la acción y, en la salida, su motivo. */
type Intent = {
  action: PunchAction;
  reason?: string | null;
  reason_note?: string | null;
};

const DONE_LABELS: Record<PunchAction, string> = {
  check_in: "Entrada registrada",
  check_out: "Salida registrada",
  break_start: "Salida registrada",
  break_end: "Regreso registrado",
};

/** Las salidas temporales y el regreso solo piden ubicación, no selfie. */
const needsSelfie = (action: PunchAction) =>
  action === "check_in" || action === "check_out";

/**
 * UI de checada (entrada/salida, comer, salida temporal, avisos y resumen).
 * Se usa en `/asistencia` y, en versión `compact`, en el modal de la barra
 * superior (`QuickCheckIn`). Requiere estar dentro de `<StatusProvider>`.
 */
export function CheckPanel({ compact = false }: { compact?: boolean }) {
  const {
    status,
    liveSince,
    online,
    pending,
    rejected,
    syncing,
    syncNotice,
    clearSyncNotice,
    dismissRejected,
    syncNow,
    error,
    errorCode,
    refresh,
    setStatus,
    markOffline,
  } = useStatus();
  const [now, setNow] = useState(() => Date.now());
  const [step, setStep] = useState<Step>("idle");
  const [notice, setNotice] = useState<NoticeData | null>(null);
  // La ubicación se pide al pulsar el botón, en paralelo con la selfie
  const positionRef = useRef<Promise<Coords | null> | null>(null);
  // Registro en curso mientras se toma la selfie
  const intentRef = useRef<Intent | null>(null);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 15_000);
    return () => clearInterval(t);
  }, []);

  const tz = status?.employee.tz;
  const state: AttendanceState =
    status?.attendance_state ??
    (status?.next_action === "check_out" ? "checked_in" : "checked_out");
  const checkedIn = state === "checked_in";
  const onBreak = state === "on_break";
  const onLunch = onBreak && status?.break_reason === "lunch";
  const mainAction: PunchAction = checkedIn
    ? "check_out"
    : onBreak
      ? "break_end"
      : "check_in";
  const busy = step !== "idle";

  // Horas en vivo: lo que dijo Odoo (más los pendientes) + lo transcurrido en el turno abierto
  const workedHours = status
    ? status.worked_hours_today +
      (liveSince ? Math.max(0, now - liveSince) / 3_600_000 : 0)
    : 0;

  /** Guarda el registro en el celular para mandarlo cuando vuelva la señal. */
  const enqueue = useCallback(
    async (
      intent: Intent,
      uuid: string,
      photo: string | null,
      coords: Coords | null,
      deviceNow: number,
    ) => {
      if (!status) return;
      const offset = clockOffsetMs();
      const clientTime = new Date(deviceNow + offset).toISOString();
      await addToQueue({
        uuid,
        employee_id: status.employee.id,
        action: intent.action,
        reason: intent.reason ?? null,
        reason_note: intent.reason_note ?? null,
        device_time: new Date(deviceNow).toISOString(),
        client_time: clientTime,
        clock_offset_s: offset / 1000,
        latitude: coords?.latitude ?? null,
        longitude: coords?.longitude ?? null,
        photo,
        status: "pending",
        created: deviceNow,
      });
      setNotice({
        type: "info",
        sticky: true,
        title: `${actionLabel(intent.action)} sin conexión · ${formatTime(clientTime, status.employee.tz)}`,
        message:
          "Se enviará a Odoo en cuanto recuperes señal. Abre la app cuando tengas datos y no cierres sesión.",
      });
    },
    [status],
  );

  const send = useCallback(
    async (photo: string | null, intent: Intent) => {
      if (!status) return;
      // La hora del registro es la del momento en que se pulsó / tomó la selfie
      const deviceNow = Date.now();
      const uuid = newUuid();
      setStep("locating");
      const coords = await (positionRef.current ?? Promise.resolve(null));
      try {
        // Sin red, o con registros anteriores aún por enviar (hay que respetar el orden)
        if (!online || !navigator.onLine || pending.length > 0) {
          await enqueue(intent, uuid, photo, coords, deviceNow);
          if (online && navigator.onLine) syncNow();
          return;
        }
        setStep("sending");
        try {
          const res = await apiFetch<PunchResponse>("/punch", {
            body: {
              action: intent.action,
              reason: intent.reason ?? null,
              reason_note: intent.reason_note ?? null,
              client_uuid: uuid,
              latitude: coords?.latitude ?? null,
              longitude: coords?.longitude ?? null,
              photo,
            },
            timeoutMs: 20_000,
          });
          setStatus(res);
          const hour = formatTime(res.time, res.employee.tz);
          const label = DONE_LABELS[res.action_done] ?? "Registro guardado";
          setNotice(
            res.feedback
              ? {
                  ...res.feedback,
                  title: `${label} · ${hour}`,
                  message: `${res.feedback.title}. ${res.feedback.message}`,
                  sticky: res.feedback.type !== "success",
                }
              : { type: "success", title: `${label} · ${hour}` },
          );
        } catch (err) {
          if (err instanceof ApiError && err.status === 0) {
            // Se cayó la señal: se guarda con el mismo uuid. Si Odoo sí lo
            // alcanzó a recibir, al sincronizar responde con el existente.
            markOffline();
            await enqueue(intent, uuid, photo, coords, deviceNow);
          } else if (err instanceof ApiError && err.code === "state_mismatch") {
            // Ya se había registrado (doble toque u otro dispositivo): se refresca la pantalla
            setStatus(err.data as Status);
            setNotice({
              type: "info",
              title: "Tu registro ya estaba actualizado",
              message: err.message,
            });
          } else {
            throw err;
          }
        }
      } catch (err) {
        setNotice({
          type: "danger",
          title: "No se registró",
          message: err instanceof Error ? err.message : "Inténtalo de nuevo.",
          sticky: true,
        });
      } finally {
        positionRef.current = null;
        intentRef.current = null;
        setStep("idle");
      }
    },
    [status, online, pending.length, enqueue, syncNow, setStatus, markOffline],
  );

  /** Pide el GPS y, si la acción la lleva, la selfie; luego envía. */
  const begin = (intent: Intent) => {
    if (!status) return;
    setNotice(null);
    positionRef.current = status.gps_required
      ? getPosition()
      : Promise.resolve(null);
    if (status.require_selfie && needsSelfie(intent.action)) {
      intentRef.current = intent;
      setStep("camera");
    } else send(null, intent);
  };

  const onMain = () => {
    if (!status || busy) return;
    begin({ action: mainAction });
  };

  const onLunchStart = () => {
    if (!status || busy || !checkedIn) return;
    begin({ action: "break_start", reason: "lunch" });
  };

  /** Salida temporal (tienda, personal, …): primero el motivo. */
  const onExitStart = () => {
    if (!status || busy || !checkedIn) return;
    setNotice(null);
    setStep("reason");
  };

  const confirmReason = (reason: string, note: string | null) =>
    begin({ action: "break_start", reason, reason_note: note });

  const cancelCamera = useCallback(() => {
    positionRef.current = null;
    intentRef.current = null;
    setStep("idle");
  }, []);

  const closeNotice = useCallback(() => setNotice(null), []);

  if (errorCode === "no_employee") {
    return (
      <div className="mx-auto flex max-w-md flex-col items-center gap-4 py-16 text-center">
        <span className="flex size-14 items-center justify-center rounded-full border border-warning/30 bg-warning/10 text-warning">
          <UserX className="size-6" />
        </span>
        <h1 className="font-extrabold text-[22px] text-base-content">
          Tu usuario no tiene empleado vinculado
        </h1>
        <p className="text-sm text-base-content/60">
          Para registrar asistencia, Recursos Humanos debe ligar tu usuario de
          Odoo a una ficha de empleado.
        </p>
        <button
          type="button"
          onClick={refresh}
          className="btn-cta-secondary rounded-xl px-5 text-[12px]"
        >
          Reintentar
        </button>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="flex min-h-[50dvh] flex-col items-center justify-center gap-4 px-6 text-center">
        {error ? (
          <>
            <p className="text-sm text-base-content/75">{error}</p>
            <button
              type="button"
              onClick={refresh}
              className="rounded-xl border border-base-content/10 px-4 py-2 font-bold text-[12px] text-primary uppercase tracking-[0.14em]"
            >
              Reintentar
            </button>
          </>
        ) : (
          <Loader2 className="size-6 animate-spin text-base-content/50" />
        )}
      </div>
    );
  }

  const pendingReview = status.pending_review ?? 0;
  const entrada = formatTime(status.today.first_check_in, tz);
  const salida = formatTime(status.today.last_check_out, tz);
  const busyLabel =
    step === "locating"
      ? "Ubicando…"
      : step === "sending"
        ? "Registrando…"
        : null;

  return (
    <>
      <section
        className={
          compact
            ? "relative flex w-full flex-col"
            : "relative mx-auto flex w-full max-w-3xl flex-1 flex-col pb-6 xl:max-w-6xl"
        }
      >
        <p className="eyebrow">{formatLongDate(new Date(now), tz)}</p>
        <h1
          className={
            compact
              ? "mt-1 pr-10 font-extrabold text-[22px] text-base-content leading-tight tracking-tight"
              : "mt-1.5 font-extrabold text-[28px] text-base-content leading-tight tracking-tight md:text-[36px] xl:text-[40px]"
          }
        >
          {greeting(tz)}, {firstName(status.employee.name)}
        </h1>

        <div
          className={
            compact
              ? ""
              : "xl:mt-10 xl:grid xl:grid-cols-2 xl:items-center xl:gap-14"
          }
        >
          {/* Columna del botón */}
          <div
            className={`flex flex-col items-center rounded-[28px] border border-base-content/10 bg-base-200/40 ${
              compact
                ? "mt-4 px-4 py-6"
                : "mt-6 px-4 py-8 md:px-8 md:py-10 xl:mt-0"
            }`}
          >
            <div className="flex justify-center">
              <span
                className={`inline-flex items-center gap-2 rounded-full border px-4 py-1.5 font-bold text-[12px] uppercase tracking-[0.1em] ${
                  checkedIn
                    ? "border-success/30 bg-success/10 text-success"
                    : onBreak
                      ? "border-warning/30 bg-warning/10 text-warning"
                      : "border-base-content/10 bg-base-200 text-base-content/75"
                }`}
              >
                <span className="relative flex size-2">
                  {checkedIn && (
                    <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-70" />
                  )}
                  <span
                    className={`relative size-2 rounded-full ${checkedIn ? "bg-success" : onBreak ? "bg-warning" : "bg-base-content/30"}`}
                  />
                </span>
                {checkedIn
                  ? `En turno desde ${formatTime(status.check_in, tz)}`
                  : onBreak
                    ? `${onLunch ? "En comida" : `Fuera: ${status.break_reason_label ?? reasonLabel(status.break_reason, status.out_reasons)}`} desde ${formatTime(status.break_since ?? status.last_check_out, tz)}`
                    : "Fuera de turno"}
              </span>
            </div>

            {/* Botón principal */}
            <div
              className={`relative mx-auto flex size-[220px] items-center justify-center ${compact ? "mt-5" : "mt-7 md:size-[260px]"}`}
            >
              <div
                aria-hidden
                className={`absolute inset-0 rounded-full blur-2xl ${checkedIn ? "bg-primary/10" : "bg-primary/20"}`}
              />
              {!busy && (
                <span
                  aria-hidden
                  className="absolute inset-[22px] animate-pulse-ring rounded-full border-2 border-primary/50"
                />
              )}
              <button
                type="button"
                onClick={onMain}
                disabled={busy}
                className={`relative flex size-[176px] flex-col ${compact ? "" : "md:size-[208px]"} items-center justify-center gap-3 rounded-full transition active:scale-[0.97] disabled:cursor-wait ${
                  checkedIn
                    ? "border-2 border-primary/70 bg-base-200 text-primary shadow-[0_0_60px_-10px_color-mix(in_oklch,var(--color-primary)_45%,transparent),inset_0_0_40px_color-mix(in_oklch,var(--color-primary)_8%,transparent)]"
                    : "bg-primary text-primary-content shadow-[0_20px_70px_-10px_color-mix(in_oklch,var(--color-primary)_60%,transparent)]"
                }`}
              >
                {busyLabel ? (
                  <>
                    <Loader2 className="size-8 animate-spin" />
                    <span className="font-black text-[13px] uppercase tracking-[0.18em]">
                      {busyLabel}
                    </span>
                  </>
                ) : (
                  <>
                    {checkedIn ? (
                      <LogOut className="size-8" strokeWidth={2.2} />
                    ) : onBreak ? (
                      onLunch ? (
                        <Utensils className="size-8" strokeWidth={2.2} />
                      ) : (
                        <DoorOpen className="size-8" strokeWidth={2.2} />
                      )
                    ) : (
                      <LogIn className="size-8" strokeWidth={2.2} />
                    )}
                    <span className="font-black text-[17px] uppercase tracking-[0.16em]">
                      {checkedIn
                        ? "Check out"
                        : onBreak
                          ? "Regresar"
                          : "Check in"}
                    </span>
                    {onLunch && (
                      <span className="-mt-2 font-bold text-[11px] uppercase tracking-[0.16em] opacity-75">
                        de comer
                      </span>
                    )}
                  </>
                )}
              </button>
            </div>

            {checkedIn && (
              <div className="mt-5 flex flex-wrap justify-center gap-2.5">
                <button
                  type="button"
                  onClick={onLunchStart}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-4 py-2.5 font-bold text-[12px] text-warning uppercase tracking-[0.12em] transition active:scale-[0.97] disabled:opacity-40"
                >
                  <Utensils className="size-4" />
                  Comer
                </button>
                <button
                  type="button"
                  onClick={onExitStart}
                  disabled={busy}
                  className="inline-flex items-center gap-2 rounded-full border border-warning/40 bg-warning/10 px-4 py-2.5 font-bold text-[12px] text-warning uppercase tracking-[0.12em] transition active:scale-[0.97] disabled:opacity-40"
                >
                  <DoorOpen className="size-4" />
                  Salida
                </button>
              </div>
            )}

            <p className="mx-auto mt-4 flex max-w-[280px] items-start justify-center gap-1.5 text-center text-[13px] text-base-content/50 leading-snug">
              {status.gps_required && (
                <MapPin className="mt-0.5 size-3.5 shrink-0" />
              )}
              {onBreak ? (
                <>
                  Tu tiempo está en pausa. Marca tu regreso para seguir contando
                  horas{status.gps_required ? " (solo ubicación)" : ""}.
                </>
              ) : (
                <>
                  Se registrará tu hora
                  {status.gps_required ? " y ubicación" : ""}
                  {status.require_selfie ? " con una selfie" : ""} al marcar{" "}
                  {checkedIn ? "salida" : "entrada"}.
                  {checkedIn &&
                    " Si sales un momento (comer, tienda…) usa Comer o Salida: tu tiempo se pausa hasta que regreses."}
                </>
              )}
            </p>
          </div>

          {/* Columna del resumen */}
          <div className="flex flex-col">
            <p
              className={`eyebrow mt-8 mb-3 hidden xl:mt-0 ${compact ? "" : "xl:block"}`}
            >
              Resumen de hoy
            </p>
            {(notice ||
              syncNotice ||
              pendingReview > 0 ||
              pending.length > 0 ||
              rejected.length > 0) && (
              <div
                className={`mt-5 space-y-3 ${compact ? "" : "xl:order-last xl:mt-6"}`}
              >
                {notice && <Notice notice={notice} onClose={closeNotice} />}
                {syncNotice && (
                  <Notice notice={syncNotice} onClose={clearSyncNotice} />
                )}

                {pendingReview > 0 && (
                  <div className="flex gap-3 rounded-2xl border border-warning/30 bg-warning/10 px-4 py-3.5">
                    <ClipboardList className="mt-0.5 size-5 shrink-0 text-warning" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[14px] text-warning">
                        {pendingReview === 1
                          ? "1 registro en revisión"
                          : `${pendingReview} registros en revisión`}
                      </p>
                      <p className="mt-0.5 text-[12px] text-base-content/75 leading-snug">
                        No marcaste tu check out o tu regreso y el sistema cerró
                        tu jornada a medianoche. Recursos Humanos corregirá la
                        hora real.
                      </p>
                    </div>
                  </div>
                )}

                {pending.length > 0 && (
                  <div className="flex items-center gap-3 rounded-2xl border border-primary/25 bg-primary/[0.07] px-4 py-3.5">
                    <CloudUpload className="size-5 shrink-0 text-primary" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[14px] text-primary">
                        {pending.length === 1
                          ? "1 registro pendiente"
                          : `${pending.length} registros pendientes`}{" "}
                        de enviar
                      </p>
                      <p className="mt-0.5 text-[12px] text-base-content/65 leading-snug">
                        {online
                          ? "Enviando a Odoo…"
                          : `Guardado en tu celular. Se enviará al recuperar señal (máx. ${status.offline_max_hours ?? 72} h).`}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => syncNow()}
                      disabled={!online || syncing}
                      className="shrink-0 rounded-xl border border-primary/40 px-3 py-2 font-bold text-[11px] text-primary uppercase tracking-[0.12em] disabled:opacity-40"
                    >
                      {syncing ? (
                        <Loader2 className="size-4 animate-spin" />
                      ) : (
                        "Enviar"
                      )}
                    </button>
                  </div>
                )}

                {rejected.map((r) => (
                  <div
                    key={r.uuid}
                    role="alert"
                    className="flex gap-3 rounded-2xl border border-error/30 bg-error/10 px-4 py-3.5"
                  >
                    <CloudOff className="mt-0.5 size-5 shrink-0 text-error" />
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-[14px] text-error">
                        {actionLabel(r.action)} del{" "}
                        {formatTime(r.client_time, tz)} no se aceptó
                      </p>
                      <p className="mt-0.5 text-[12px] text-base-content/75 leading-snug">
                        {r.error} Avisa a Recursos Humanos para que la registre.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => dismissRejected(r.uuid)}
                      aria-label="Descartar aviso"
                      className="-m-1 self-start p-1 text-base-content/50"
                    >
                      <X className="size-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <dl
              className={`mt-6 grid grid-cols-3 divide-x divide-base-content/10 overflow-hidden rounded-2xl border border-base-content/10 bg-base-100/80 backdrop-blur ${compact ? "" : "xl:mt-0"}`}
            >
              <Stat label="Entrada" value={entrada} />
              <Stat label="Salida" value={salida} />
              <Stat label="Horas" value={formatHours(workedHours)} accent />
            </dl>

            <ul
              className={`mt-6 hidden space-y-3 text-[13px] text-base-content/50 ${compact ? "" : "xl:block"}`}
            >
              <li className="flex gap-3">
                <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                Marca tu entrada al iniciar la jornada y tu salida al
                terminarla.
              </li>
              {status.require_selfie && (
                <li className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  Se pedirá una selfie con la cámara como evidencia de tu
                  registro.
                </li>
              )}
              {status.gps_required && (
                <li className="flex gap-3">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-primary" />
                  Permite el acceso a tu ubicación para validar dónde registras.
                </li>
              )}
            </ul>
          </div>
        </div>
      </section>

      {step === "reason" && (
        <ReasonSheet
          reasons={status.out_reasons}
          onCancel={cancelCamera}
          onConfirm={confirmReason}
        />
      )}

      {step === "camera" && (
        <SelfieCamera
          title={
            intentRef.current?.action === "check_out"
              ? "Registrar salida"
              : "Registrar entrada"
          }
          onCancel={cancelCamera}
          onConfirm={(photo) =>
            send(photo, intentRef.current ?? { action: mainAction })
          }
        />
      )}
    </>
  );
}

function Stat({
  label,
  value,
  accent,
}: {
  label: string;
  value: string | null;
  accent?: boolean;
}) {
  return (
    <div className="px-4 py-3.5 md:px-5 md:py-4 xl:py-5">
      <dt className="eyebrow text-[10px]">{label}</dt>
      <dd
        className={`mt-1.5 font-extrabold text-[18px] tabular-nums md:text-[22px] ${
          accent
            ? "text-primary"
            : value
              ? "text-base-content"
              : "text-base-content/80 tracking-[0.2em]"
        }`}
      >
        {value ?? "--:--"}
      </dd>
    </div>
  );
}
