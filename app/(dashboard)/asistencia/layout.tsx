import { AsistenciaTabs } from "@/app/components/asistencia/AsistenciaTabs";
import { ServiceWorker } from "@/app/components/asistencia/ServiceWorker";

/**
 * Sección de asistencia (check in / check out) dentro del portal. Usa la
 * sesión del portal (`portal_sid`) contra `/api/attendance/*`; no tiene login
 * propio. El estado (`StatusProvider`) vive en `(dashboard)/layout.tsx` porque
 * también lo usa la checada rápida de la barra superior.
 */
export default function AsistenciaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <>
      <ServiceWorker />
      <AsistenciaTabs />
      {children}
    </>
  );
}
