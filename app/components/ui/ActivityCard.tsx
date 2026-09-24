import Link from "next/link";
import { ArrowRight } from "lucide-react";

interface Props {
  company: string;
  folio: string;
  status: string;
  date: string;
  href?: string;
}

function getStatusInfo(stat: string) {
  const s = (stat || "").toLowerCase();

  if (s.includes("aprobad"))
    return {
      color: "text-success",
      bg: "bg-success/10",
      border: "border-success/20",
      label: "Aprobada",
      next: "Lista para avanzar a instalación.",
    };
  if (s.includes("info requerida") || s.includes("informaci"))
    return {
      color: "text-warning",
      bg: "bg-warning/10",
      border: "border-warning/20",
      label: "Info Requerida",
      next: "Te falta capturar datos para poder avanzar.",
    };
  if (s.includes("pre-venta") || s.includes("preventa") || s.includes("ingenier"))
    return {
      color: "text-info",
      bg: "bg-info/10",
      border: "border-info/20",
      label: "Pre-Venta",
      next: "Ingeniería está evaluando factibilidad.",
    };
  if (s.includes("ganada") || s.includes("won") || s.includes("activ"))
    return {
      color: "text-success",
      bg: "bg-success/10",
      border: "border-success/20",
      label: "Contratada",
      next: "Servicio activo. Sin pendientes.",
    };
  if (s.includes("perdida") || s.includes("lost") || s.includes("cancel"))
    return {
      color: "text-error",
      bg: "bg-error/10",
      border: "border-error/20",
      label: "Perdida/Canc.",
      next: "Este trámite ya no está en proceso.",
    };
  return {
    color: "text-primary",
    bg: "bg-primary/10",
    border: "border-primary/20",
    label: "En Análisis",
    next: "En revisión. Aún no requiere tu acción.",
  };
}

export default function ActivityCard({
  company,
  folio,
  status,
  date,
  href,
}: Props) {
  const info = getStatusInfo(status);
  const initial = (company || "?").trim().charAt(0).toUpperCase();

  return (
    <Link href={href || "#"} className="block group transition-all duration-300 h-full">
      <div className="card-premium card-hover flex flex-col p-7 h-full relative overflow-hidden">
        <span className={`absolute left-0 top-0 bottom-0 w-1 ${info.color.replace("text-", "bg-")}`} />

        {/* Group 1: stage + when */}
        <div className="flex justify-between items-start mb-5 pl-2">
          <div className={`px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${info.bg} ${info.color} ${info.border} border`}>
            {info.label}
          </div>
          <p className="text-[10px] font-bold text-base-content/50 uppercase tracking-widest">{date}</p>
        </div>

        {/* Group 2: who / which record */}
        <div className="flex items-center gap-3.5 mb-5 pl-2">
          <div className="avatar-chip w-11 h-11 rounded-2xl text-base shrink-0">
            {initial}
          </div>
          <div className="min-w-0 overflow-hidden">
            <h4 className="font-black text-base-content text-lg leading-tight group-hover:text-primary transition-colors truncate uppercase">
              {company || "Sin Empresa"}
            </h4>
            <p className="text-[10px] font-black text-base-content/45 uppercase tracking-widest">
              Expediente #{folio}
            </p>
          </div>
        </div>

        {/* Group 3: what happens next — the descriptive timeline hint */}
        <p className="text-xs font-bold text-base-content/65 leading-snug mb-6 pl-2">
          {info.next}
        </p>

        <div className="mt-auto pt-5 border-t border-base-content/10 flex items-center justify-between pl-2">
          <div className="flex items-center gap-2">
            <div className={`w-1.5 h-1.5 rounded-full ${info.color.replace("text-", "bg-")} animate-pulse`} />
            <span className="text-[10px] font-black text-base-content/55 uppercase tracking-widest group-hover:text-base-content/80 transition-colors">Ver seguimiento</span>
          </div>
          <ArrowRight className="w-4 h-4 text-primary/40 group-hover:text-primary group-hover:translate-x-1 transition-all" />
        </div>
      </div>
    </Link>
  );
}
