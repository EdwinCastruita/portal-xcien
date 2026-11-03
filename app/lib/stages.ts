// Badge de etapa de una oportunidad, compartido por el listado de
// solicitudes y las tarjetas del Dashboard para que muestren lo mismo.
// El texto es siempre el nombre real de la etapa en Odoo (igual que en el
// detalle); la categoría solo decide el color.
export function getStageBadge(status: string) {
  const s = (status || "").toLowerCase();
  const label = status || "Sin etapa";

  if (s.includes("concretado") || s.includes("ganada") || s.includes("won") || s.includes("cerrada") || s.includes("activ"))
    return {
      bg: "bg-success/10",
      border: "border-success/20",
      color: "text-success",
      label,
    };
  if (s.includes("perdida") || s.includes("lost") || s.includes("cancel"))
    return {
      bg: "bg-error/10",
      border: "border-error/20",
      color: "text-error",
      label,
    };
  if (
    s.includes("contratacion") ||
    s.includes("contratación") ||
    s.includes("pre-venta") ||
    s.includes("preventa") ||
    s.includes("habilit")
  )
    return {
      bg: "bg-info/10",
      border: "border-info/20",
      color: "text-info",
      label,
    };

  return {
    bg: "bg-primary/10",
    border: "border-primary/20",
    color: "text-primary",
    label,
  };
}
