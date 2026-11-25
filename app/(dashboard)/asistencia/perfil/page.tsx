"use client";

import { Loader2 } from "lucide-react";
import { Avatar } from "@/app/components/asistencia/Avatar";
import { useStatus } from "@/app/lib/asistencia/status-context";

const GEOFENCE_LABEL = {
  home: "Home office (se valida tu domicilio)",
  field: "Campo (se guarda tu GPS)",
  none: "Sin geocerca",
};

export default function PerfilPage() {
  const { status, error } = useStatus();
  const employee = status?.employee;

  const rows: [string, string | undefined][] = employee
    ? [
        ["Usuario", employee.login],
        ["Puesto", employee.job_title],
        ["Departamento", employee.department],
        ["Jefe directo", employee.manager],
        ["Lugar de trabajo", employee.work_location],
        ["Empresa", employee.company_name],
        [
          "Tipo de acceso",
          employee.user_type === "portal"
            ? "Usuario portal"
            : "Usuario interno",
        ],
        ["Geocerca", status ? GEOFENCE_LABEL[status.geofence_mode] : undefined],
        ["Zona horaria", employee.tz],
      ]
    : [];

  return (
    <section className="mx-auto flex w-full max-w-3xl flex-1 flex-col pb-6 xl:max-w-5xl">
      {!employee ? (
        <div className="flex min-h-[40dvh] flex-1 items-center justify-center px-6 text-center">
          {error ? (
            <p className="text-sm text-base-content/60">{error}</p>
          ) : (
            <Loader2 className="size-6 animate-spin text-base-content/50" />
          )}
        </div>
      ) : (
        <div className="flex flex-1 flex-col md:grid md:grid-cols-[260px_minmax(0,1fr)] md:items-start md:gap-10 lg:grid-cols-[300px_minmax(0,1fr)]">
          <div className="flex flex-col md:sticky md:top-24 md:rounded-[28px] md:border md:border-base-content/10 md:bg-base-200/40 md:p-7">
            <div className="flex animate-slide-in-up flex-col items-center text-center">
              <Avatar employee={employee} size={88} />
              <h1 className="mt-4 font-extrabold text-[24px] text-base-content tracking-tight">
                {employee.name}
              </h1>
              {employee.job_title && (
                <p className="mt-1 text-[14px] text-base-content/50">
                  {employee.job_title}
                </p>
              )}
            </div>
          </div>

          <div className="flex flex-1 flex-col">
            <dl className="mt-7 md:mt-0 divide-y divide-base-content/10 overflow-hidden rounded-2xl border border-base-content/10 bg-base-200/60">
              {rows
                .filter(([, v]) => v)
                .map(([label, value]) => (
                  <div
                    key={label}
                    className="flex items-start justify-between gap-4 px-4 py-3.5"
                  >
                    <dt className="eyebrow pt-0.5 text-[10px]">{label}</dt>
                    <dd className="min-w-0 break-words text-right text-[14px] text-base-content">
                      {value}
                    </dd>
                  </div>
                ))}
            </dl>

            <div className="flex-1" />
            {status?.require_selfie && (
              <p className="mt-4 text-[12px] text-base-content/50 leading-relaxed">
                Cada registro pide una selfie en vivo como evidencia de
                identidad. Recursos Humanos la revisa; no se hace reconocimiento
                facial.
              </p>
            )}

            <p className="mt-4 text-center font-bold text-[10px] text-base-content/40 uppercase tracking-[0.24em] md:text-left">
              Control de asistencia
            </p>
          </div>
        </div>
      )}
    </section>
  );
}
