"use client";

import { Check, X } from "lucide-react";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import type { OutReason } from "@/app/lib/asistencia/types";

// Respaldo si el estado en caché viene de una versión anterior de Odoo
export const DEFAULT_OUT_REASONS: OutReason[] = [
  { value: "lunch", label: "Salida a comer" },
  { value: "errand", label: "Tienda" },
  { value: "personal", label: "Asunto personal" },
  { value: "field_visit", label: "Comisión / visita a cliente" },
  { value: "medical", label: "Médico" },
  { value: "other", label: "Otro" },
];

/** Nombre de un motivo de salida temporal. */
export function reasonLabel(reason?: string | null, reasons?: OutReason[]) {
  if (!reason) return "";
  return (
    reasons?.find((r) => r.value === reason)?.label ??
    DEFAULT_OUT_REASONS.find((r) => r.value === reason)?.label ??
    reason
  );
}

const NOTE_MAX = 200;

type Props = {
  reasons?: OutReason[];
  onCancel: () => void;
  onConfirm: (reason: string, note: string | null) => void;
};

/**
 * Hoja para elegir el motivo de una salida temporal (tienda, personal, …).
 * La comida tiene su propio botón, por eso no aparece aquí.
 */
export function ReasonSheet({ reasons, onCancel, onConfirm }: Props) {
  const options = (reasons?.length ? reasons : DEFAULT_OUT_REASONS).filter(
    (r) => r.value !== "lunch",
  );
  const [reason, setReason] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const needsNote = reason === "other";
  const canConfirm = !!reason && (!needsNote || note.trim().length > 0);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onCancel]);

  const confirm = () => {
    if (!reason || !canConfirm) return;
    onConfirm(reason, note.trim() || null);
  };

  // Portal a <body>: puede abrirse dentro del modal de checada rápida, cuya
  // animación (transform) atraparía un `position: fixed`.
  return createPortal(
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Motivo de la salida"
      className="overlay-backdrop"
    >
      <div className="modal-sheet max-w-[440px] p-5 sm:p-6 md:p-6">
        <div className="flex items-center justify-between">
          <div>
            <p className="eyebrow text-primary">Salida temporal</p>
            <h2 className="font-extrabold text-lg text-base-content">
              ¿A dónde sales?
            </h2>
            <p className="mt-0.5 text-[12px] text-base-content/50">
              Tu tiempo se pausa hasta que marques tu regreso.
            </p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancelar"
            className="flex size-10 shrink-0 items-center justify-center rounded-full border border-base-content/10 text-base-content/50 hover:text-base-content"
          >
            <X className="size-5" />
          </button>
        </div>

        <div className="space-y-2 pt-4">
          {options.map((o) => {
            const selected = reason === o.value;
            return (
              <button
                key={o.value}
                type="button"
                aria-pressed={selected}
                onClick={() => setReason(o.value)}
                className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3.5 text-left font-bold text-[14px] transition ${
                  selected
                    ? "border-primary/70 bg-primary/10 text-primary"
                    : "border-base-content/10 bg-base-100 text-base-content/85 hover:border-base-content/25"
                }`}
              >
                {o.label}
                {selected && <Check className="size-4" />}
              </button>
            );
          })}
          {needsNote && (
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value.slice(0, NOTE_MAX))}
              placeholder="Escribe el motivo"
              rows={2}
              // biome-ignore lint/a11y/noAutofocus: el campo aparece al elegir "Otro"
              autoFocus
              className="w-full resize-none rounded-2xl border border-base-content/10 bg-base-100 px-4 py-3 text-[14px] text-base-content placeholder:text-base-content/40 focus:border-primary/60 focus:outline-none"
            />
          )}
        </div>

        <div className="pt-4">
          <button
            type="button"
            onClick={confirm}
            disabled={!canConfirm}
            className="btn-brand w-full rounded-2xl py-3.5 text-[14px] disabled:opacity-40"
          >
            Continuar
          </button>
        </div>
      </div>
    </div>,
    document.body,
  );
}
