"use client";

import { Plus, BarChart3, Headphones } from "lucide-react";
import ActionCard from "./ActionCard";

export default function QuickActions() {
  return (
    <div className="mb-8 md:mb-10 animate-slide-in-up">
      <div className="flex items-center gap-4 mb-5">
        <div className="flex flex-col gap-1.5">
          <div className="h-0.5 w-6 bg-primary rounded-full" />
          <div className="h-0.5 w-4 bg-primary opacity-50 rounded-full" />
          <div className="h-0.5 w-2 bg-primary opacity-25 rounded-full" />
        </div>
        <div>
          <p className="text-[10px] font-black text-base-content/45 uppercase tracking-[0.3em] mb-1 leading-none">
            Siguiente Paso
          </p>
          <h2 className="text-xl sm:text-2xl font-black text-base-content uppercase tracking-tight leading-none">
            Acciones Rápidas
          </h2>
        </div>
      </div>

      {/* 1 columna en xs, 2 desde sm (la tercera tarjeta ocupa la fila
          completa para no quedar huérfana) y 3 desde xl, que es donde las
          tres caben sin truncar el título junto al sidebar fijo. */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-5">
        <ActionCard
          title="Nueva Solicitud"
          subtitle="Crear cotización rápida"
          Icon={Plus}
          highlight
          href="/solicitud/nueva"
        />
        <ActionCard
          title="Ver Mis Ventas"
          subtitle="Historial completo"
          Icon={BarChart3}
          href="/solicitudes"
        />
        <ActionCard
          title="Ayuda"
          subtitle="Contactar soporte"
          Icon={Headphones}
          disabled
          className="sm:col-span-2 xl:col-span-1"
        />
      </div>
    </div>
  );
}
