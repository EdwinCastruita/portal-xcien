import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { getStageBadge } from "../../lib/stages";

interface Props {
  company: string;
  folio: string;
  status: string;
  date: string;
  href?: string;
}

// Pista de "qué sigue" según la etapa. El badge (color y texto) sale de
// `getStageBadge`, igual que en el listado de solicitudes.
function getNextHint(stat: string) {
  const s = (stat || "").toLowerCase();

  if (s.includes("concretado") || s.includes("ganada") || s.includes("won") || s.includes("cerrada") || s.includes("activ"))
    return "Servicio activo. Sin pendientes.";
  if (s.includes("perdida") || s.includes("lost") || s.includes("cancel"))
    return "Este trámite ya no está en proceso.";
  if (s.includes("info requerida") || s.includes("informaci"))
    return "Te falta capturar datos para poder avanzar.";
  if (s.includes("pre-venta") || s.includes("preventa") || s.includes("ingenier"))
    return "Ingeniería está evaluando factibilidad.";
  if (s.includes("habilit"))
    return "El equipo de habilitación está preparando el servicio.";
  if (s.includes("aprobad"))
    return "Lista para avanzar a instalación.";
  return "Revisa el seguimiento para ver el siguiente paso.";
}

export default function ActivityCard({
  company,
  folio,
  status,
  date,
  href,
}: Props) {
  const info = getStageBadge(status);
  const next = getNextHint(status);
  const initial = (company || "?").trim().charAt(0).toUpperCase();

  return (
    <Link href={href || "#"} className="block group transition-all duration-300 h-full">
      <div className="card-premium card-hover flex flex-col p-5 md:p-6 xl:p-7 h-full relative overflow-hidden">
        <span className={`absolute left-0 top-0 bottom-0 w-1 ${info.color.replace("text-", "bg-")}`} />

        {/* Group 1: stage + when */}
        <div className="flex flex-wrap justify-between items-center gap-2 mb-4 md:mb-5 pl-2">
          <div className={`px-3 md:px-4 py-1.5 rounded-full text-[10px] font-black uppercase tracking-widest ${info.bg} ${info.color} ${info.border} border`}>
            {info.label}
          </div>
          <p className="text-[10px] font-bold text-base-content/50 uppercase tracking-widest">{date}</p>
        </div>

        {/* Group 2: who / which record */}
        <div className="flex items-center gap-3.5 mb-4 md:mb-5 pl-2">
          <div className="avatar-chip w-11 h-11 rounded-2xl text-base shrink-0">
            {initial}
          </div>
          <div className="min-w-0 overflow-hidden">
            <h4 className="font-black text-base-content text-base md:text-lg leading-tight group-hover:text-primary transition-colors truncate uppercase">
              {company || "Sin Empresa"}
            </h4>
            <p className="text-[10px] font-black text-base-content/45 uppercase tracking-widest">
              Expediente #{folio}
            </p>
          </div>
        </div>

        {/* Group 3: what happens next — the descriptive timeline hint */}
        <p className="text-xs font-bold text-base-content/65 leading-snug mb-5 md:mb-6 pl-2">
          {next}
        </p>

        <div className="mt-auto pt-4 md:pt-5 border-t border-base-content/10 flex items-center justify-between pl-2">
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
