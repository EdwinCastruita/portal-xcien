"use client";

import { CloudOff } from "lucide-react";
import { imageDataUrl, initials } from "@/app/lib/asistencia/format";
import { useStatus } from "@/app/lib/asistencia/status-context";
import type { Employee } from "@/app/lib/asistencia/types";

export function Avatar({
  employee,
  size = 44,
}: {
  employee?: Employee;
  size?: number;
}) {
  const src = imageDataUrl(employee?.image);
  return (
    <span
      className="flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-base-content/10 bg-base-200 font-extrabold text-primary"
      style={{ width: size, height: size, fontSize: size * 0.36 }}
    >
      {src ? (
        // biome-ignore lint/performance/noImgElement: data URL local de Odoo
        <img src={src} alt="" className="size-full object-cover" />
      ) : employee ? (
        initials(employee.name).slice(0, size < 60 ? 1 : 2)
      ) : null}
    </span>
  );
}

/** Pastilla visible mientras no hay conexión con Odoo. */
export function OfflinePill() {
  const { online, pending } = useStatus();
  if (online) return null;
  return (
    <span
      aria-live="polite"
      className="inline-flex items-center gap-1.5 whitespace-nowrap rounded-full border border-warning/30 bg-warning/10 px-3 py-1 font-bold text-[10px] text-warning uppercase tracking-[0.12em]"
    >
      <CloudOff className="size-3.5" />
      <span className="max-[399px]:sr-only">Sin señal</span>
      {pending.length ? <span>· {pending.length}</span> : null}
    </span>
  );
}
