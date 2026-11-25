"use client";

import { Clock, History, UserRound } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useStatus } from "@/app/lib/asistencia/status-context";
import { Avatar, OfflinePill } from "./Avatar";

const TABS = [
  { href: "/asistencia", label: "Checar", icon: Clock },
  { href: "/asistencia/historial", label: "Historial", icon: History },
  { href: "/asistencia/perfil", label: "Perfil", icon: UserRound },
];

/** Sub-navegación de la sección de asistencia (dentro del shell del portal). */
export function AsistenciaTabs() {
  const pathname = usePathname() || "";
  const { status } = useStatus();

  return (
    <div className="mx-auto mb-6 flex w-full max-w-6xl items-center gap-3 md:mb-8">
      <nav
        aria-label="Asistencia"
        className="flex gap-1 rounded-2xl border border-base-content/10 bg-base-200/60 p-1"
      >
        {TABS.map(({ href, label, icon: Icon }) => {
          const active = pathname === href;
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={`flex h-10 items-center gap-2 rounded-xl px-3 font-bold text-[12px] uppercase tracking-[0.1em] transition sm:px-4 ${
                active
                  ? "chip-selected"
                  : "border border-transparent text-base-content/55 hover:text-base-content"
              }`}
            >
              <Icon className="size-4" />
              <span className="max-[399px]:sr-only">{label}</span>
            </Link>
          );
        })}
      </nav>
      <span className="ml-auto">
        <OfflinePill />
      </span>
      {status && (
        <Link
          href="/asistencia/perfil"
          aria-label="Mi perfil"
          className="rounded-full transition active:scale-95"
        >
          <Avatar employee={status.employee} size={40} />
        </Link>
      )}
    </div>
  );
}
