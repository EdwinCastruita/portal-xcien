"use client";

import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  FilePlus2,
  List,
  Settings,
  Receipt,
  FileText,
  type LucideIcon,
} from "lucide-react";

const ROUTES: { match: (p: string) => boolean; label: string; icon: LucideIcon }[] = [
  { match: (p) => p === "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { match: (p) => p.startsWith("/solicitud/nueva"), label: "Nueva Solicitud", icon: FilePlus2 },
  { match: (p) => p.includes("/cotizacion"), label: "Cotización", icon: Receipt },
  { match: (p) => /\/solicitud\//.test(p), label: "Detalle de Solicitud", icon: FileText },
  { match: (p) => p.startsWith("/solicitudes"), label: "Mis Solicitudes", icon: List },
  { match: (p) => p.startsWith("/configuracion"), label: "Configuración", icon: Settings },
];

export default function TopBarTitle() {
  const pathname = usePathname() || "";
  const route = ROUTES.find((r) => r.match(pathname));
  const Icon = route?.icon ?? LayoutDashboard;
  const label = route?.label ?? "Portal";

  return (
    <div className="flex items-center gap-2 sm:gap-3 min-w-0">
      <Icon className="w-5 h-5 text-primary shrink-0" strokeWidth={2} />
      <div className="flex items-center gap-2 min-w-0 text-[10px] sm:text-[11px] font-black uppercase tracking-wider sm:tracking-widest">
        {/* En xs solo cabe la sección actual; el prefijo "Portal /" aparece desde sm. */}
        <span className="hidden sm:inline text-base-content/35">Portal</span>
        <span className="hidden sm:inline text-base-content/20">/</span>
        <span className="text-base-content truncate">{label}</span>
      </div>
    </div>
  );
}
