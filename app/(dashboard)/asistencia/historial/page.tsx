"use client";

import {
  ArrowRight,
  Camera,
  CloudOff,
  CloudUpload,
  DoorOpen,
  Loader2,
  Utensils,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { ApiError, apiFetch } from "@/app/lib/asistencia/api";
import {
  actionLabel,
  dayKey,
  formatDayLabel,
  formatHours,
  formatTime,
} from "@/app/lib/asistencia/format";
import {
  loadCachedHistory,
  saveCachedHistory,
} from "@/app/lib/asistencia/offline-cache";
import { useStatus } from "@/app/lib/asistencia/status-context";
import type {
  GeofenceState,
  HistoryRecord,
  HistoryResponse,
} from "@/app/lib/asistencia/types";

const RANGES = [7, 15, 31];

const GEO_BADGE: Partial<
  Record<GeofenceState, { label: string; cls: string }>
> = {
  inside: {
    label: "Dentro",
    cls: "bg-success/10 text-success border-success/25",
  },
  outside: { label: "Fuera", cls: "bg-error/10 text-error border-error/25" },
  no_gps: {
    label: "Sin GPS",
    cls: "bg-warning/10 text-warning border-warning/25",
  },
  recorded: {
    label: "GPS",
    cls: "bg-base-content/5 text-base-content/70 border-base-content/10",
  },
};

export default function HistorialPage() {
  const { status, pending, online } = useStatus();
  const tz = status?.employee.tz;
  const [days, setDays] = useState(7);
  const [records, setRecords] = useState<HistoryRecord[] | null>(null);
  const [fromCache, setFromCache] = useState(false);
  const [error, setError] = useState("");
  // Recarga cuando se terminan de enviar los pendientes
  const pendingCount = pending.length;

  // biome-ignore lint/correctness/useExhaustiveDependencies: pendingCount recarga al terminar de enviar pendientes
  useEffect(() => {
    const controller = new AbortController();
    const cached = loadCachedHistory(days);
    setRecords(cached);
    setFromCache(Boolean(cached));
    setError("");
    apiFetch<HistoryResponse>("/history", {
      body: { days },
      signal: controller.signal,
    })
      .then((res) => {
        setRecords(res.records);
        setFromCache(false);
        saveCachedHistory(days, res.records);
      })
      .catch((err) => {
        if (controller.signal.aborted) return;
        if (err instanceof ApiError && err.status === 0) {
          // Sin señal: se queda lo último que se vio
          if (!cached)
            setError(
              "Sin conexión. El historial se mostrará cuando recuperes señal.",
            );
          return;
        }
        setError(err instanceof Error ? err.message : "No se pudo cargar.");
      });
    return () => controller.abort();
  }, [days, pendingCount]);

  const groups = useMemo(() => {
    const map = new Map<string, HistoryRecord[]>();
    for (const r of records ?? []) {
      const key = dayKey(r.check_in, tz);
      map.set(key, [...(map.get(key) ?? []), r]);
    }
    return [...map.entries()].map(([key, items]) => ({
      key,
      label: formatDayLabel(items[0].check_in, tz),
      items,
      total: items.reduce((sum, r) => sum + (r.worked_hours || 0), 0),
    }));
  }, [records, tz]);

  const totalHours = groups.reduce((s, g) => s + g.total, 0);

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col pb-6 xl:grid xl:max-w-6xl xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start xl:gap-12">
      <div className="xl:sticky xl:top-24">
        <p className="eyebrow">Tus registros</p>
        <h1 className="mt-1.5 font-extrabold text-[28px] text-base-content tracking-tight md:text-[36px]">
          Historial
        </h1>

        <div
          className="mt-5 grid grid-cols-3 gap-1 rounded-2xl border border-base-content/10 bg-base-200/60 p-1"
          role="tablist"
        >
          {RANGES.map((d) => (
            <button
              key={d}
              type="button"
              role="tab"
              aria-selected={days === d}
              onClick={() => setDays(d)}
              className={`h-10 rounded-xl font-bold text-[12px] uppercase tracking-[0.1em] transition ${
                days === d
                  ? "chip-selected"
                  : "border border-transparent text-base-content/50 hover:text-base-content"
              }`}
            >
              {d} días
            </button>
          ))}
        </div>

        {records && records.length > 0 && (
          <div className="mt-4 grid grid-cols-2 divide-x divide-base-content/10 rounded-2xl border border-base-content/10">
            <div className="px-4 py-3">
              <p className="eyebrow text-[10px]">Días trabajados</p>
              <p className="mt-1 font-extrabold text-[18px] text-base-content">
                {groups.length}
              </p>
            </div>
            <div className="px-4 py-3">
              <p className="eyebrow text-[10px]">Horas</p>
              <p className="mt-1 font-extrabold text-[18px] text-primary">
                {formatHours(totalHours)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="mt-5 flex-1 xl:mt-0">
        {pending.length > 0 && (
          <div className="mb-5 animate-slide-in-up">
            <div className="mb-2 flex items-center gap-2">
              <CloudUpload className="size-4 text-primary" />
              <h2 className="font-bold text-[13px] text-primary">
                Pendientes de enviar
              </h2>
            </div>
            <ul className="divide-y divide-base-content/10 overflow-hidden rounded-2xl border border-primary/25 bg-primary/[0.05]">
              {pending.map((p) => (
                <li
                  key={p.uuid}
                  className="flex items-center gap-3 px-4 py-3.5"
                >
                  <div className="min-w-0 flex-1">
                    <p className="font-extrabold text-[16px] text-base-content tabular-nums">
                      {actionLabel(p.action)} · {formatTime(p.client_time, tz)}
                    </p>
                    <p className="mt-0.5 text-[12px] text-base-content/50">
                      {formatDayLabel(p.client_time, tz)}
                    </p>
                  </div>
                  <span className="rounded-full border border-primary/30 px-2 py-0.5 font-bold text-[10px] text-primary uppercase tracking-[0.08em]">
                    Pendiente
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {fromCache && !online && (
          <p className="mb-4 flex items-center gap-2 text-[12px] text-warning">
            <CloudOff className="size-3.5" /> Sin conexión: mostrando lo último
            que se cargó.
          </p>
        )}
        {error ? (
          <p
            className={`py-10 text-center text-sm ${online ? "text-error" : "text-base-content/50"}`}
          >
            {error}
          </p>
        ) : !records ? (
          <div className="flex justify-center py-12">
            <Loader2 className="size-6 animate-spin text-base-content/50" />
          </div>
        ) : records.length === 0 ? (
          <p className="py-12 text-center text-sm text-base-content/50">
            Sin registros en los últimos {days} días.
          </p>
        ) : (
          <ol className="space-y-5">
            {groups.map((g) => (
              <li key={g.key} className="animate-slide-in-up">
                <div className="mb-2 flex items-baseline justify-between">
                  <h2 className="font-bold text-[13px] text-base-content">
                    {g.label}
                  </h2>
                  <span className="font-bold text-[12px] text-base-content/50 tabular-nums">
                    {formatHours(g.total)}
                  </span>
                </div>
                <ul className="divide-y divide-base-content/10 overflow-hidden rounded-2xl border border-base-content/10 bg-base-200/60">
                  {g.items.map((r) => (
                    <Row key={r.id} record={r} tz={tz} />
                  ))}
                </ul>
              </li>
            ))}
          </ol>
        )}
      </div>
    </section>
  );
}

function Row({ record: r, tz }: { record: HistoryRecord; tz?: string }) {
  const badges = [r.in_geofence_state, r.out_geofence_state]
    .map((s) => (s ? GEO_BADGE[s] : undefined))
    .filter(
      (b, i, arr): b is { label: string; cls: string } =>
        Boolean(b) && arr.indexOf(b) === i,
    );
  return (
    <li className="flex items-center gap-3 px-4 py-3.5">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 font-extrabold text-[16px] text-base-content tabular-nums">
          {formatTime(r.check_in, tz)}
          <ArrowRight className="size-3.5 text-base-content/40" />
          {r.check_out ? (
            formatTime(r.check_out, tz)
          ) : (
            <span className="font-bold text-[13px] text-success">En curso</span>
          )}
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {badges.map((b) => (
            <span
              key={b.label}
              className={`rounded-full border px-2 py-0.5 font-bold text-[10px] uppercase tracking-[0.08em] ${b.cls}`}
            >
              {b.label}
            </span>
          ))}
          {r.out_reason === "lunch" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 font-bold text-[10px] text-warning uppercase tracking-[0.08em]">
              <Utensils className="size-3" /> Comida
            </span>
          )}
          {r.out_reason && r.out_reason !== "lunch" && (
            <span className="inline-flex items-center gap-1 rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 font-bold text-[10px] text-warning uppercase tracking-[0.08em]">
              <DoorOpen className="size-3" /> Salida:{" "}
              {r.out_reason_label ?? r.out_reason}
              {r.out_reason_note ? `: ${r.out_reason_note}` : ""}
            </span>
          )}
          {r.auto_closed && (
            <span className="rounded-full border border-error/30 bg-error/10 px-2 py-0.5 font-bold text-[10px] text-error uppercase tracking-[0.08em]">
              Sin salida · cierre 23:59
            </span>
          )}
          {r.review_state === "to_review" && (
            <span className="rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 font-bold text-[10px] text-warning uppercase tracking-[0.08em]">
              Por revisión
            </span>
          )}
          {(r.in_offline || r.out_offline) && (
            <span className="inline-flex items-center gap-1 rounded-full border border-warning/25 bg-warning/10 px-2 py-0.5 font-bold text-[10px] text-warning uppercase tracking-[0.08em]">
              <CloudOff className="size-3" /> Sin conexión
            </span>
          )}
          {(r.in_selfie || r.out_selfie) && (
            <span className="inline-flex items-center gap-1 text-[11px] text-base-content/50">
              <Camera className="size-3" /> Selfie
            </span>
          )}
        </div>
      </div>
      <span className="font-bold text-[14px] text-primary tabular-nums">
        {r.check_out ? formatHours(r.worked_hours) : "—"}
      </span>
    </li>
  );
}
