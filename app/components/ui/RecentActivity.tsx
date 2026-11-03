"use client";

import { useEffect, useState } from "react";
import ActivityCard from "./ActivityCard";
import Link from "next/link";
import { Plus, ArrowRight } from "lucide-react";
import { apiFetch } from "../../lib/api";

export default function RecentActivity() {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    (async () => {
      try {
        const data = await apiFetch("/solicitudes?limit=6", { company: true });
        setSolicitudes(
          Array.isArray(data?.solicitudes) ? data.solicitudes : [],
        );
      } catch (err: any) {
        setErrorMsg(err.message || "Error al cargar solicitudes");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  /* ─ Loading state ─ */
  if (loading) {
    return (
      <div className="animate-slide-in-up">
        <div className="flex justify-between items-center mb-6 md:mb-8">
          <div className="flex items-center gap-4">
            <div className="flex flex-col gap-1.5">
              <div className="h-0.5 w-6 bg-primary rounded-full" />
              <div className="h-0.5 w-4 bg-primary opacity-50 rounded-full" />
              <div className="h-0.5 w-2 bg-primary opacity-25 rounded-full" />
            </div>
            <h2 className="text-xl font-black text-base-content uppercase tracking-tight">
              Actividad Reciente
            </h2>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="bg-base-200 border border-base-content/5 rounded-2xl h-52 overflow-hidden relative"
            >
              <div className="skeleton-shimmer absolute inset-0 opacity-40" />
            </div>
          ))}
        </div>
      </div>
    );
  }

  /* ─ Error State ─ */
  if (errorMsg) {
    return (
      <div className="bg-error/5 border border-error/10 rounded-2xl p-6 sm:p-10 text-center animate-slide-in-up">
        <p className="text-error font-black uppercase tracking-widest text-xs mb-2">
          Error de Sincronización
        </p>
        <p className="text-base-content/60 text-sm mb-6">{errorMsg}</p>
        <button
          onClick={() => window.location.reload()}
          className="text-base-content/50 hover:text-base-content text-[10px] font-black uppercase tracking-widest transition-colors"
        >
          Reintentar Conexión
        </button>
      </div>
    );
  }

  return (
    <div className="animate-slide-in-up">
      {/* Section header */}
      <div className="flex justify-between items-end mb-6 md:mb-8 gap-4">
        <div className="flex items-center gap-4">
          <div className="flex flex-col gap-1.5">
            <div className="h-0.5 w-6 bg-primary rounded-full" />
            <div className="h-0.5 w-4 bg-primary opacity-50 rounded-full" />
            <div className="h-0.5 w-2 bg-primary opacity-25 rounded-full" />
          </div>
          <div>
            <p className="text-[10px] font-black text-base-content/45 uppercase tracking-[0.3em] mb-1 leading-none">
              Timeline
            </p>
            <h2 className="text-xl sm:text-2xl font-black text-base-content uppercase tracking-tight leading-none">
              Actividad Reciente
            </h2>
          </div>
        </div>

        <Link
          href="/solicitudes"
          className="group flex items-center gap-2 min-h-11 shrink-0 text-[10px] font-black text-base-content/55 hover:text-primary uppercase tracking-widest transition-all duration-300"
        >
          Ver Todo
          <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
        </Link>
      </div>

      {solicitudes.length === 0 ? (
        <div className="bg-base-200 border border-base-content/5 rounded-3xl p-6 sm:p-10 md:p-12 text-center border-dashed group hover:border-base-content/10 transition-colors duration-500">
          <Plus
            strokeWidth={1.5}
            className="w-10 h-10 text-base-content/30 group-hover:text-primary group-hover:scale-110 transition-all duration-500 mx-auto mb-5"
          />
          <h3 className="text-lg font-black text-base-content uppercase tracking-tight mb-2">
            Sin actividad reciente
          </h3>
          <p className="text-base-content/55 text-sm mb-8">
            Comienza creando tu primera solicitud de servicio SIDE.
          </p>
          <Link
            href="/solicitud/nueva"
            className="btn-brand w-full sm:w-auto justify-center px-8 sm:px-10 py-4 rounded-xl text-xs font-black uppercase tracking-widest inline-flex items-center gap-2 group-hover:shadow-[0_0_20px_var(--color-primary-glow)] transition-all"
          >
            <Plus className="w-4 h-4" /> Nueva Solicitud
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4 md:gap-6">
          {solicitudes.slice(0, 6).map((sol) => (
            <ActivityCard
              key={sol.lead_id}
              company={sol.business_name}
              folio={`OP-${sol.lead_id}`}
              status={sol.status || ""}
              date={new Date(sol.create_date)
                .toLocaleDateString("es-MX", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })
                .toUpperCase()}
              href={`/solicitud/${sol.lead_id}`}
            />
          ))}
          {solicitudes.length < 6 && (
            <Link href="/solicitud/nueva" className="block group">
              <div className="h-full min-h-[176px] rounded-[1.5rem] border-2 border-dashed border-base-content/10 hover:border-primary/40 flex flex-col items-center justify-center gap-3 p-6 md:p-7 transition-all duration-300 hover:bg-primary/[0.03]">
                <Plus
                  strokeWidth={1.5}
                  className="w-8 h-8 text-base-content/30 group-hover:text-primary group-hover:scale-110 transition-all"
                />
                <p className="text-[10px] font-black text-base-content/40 group-hover:text-primary uppercase tracking-widest transition-colors">
                  Nueva Solicitud
                </p>
              </div>
            </Link>
          )}
        </div>
      )}
    </div>
  );
}
