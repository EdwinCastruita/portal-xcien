"use client";

import { type LucideIcon, MoreHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

export interface OverflowMenuItem {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
  /** Acción destructiva: va en rojo y separada del resto. */
  danger?: boolean;
}

interface OverflowMenuProps {
  items: OverflowMenuItem[];
  label?: string;
  className?: string;
}

// Menú "⋯" para acciones poco frecuentes, para que no compitan con la acción
// principal de la vista. Las acciones `danger` se agrupan al final.
export default function OverflowMenu({
  items,
  label = "Más acciones",
  className = "",
}: OverflowMenuProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (!open) return;
    const onMouseDown = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener("mousedown", onMouseDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("mousedown", onMouseDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  const regular = items.filter((i) => !i.danger);
  const danger = items.filter((i) => i.danger);

  const renderItem = ({ label, icon: Icon, onClick, danger }: OverflowMenuItem) => (
    <button
      key={label}
      type="button"
      role="menuitem"
      onClick={() => {
        setOpen(false);
        onClick();
      }}
      className={`w-full flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-bold text-left transition-colors ${
        danger
          ? "text-error/80 hover:text-error hover:bg-error/10"
          : "text-base-content/75 hover:text-base-content hover:bg-base-content/5"
      }`}
    >
      <Icon className="w-4 h-4 shrink-0" />
      {label}
    </button>
  );

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={label}
        title={label}
        className={`btn-cta-secondary w-full h-full min-h-11 px-4 rounded-2xl flex items-center justify-center ${
          open ? "border-primary/40 text-primary" : ""
        }`}
      >
        <MoreHorizontal className="w-5 h-5" />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute right-0 top-full mt-2 z-[130] w-60 p-2 rounded-2xl border border-base-content/10 bg-base-300 shadow-2xl animate-in fade-in zoom-in-95 duration-150"
        >
          {regular.map(renderItem)}
          {regular.length > 0 && danger.length > 0 && (
            <div className="my-1 h-px bg-base-content/10" />
          )}
          {danger.map(renderItem)}
        </div>
      )}
    </div>
  );
}
