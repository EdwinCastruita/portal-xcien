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
    <div className="flex items-center gap-3">
      <div className="w-9 h-9 rounded-xl bg-base-content/5 border border-base-content/10 flex items-center justify-center text-primary shrink-0">
        <Icon className="w-4 h-4" />
      </div>
      <div className="flex items-center gap-2 text-[11px] font-black uppercase tracking-widest">
        <span className="text-base-content/35">Portal</span>
        <span className="text-base-content/20">/</span>
        <span className="text-base-content">{label}</span>
      </div>
    </div>
  );
}
