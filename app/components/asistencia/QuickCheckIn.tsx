"use client";

import { Clock, X } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { getCookie } from "@/app/lib/api";
import { useStatus } from "@/app/lib/asistencia/status-context";
import { Avatar } from "./Avatar";
import { CheckPanel } from "./CheckPanel";

/**
 * Checada rápida en la barra superior del portal: botón que abre la misma UI
 * de `/asistencia` en un modal. No se muestra dentro de `/asistencia` (ya
 * está ahí) ni si el usuario no tiene empleado en Odoo.
 */
export function QuickCheckIn() {
  const pathname = usePathname() || "";
  const { status, errorCode } = useStatus();
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  if (
    !status ||
    errorCode === "no_employee" ||
    pathname === "/asistencia" ||
    pathname.startsWith("/asistencia/")
  )
    return null;

  const state = status.attendance_state;
  const checkedIn = state === "checked_in";
  const onBreak = state === "on_break";
  const label = checkedIn ? "Check out" : onBreak ? "Regresar" : "Check in";

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`Asistencia: ${label}`}
        className={`relative inline-flex h-10 items-center gap-2 rounded-full border px-3 font-black text-[11px] uppercase tracking-widest transition active:scale-[0.97] sm:px-4 ${
          checkedIn
            ? "border-success/30 bg-success/10 text-success"
            : onBreak
              ? "border-warning/30 bg-warning/10 text-warning"
              : "border-primary/30 bg-primary/10 text-primary"
        }`}
      >
        <span className="relative flex size-2">
          {checkedIn && (
            <span className="absolute inset-0 animate-ping rounded-full bg-success opacity-70" />
          )}
          <span
            className={`relative size-2 rounded-full ${checkedIn ? "bg-success" : onBreak ? "bg-warning" : "bg-primary"}`}
          />
        </span>
        <Clock className="size-4" />
        <span className="max-sm:sr-only">{label}</span>
      </button>

      {/* Portal a <body>: la barra superior usa `backdrop-blur`, que atrapa a
          los `position: fixed` y recortaba el modal al alto de la barra. */}
      {open &&
        createPortal(
          // biome-ignore lint/a11y/useKeyWithClickEvents: Escape se maneja en window
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Registrar asistencia"
            className="overlay-backdrop"
            onClick={(e) => e.target === e.currentTarget && setOpen(false)}
          >
            <div className="modal-sheet max-w-[480px] p-5 sm:p-6 md:p-6">
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Cerrar"
                className="absolute top-4 right-4 flex size-10 items-center justify-center rounded-full border border-base-content/10 text-base-content/50 hover:text-base-content"
              >
                <X className="size-5" />
              </button>
              <CheckPanel compact />
              <Link
                href="/asistencia/historial"
                onClick={() => setOpen(false)}
                className="btn-cta-tertiary mt-4 flex items-center justify-center rounded-xl text-[11px]"
              >
                Ver historial
              </Link>
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}

/**
 * Foto del usuario en la barra superior: la del empleado de Odoo si existe
 * (lleva a Mi Perfil) y, si no, sus iniciales.
 */
export function UserAvatar() {
  const { status } = useStatus();
  const [name, setName] = useState("");
  useEffect(() => setName(getCookie("user_name")), []);

  if (status)
    return (
      <Link
        href="/asistencia/perfil"
        aria-label="Mi perfil"
        title={status.employee.name}
        className="rounded-full transition active:scale-95"
      >
        <Avatar employee={status.employee} size={40} />
      </Link>
    );
  if (!name) return null;
  const initials = name
    .split(" ")
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();
  return (
    <span
      title={name}
      className="flex size-10 shrink-0 items-center justify-center rounded-full border border-base-content/10 bg-base-200 font-extrabold text-[13px] text-primary"
    >
      {initials}
    </span>
  );
}
