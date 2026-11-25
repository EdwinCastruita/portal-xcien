import { AsistenciaTabs } from "@/app/components/asistencia/AsistenciaTabs";
import { ServiceWorker } from "@/app/components/asistencia/ServiceWorker";
import { StatusProvider } from "@/app/lib/asistencia/status-context";

/**
 * Sección de asistencia (check in / check out) dentro del portal. Usa la
 * sesión del portal (`portal_sid`) contra `/api/attendance/*`; no tiene login
 * propio. El estado vive en `StatusProvider`, compartido por las 3 pestañas.
 */
export default function AsistenciaLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <StatusProvider>
      <ServiceWorker />
      <AsistenciaTabs />
      {children}
    </StatusProvider>
  );
}
