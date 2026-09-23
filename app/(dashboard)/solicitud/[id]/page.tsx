"use client";

import { useEffect, useState, useRef } from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  FileText,
  UploadCloud,
  MapPin,
  Building2,
  User,
  Pencil,
  Trash2,
  X,
  Save,
  Briefcase,
  TrendingUp,
  Tag,
  Phone,
  ArrowLeft,
  Clock,
  ShieldCheck,
  Loader2,
  AlertTriangle,
  Mail,
  Zap,
  ChevronRight,
  Printer,
  CreditCard,
  Receipt,
  AlertCircle,
  Download,
  Share2,
  Check,
  Calendar,
  Globe,
  DollarSign,
  Target,
  Award,
  Info,
  Copy,
  Compass,
} from "lucide-react";
import SmartSelector from "@/app/components/ui/SmartSelector";
import StageStepper from "@/app/components/ui/StageStepper";
import MapPicker from "@/app/components/ui/MapPicker";
import Link from "next/link";
import { useToast } from "@/app/components/ToastContext";
import { apiFetch, ApiError } from "@/app/lib/api";

/** Extrae [lat, lng] de un link de Google Maps o de un texto "lat, lng". */
function parseLatLng(text: string): [number, number] | null {
  if (!text) return null;
  const t = text.trim();
  const patterns = [
    /@(-?\d+\.\d+),(-?\d+\.\d+)/, // .../@19.43,-99.13,17z
    /[?&]q=(-?\d+\.\d+),(-?\d+\.\d+)/, // ...?q=19.43,-99.13
    /!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/, // ...!3d19.43!4d-99.13
    /^\s*(-?\d+\.\d+)\s*[, ]\s*(-?\d+\.\d+)\s*$/, // "19.43, -99.13"
  ];
  for (const re of patterns) {
    const m = t.match(re);
    if (m) return [parseFloat(m[1]), parseFloat(m[2])];
  }
  return null;
}

/** Aplana el payload anidado de `/api/portal/solicitudes/<id>` a la forma
 *  plana (site_*, lead_*) que consume esta pantalla. */
function flattenSolicitud(s: any) {
  if (!s) return s;
  const site = s.site || {};
  return {
    ...s,
    id: s.lead_id,
    created_at: s.created_at || s.create_date || "",
    site_id: site.id || null,
    site_name: site.name || "",
    site_street: site.street || "",
    site_number: site.number || "",
    site_colony: site.colony || "",
    site_zip: site.zip || "",
    site_city: site.city || "",
    site_state: site.state || "",
    site_phone: site.phone || "",
    site_email: site.email || "",
    site_lat: site.lat || 0,
    site_lng: site.lng || 0,
    site_contact_id: s.site_contact_id || site.id || null,
    site_contact: s.contact_name || "",
  };
}

function DetailItem({
  label,
  value,
  isLink = false,
  href = "",
  isMono = false,
}: {
  label: string;
  value: any;
  isLink?: boolean;
  href?: string;
  isMono?: boolean;
}) {
  const content = (
    <p
      className={`text-base font-black tracking-tight text-base-content/85 group-hover:text-base-content transition-colors ${isMono ? "font-mono tracking-widest" : ""}`}
    >
      {value || "—"}
    </p>
  );

  return (
    <div className="space-y-1">
      <p className="text-[9px] font-black text-base-content/50 uppercase tracking-[0.2em]">
        {label}
      </p>
      {isLink && value ? (
        <a
          href={href}
          className="hover:text-(--brand-accent) transition-colors inline-block"
        >
          {content}
        </a>
      ) : (
        content
      )}
    </div>
  );
}

export default function SolicitudDetallePage() {
  const params = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const id = params?.id as string;
  const printRef = useRef<HTMLDivElement>(null);

  const [solicitud, setSolicitud] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  // Edit state
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<any>({});
  const [saving, setSaving] = useState(false);

  // Quotation state
  // (movido a pantalla dedicada /cotizacion)

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Site Editor State
  const [showSiteEditor, setShowSiteEditor] = useState(false);
  const [showOpportunityEditor, setShowOpportunityEditor] = useState(false);
  const [showContactEditor, setShowContactEditor] = useState(false);
  const { success, error: toastError } = useToast();
  const [siteErrors, setSiteErrors] = useState<Record<string, string>>({});
  const [autoOpenedSetup, setAutoOpenedSetup] = useState(false);

  // All opportunities state
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loadingOpps, setLoadingOpps] = useState(false);
  const [relatedPartners, setRelatedPartners] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // La lista de requisitos y si se puede avanzar la calcula el BACK
  // (`solicitud.preventa`), espejo exacto de las validaciones de Odoo.
  const preventa = solicitud?.preventa ?? { items: [], missing: [], can_advance: false };
  const getMissingPreventa = (data: any) =>
    (data?.preventa?.missing ?? []) as string[];

  useEffect(() => {
    async function fetchSolicitud() {
      try {
        const res = await apiFetch(`/solicitudes/${id}`, { company: true });
        const data = flattenSolicitud(res.solicitud);
        setSolicitud(data);
        setEditData({ ...data });
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    async function fetchOpportunities() {
      try {
        setLoadingOpps(true);
        const res = await apiFetch(`/solicitudes/${id}/opportunities`, {
          company: true,
        });
        setOpportunities(
          Array.isArray(res?.opportunities) ? res.opportunities : [],
        );
      } catch (err) {
        console.error("Error fetching opportunities", err);
      } finally {
        setLoadingOpps(false);
      }
    }
    async function fetchProducts() {
      try {
        setLoadingProducts(true);
        const res = await apiFetch(`/products`, {
          method: "POST",
          company: true,
        });
        setProducts(
          Array.isArray(res?.products)
            ? res.products.map((p: any) => ({
                id: p.id,
                name: p.name,
                price: p.list_price ?? p.price ?? 0,
              }))
            : [],
        );
      } catch (err) {
        console.error("Error fetching products", err);
      } finally {
        setLoadingProducts(false);
      }
    }

    fetchSolicitud();
    fetchOpportunities();
    fetchProducts();
  }, [id]);

  // Contactos/direcciones relacionados (una vez conocido el partner de la oportunidad)
  useEffect(() => {
    const pid = solicitud?.partner_id;
    if (!pid) return;
    apiFetch(`/partners/${pid}/related`, { company: true })
      .then((res) =>
        setRelatedPartners(Array.isArray(res?.partners) ? res.partners : []),
      )
      .catch((err) => console.error("Error fetching related partners", err));
  }, [solicitud?.partner_id]);

  useEffect(() => {
    const shouldSetup = searchParams?.get("setup") === "1";
    if (!shouldSetup || autoOpenedSetup || !solicitud) return;

    setEditData((prev: any) => ({
      ...prev,
      site_id: solicitud.site_id || null,
      site_contact_id: solicitud.site_contact_id || null,
      site_phone: solicitud.site_phone || "",
      site_email: solicitud.site_email || "",
      expected_closing: solicitud.expected_closing || "",
      lead_lat: solicitud.lead_lat || null,
      lead_lng: solicitud.lead_lng || null,
    }));
    setShowSiteEditor(true);
    setAutoOpenedSetup(true);
  }, [searchParams, autoOpenedSetup, solicitud]);

  const startEdit = () => {
    setEditData({
      business_name: solicitud.business_name,
      rfc: solicitud.rfc,
      contact_name: solicitud.contact_name,
      contact_email: solicitud.contact_email,
      contact_phone: solicitud.contact_phone || "",
      city: solicitud.city || "",
      state: solicitud.state || "",
      plan_speed: solicitud.plan_speed,
      plan_price: solicitud.plan_price,
      site_street: solicitud.site_street || "",
      site_number: solicitud.site_number || "",
      site_colony: solicitud.site_colony || "",
      site_zip: solicitud.site_zip || "",
      site_city: solicitud.site_city || "",
      site_state: solicitud.site_state || "",
      site_lat: solicitud.site_lat || 0,
      site_lng: solicitud.site_lng || 0,
      expected_closing: solicitud.expected_closing || "",
      product_id: solicitud.product_id || "",
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditData({});
  };

  const saveEdit = async (): Promise<boolean> => {
    setSaving(true);
    try {
      const res = await apiFetch(`/solicitudes/${id}/update`, {
        method: "POST",
        company: true,
        body: editData,
      });
      setSolicitud(flattenSolicitud(res.solicitud));
      setEditing(false);
      return true;
    } catch (err: any) {
      toastError(err.message);
      return false;
    } finally {
      setSaving(false);
    }
  };

  const openOpportunityDrawer = () => {
    setEditData({
      business_name: solicitud.business_name,
      rfc: solicitud.rfc,
      city: solicitud.city || "",
      state: solicitud.state || "",
      plan_speed: solicitud.plan_speed,
      plan_price: solicitud.plan_price,
      product_id: solicitud.product_id || "",
      expected_closing: solicitud.expected_closing || "",
      lead_lat: solicitud.lead_lat || 0,
      lead_lng: solicitud.lead_lng || 0,
    });
    setShowOpportunityEditor(true);
  };

  const openContactDrawer = () => {
    setEditData({
      contact_name: solicitud.contact_name || "",
      contact_email: solicitud.contact_email || "",
      contact_phone: solicitud.contact_phone || "",
    });
    setShowContactEditor(true);
  };

  const openSiteDrawer = () => {
    setEditData({
      ...solicitud,
      site_id: solicitud.site_id || null,
      site_contact_id: solicitud.site_contact_id || null,
      site_phone: solicitud.site_phone || "",
      site_email: solicitud.site_email || "",
      site_city: solicitud.site_city || "",
      site_state: solicitud.site_state || "",
      expected_closing: solicitud.expected_closing || "",
    });
    setSiteErrors({});
    setShowSiteEditor(true);
  };

  const advanceStage = async () => {
    const missing = getMissingPreventa(solicitud);
    if (missing.length > 0) {
      toastError(`Faltan campos obligatorios: ${missing.join(", ")}`);
      setShowSiteEditor(true);
      return;
    }

    try {
      await apiFetch(`/solicitudes/${id}/advance`, {
        method: "POST",
        company: true,
      });
      // Refrescar todo el estado (etapa, checklist, timeline)
      const res = await apiFetch(`/solicitudes/${id}`, { company: true });
      setSolicitud(flattenSolicitud(res.solicitud));
      success("Oportunidad enviada correctamente");
    } catch (err: any) {
      if (err instanceof ApiError && err.validation) {
        toastError(err.message);
      } else {
        console.error("Communication Error details:", err);
        toastError(`Error de Comunicación: ${err.message}`);
      }
    }
  };

  const deleteSolicitud = async () => {
    setDeleting(true);
    try {
      await apiFetch(`/solicitudes/${id}/delete`, {
        method: "POST",
        company: true,
      });
      router.push("/solicitudes");
    } catch (err: any) {
      toastError(err.message);
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto py-12 px-4 animate-fade-in">
        <div className="h-10 w-64 bg-base-content/5 rounded-2xl mb-12 animate-pulse" />
        <div className="grid lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-8">
            <div className="h-96 bg-base-content/[0.03] rounded-[40px] border border-base-content/5 animate-pulse" />
            <div className="h-64 bg-base-content/[0.03] rounded-[40px] border border-base-content/5 animate-pulse" />
          </div>
          <div className="h-[600px] bg-base-content/[0.03] rounded-[40px] border border-base-content/5 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !solicitud) {
    return (
      <div className="max-w-2xl mx-auto py-24 text-base-content text-center animate-fade-in">
        <div className="w-32 h-32 rounded-[40px] bg-base-content/[0.02] border border-base-content/5 flex items-center justify-center mx-auto mb-10 group">
          <AlertTriangle className="w-12 h-12 text-base-content/40 group-hover:text-error transition-colors" />
        </div>
        <h1 className="text-4xl font-black uppercase tracking-tighter mb-4 leading-none">
          REGISTRO NO ENCONTRADO
        </h1>
        <p className="text-base-content/50 text-[10px] font-black uppercase tracking-[0.2em] mb-12">
          EL FOLIO #{id} NO EXISTE O NO TIENE ACCESO.
        </p>
        <Link
          href="/solicitudes"
          className="btn-brand px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl inline-flex items-center gap-3"
        >
          <ArrowLeft className="w-4 h-4" /> Volver al Listado
        </Link>
      </div>
    );
  }

  const normalizedStatus = solicitud.status || "Borrador";
  const stageLc = normalizedStatus.toLowerCase();

  // ¿El vendedor está en fase de captura (puede editar y enviar a pre-venta)?
  const isCapture = ["borrador", "revision", "revisión", "nuevo"].some((s) =>
    stageLc.includes(s),
  );
  // ¿Está esperando respuesta del back (ingeniería / contratación / etc.)?
  const isWaiting = Boolean(solicitud?.preventa?.is_waiting);
  const isPreVenta = stageLc.includes("pre-venta");
  const isWaitingExternal = isWaiting;
  // Etapas a las que el vendedor sí puede mover manualmente desde aquí.
  const allowedNext: string[] = solicitud?.preventa?.allowed_next ?? [];

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 text-base-content space-y-12 animate-fade-in">
      {/* ─── Superior Header Area ─── */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-10">
        <div className="space-y-6 relative pl-6">
          <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary rounded-full shadow-[0_0_15px_var(--brand-accent-glow)]" />

          <Link
            href="/solicitudes"
            className="text-base-content/50 hover:text-primary text-[10px] font-black uppercase tracking-[0.25em] flex items-center gap-2 transition-all"
          >
            <ArrowLeft className="w-4 h-4" /> VOLVER A SOLICITUDES
          </Link>

          <div className="space-y-2">
            <div className="flex items-center gap-3 opacity-40 mb-1">
              <div className="h-0.5 w-6 bg-base-content rounded-full" />
              <div className="h-0.5 w-3 bg-base-content rounded-full" />
            </div>
            <h1 className="text-3xl md:text-4xl font-black tracking-tight leading-tight mb-3 group cursor-default">
              {solicitud.business_name}
              <span className="block text-xl font-mono text-base-content/30 mt-2 tracking-widest group-hover:text-primary transition-colors">
                #{solicitud.id}
              </span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <span className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-widest px-5 py-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-2xl">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_currentColor] animate-pulse" />
              {solicitud.status || "PENDIENTE"}
            </span>
            <div className="flex items-center gap-2 bg-base-content/5 border border-base-content/10 px-5 py-2.5 rounded-2xl text-[10px] font-black text-base-content/55 uppercase tracking-widest">
              <Clock className="w-4 h-4 opacity-60" />
              DADA DE ALTA:{" "}
              {new Date(solicitud.created_at)
                .toLocaleDateString("es-MX", { day: "2-digit", month: "long" })
                .toUpperCase()}
            </div>
          </div>
        </div>

        {/* CTA hierarchy: UNA sola acción primaria (Crear cotización).
            "Avanzar etapa" es la secundaria confirmada; editar contacto/oportunidad
            son utilitarias y por eso van en tono terciario — así no compiten
            visualmente con la siguiente acción real. */}
        <div className="flex items-center gap-3 w-full md:w-auto flex-wrap">
          {!editing ? (
            <>
              <button
                onClick={() =>
                  router.push(`/solicitud/${encodeURIComponent(id)}/cotizacion`)
                }
                className="btn-brand flex-1 md:flex-none px-10 py-5 rounded-2xl text-[10px] shadow-[0_0_30px_var(--brand-accent-glow)] flex items-center justify-center gap-3 group active:scale-95"
              >
                <Receipt className="w-5 h-5" /> Crear cotización
              </button>
              <div
                className="relative group/tip flex-1 md:flex-none"
                title={
                  isWaiting
                    ? "Esta oportunidad está en manos de Ingeniería/Contratación. No puedes avanzarla manualmente hasta que ellos respondan."
                    : undefined
                }
              >
                <button
                  onClick={advanceStage}
                  disabled={isWaiting}
                  className="btn-cta-secondary w-full px-8 py-5 rounded-2xl text-[10px] hover:text-primary hover:border-primary/40 flex items-center justify-center gap-3 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-base-content disabled:hover:border-base-content/15 active:scale-95"
                >
                  {isWaiting ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <TrendingUp className="w-5 h-5 group-hover:scale-110 transition-transform" />
                  )}
                  {isWaiting ? "En espera externa" : "Avanzar etapa"}
                </button>
              </div>
              <button
                onClick={openContactDrawer}
                className="btn-cta-tertiary flex-1 md:flex-none px-6 py-5 rounded-2xl text-[10px] flex items-center justify-center gap-3 group"
              >
                <User className="w-4 h-4 group-hover:text-primary transition-colors" />{" "}
                Editar contacto
              </button>
              <button
                onClick={openOpportunityDrawer}
                className="btn-cta-tertiary flex-1 md:flex-none px-6 py-5 rounded-2xl text-[10px] flex items-center justify-center gap-3 group"
              >
                <Pencil className="w-4 h-4 group-hover:text-primary transition-colors" />{" "}
                Editar oportunidad
              </button>
            </>
          ) : (
            <>
              <button
                onClick={cancelEdit}
                className="btn-cta-tertiary flex-1 md:flex-none px-8 py-5 rounded-2xl text-[10px] flex items-center justify-center gap-3"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button
                onClick={saveEdit}
                disabled={saving}
                className="flex-1 md:flex-none btn-brand px-12 py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-30"
              >
                {saving ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <>
                    <Save className="w-4 h-4" /> Confirmar Cambios
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      {/* ─── Stepper de etapa ─── */}
      {solicitud.timeline?.length > 0 && (
        <div className="card-premium p-8">
          <StageStepper steps={solicitud.timeline} />
        </div>
      )}

      {/* ─── Pre-Sale Requirements Checklist ─── */}
      {isCapture && !isWaiting && (
          <div className="bg-base-200 rounded-[40px] p-8 border border-base-content/5 mb-10 shadow-2xl relative overflow-hidden group">
            <div className="flex flex-col sm:flex-row sm:items-center gap-4 mb-6">
              <div className="w-12 h-12 rounded-2xl bg-(--brand-accent)/10 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-6 h-6 text-(--brand-accent)" />
              </div>
              <div className="flex-1">
                <h3 className="text-xl font-black tracking-tight">
                  Completa la oportunidad
                </h3>
                <p className="text-base-content/60 text-xs mt-1">
                  {preventa.missing.length === 0
                    ? "Todo listo — puedes enviarla a Ingeniería Pre-Venta."
                    : `${preventa.items.filter((i: any) => i.ok).length} de ${preventa.items.length} requisitos listos. Toca los que están en rojo.`}
                </p>
              </div>
              {preventa.missing.length > 0 && (
                <button
                  onClick={() => {
                    const first = preventa.items.find((i: any) => !i.ok);
                    if (!first) return;
                    if (first.group === "site") openSiteDrawer();
                    else if (first.group === "contact") openContactDrawer();
                    else if (first.group === "quotation")
                      router.push(`/solicitud/${id}/cotizacion`);
                    else openOpportunityDrawer();
                  }}
                  className="px-6 py-3 rounded-xl bg-(--brand-accent) text-primary-content text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-transform shrink-0"
                >
                  Completar siguiente
                </button>
              )}
            </div>
            {/* barra de progreso */}
            <div className="h-1.5 w-full bg-base-content/5 rounded-full mb-8 overflow-hidden">
              <div
                className="h-full bg-(--brand-accent) rounded-full transition-all duration-500"
                style={{
                  width: `${Math.round(
                    (preventa.items.filter((i: any) => i.ok).length /
                      Math.max(1, preventa.items.length)) *
                      100,
                  )}%`,
                }}
              />
            </div>

            <div className="grid md:grid-cols-3 gap-4">
              {(preventa.items ?? []).map((item: any) => (
                <button
                  key={item.key}
                  type="button"
                  onClick={() => {
                    if (item.ok) return;
                    if (item.group === "site") openSiteDrawer();
                    else if (item.group === "contact") openContactDrawer();
                    else if (item.group === "quotation")
                      router.push(`/solicitud/${id}/cotizacion`);
                    else openOpportunityDrawer();
                  }}
                  className={`text-left flex items-center gap-3 p-4 rounded-2xl border transition-all ${item.ok ? "bg-success/5 border-success/10 cursor-default" : "bg-error/5 border-error/10 hover:bg-error/10"}`}
                >
                  {item.ok ? (
                    <div className="w-5 h-5 rounded-full bg-success flex items-center justify-center shrink-0">
                      <Check className="w-3 h-3 text-success-content" />
                    </div>
                  ) : (
                    <div className="w-5 h-5 rounded-full bg-error/20 flex items-center justify-center text-error font-bold text-[10px] shrink-0">
                      !
                    </div>
                  )}
                  <span
                    className={`text-[10px] font-black uppercase tracking-tight ${item.ok ? "text-success" : "text-error/70"}`}
                  >
                    {item.label}
                  </span>
                </button>
              ))}
            </div>

            <div className="mt-8 pt-8 border-t border-base-content/5 flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-[9px] font-black text-base-content/50 uppercase tracking-[0.2em] max-w-lg text-center md:text-left">
                Toca cualquier requisito en rojo para completarlo. Cuando todo
                esté en verde podrás enviar la oportunidad a Ingeniería Pre-Venta.
              </p>
              {!editing && (
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={advanceStage}
                    disabled={!preventa.can_advance}
                    className="px-10 py-5 bg-(--brand-accent) text-primary-content rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-[0_0_40px_var(--brand-accent-glow)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
                  >
                    <Zap className="w-5 h-5" /> Enviar a Ingeniería Pre-Venta
                  </button>
                </div>
              )}
            </div>
          </div>
        )}

      {/* ─── External Waiting State (Ing/Habil/Fact) ─── */}
      {(isPreVenta || isWaitingExternal) && (
        <div className="bg-(--brand-accent)/10 border border-(--brand-accent)/20 p-10 rounded-[40px] flex flex-col md:flex-row items-center gap-10 animate-slide-in-up">
          <div className="w-24 h-24 rounded-[32px] bg-(--brand-accent) flex items-center justify-center shadow-[0_0_40px_var(--brand-accent-glow)]">
            <Loader2 className="w-12 h-12 text-primary-content animate-spin" />
          </div>
          <div className="flex-1 space-y-3 text-center md:text-left">
            <h3 className="text-3xl font-black uppercase tracking-tighter leading-none">
              {isPreVenta
                ? "A LA ESPERA DE INGENIERÍA"
                : `PROCESANDO ${normalizedStatus.toUpperCase()}`}
            </h3>
            <p className="text-base-content/60 text-[10px] font-black uppercase tracking-[0.2em] leading-relaxed max-w-2xl">
              LA SOLICITUD SE ENCUENTRA EN LA ETAPA DE{" "}
              <span className="text-(--brand-accent) text-xs font-black">
                {normalizedStatus.toUpperCase()}
              </span>{" "}
              EN ODOO.
              {isPreVenta
                ? " EL DEPARTAMENTO DE INGENIERÍA ESTÁ EVALUANDO LA FACTIBILIDAD TÉCNICA."
                : " ESTAMOS REALIZANDO LAS ACCIONES INTERNAS CORRESPONDIENTES."}{" "}
              TE NOTIFICAREMOS CUANDO SE REQUIERA TU INTERVENCIÓN EN EL PORTAL.
            </p>
          </div>
          <div className="flex flex-col gap-4">
            {allowedNext.length > 0 && (
              <button
                onClick={advanceStage}
                className="px-8 py-4 bg-base-content/10 hover:bg-primary hover:text-primary-content border border-base-content/10 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all flex items-center justify-center gap-2"
              >
                <TrendingUp className="w-4 h-4" /> Avanzar a {allowedNext[0]}
              </button>
            )}
            <div className="bg-base-100/50 px-8 py-5 rounded-3xl border border-base-content/5 text-center">
              <div className="flex items-center gap-2 text-(--brand-accent) text-[10px] font-black uppercase tracking-widest mb-1">
                <AlertCircle className="w-4 h-4" /> NOTIFICACIÓN ACTIVA
              </div>
              <p className="text-base-content/50 text-[9px] font-black uppercase tracking-widest">
                RASTREO EN TIEMPO REAL
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ─── Opportunity Drawer ─── */}
      {showOpportunityEditor && (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-md flex justify-end animate-fade-in">
          <div className="w-full max-w-2xl h-full bg-base-300 border-l border-base-content/10 shadow-[0_0_150px_rgba(0,0,0,1)] p-6 md:p-12 overflow-y-auto animate-slide-in-from-right">
            <div className="flex items-start justify-between gap-6 mb-12">
              <div className="flex items-center gap-6">
                <div className="w-16 h-16 rounded-3xl bg-base-content/5 border border-base-content/10 flex items-center justify-center">
                  <Briefcase className="w-8 h-8 text-(--brand-accent)" />
                </div>
                <div>
                  <h2 className="text-4xl font-black uppercase tracking-tighter">
                    OPORTUNIDAD
                  </h2>
                  <p className="text-base-content/50 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                    EDICIÓN COMERCIAL Y DE PLAN
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOpportunityEditor(false)}
                className="w-12 h-12 rounded-full bg-base-content/5 flex items-center justify-center hover:bg-base-content/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-10">
              <div className="grid grid-cols-2 gap-6">
                <div className="space-y-2 col-span-2">
                  <p className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em] mb-2 ml-1">
                    Razón social
                  </p>
                  <input
                    value={editData.business_name || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        business_name: e.target.value,
                      })
                    }
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-6 py-5 text-base-content text-sm font-black uppercase focus:border-(--brand-accent)/50 transition-all font-mono"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em] mb-2 ml-1">
                    RFC
                  </p>
                  <input
                    value={editData.rfc || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, rfc: e.target.value })
                    }
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-6 py-5 text-base-content text-sm font-mono focus:border-(--brand-accent)/50 transition-all uppercase"
                  />
                </div>
                <div className="space-y-2">
                  <p className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em] mb-2 ml-1">
                    Cierre previsto
                  </p>
                  <input
                    type="date"
                    value={editData.expected_closing || ""}
                    onChange={(e) =>
                      setEditData({
                        ...editData,
                        expected_closing: e.target.value,
                      })
                    }
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-6 py-5 text-base-content text-sm font-black focus:border-(--brand-accent)/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <SmartSelector
                  label="PRODUCTO / PLAN ODOO"
                  placeholder="Buscar producto..."
                  icon={Tag}
                  options={products.map((p) => ({
                    id: p.id,
                    name: p.name,
                    extra: `$${p.price.toLocaleString()}`,
                  }))}
                  selectedId={editData.product_id}
                  onSelect={(opt) => {
                    const product = products.find((p) => p.id === opt?.id);
                    setEditData({
                      ...editData,
                      product_id: opt ? Number(opt.id) : "",
                      plan_speed: opt ? opt.name : editData.plan_speed,
                      plan_price: product ? product.price : editData.plan_price,
                    });
                  }}
                />
              </div>

              <div className="grid grid-cols-2 gap-6 bg-base-content/[0.02] p-8 rounded-[32px] border border-base-content/5 shadow-inner">
                <div className="space-y-2">
                  <p className="text-[9px] font-black text-base-content/50 uppercase tracking-widest mb-1">
                    Nombre Display Plan
                  </p>
                  <input
                    value={editData.plan_speed || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, plan_speed: e.target.value })
                    }
                    className="w-full bg-transparent border-b border-base-content/10 px-0 py-3 text-base-content text-lg font-black uppercase focus:border-(--brand-accent) transition-all outline-none"
                  />
                </div>
                <div className="space-y-2 text-right">
                  <p className="text-[9px] font-black text-base-content/50 uppercase tracking-widest mb-1">
                    Inversión Mensual
                  </p>
                  <div className="flex items-center justify-end gap-2">
                    <span className="text-base-content/50 text-xl font-black">$</span>
                    <input
                      type="number"
                      value={editData.plan_price ?? 0}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          plan_price: parseFloat(e.target.value) || 0,
                        })
                      }
                      className="bg-transparent border-b border-base-content/10 px-0 py-3 text-base-content text-2xl font-black text-right focus:border-(--brand-accent) transition-all outline-none w-32 font-mono"
                    />
                  </div>
                </div>
              </div>

              {/* Coordinates Section */}
              <div className="space-y-4">
                <p className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Compass className="w-3 h-3" /> GEOLOCALIZACIÓN REQUERIDA
                </p>
                <input
                  type="text"
                  placeholder="Pega aquí el link de Google Maps…"
                  onChange={(e) => {
                    const c = parseLatLng(e.target.value);
                    if (c)
                      setEditData({
                        ...editData,
                        lead_lat: c[0],
                        lead_lng: c[1],
                      });
                  }}
                  className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-6 py-4 text-base-content text-xs focus:border-(--brand-accent)/50 transition-all outline-none"
                />
                <MapPicker
                  lat={editData.lead_lat}
                  lng={editData.lead_lng}
                  onChange={(la, ln) =>
                    setEditData({ ...editData, lead_lat: la, lead_lng: ln })
                  }
                />
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-base-content/45 group-focus-within:text-(--brand-accent)/40 transition-colors uppercase">
                      LAT
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.0000"
                      value={editData.lead_lat ?? ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          lead_lat:
                            e.target.value === ""
                              ? null
                              : parseFloat(e.target.value),
                        })
                      }
                      className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl pl-16 pr-6 py-5 text-base-content text-sm font-mono focus:border-(--brand-accent)/50 transition-all outline-none"
                    />
                  </div>
                  <div className="relative group">
                    <div className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-base-content/45 group-focus-within:text-(--brand-accent)/40 transition-colors uppercase">
                      LNG
                    </div>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.0000"
                      value={editData.lead_lng ?? ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          lead_lng:
                            e.target.value === ""
                              ? null
                              : parseFloat(e.target.value),
                        })
                      }
                      className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl pl-16 pr-6 py-5 text-base-content text-sm font-mono focus:border-(--brand-accent)/50 transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={async () => {
                  const ok = await saveEdit();
                  if (ok) setShowOpportunityEditor(false);
                }}
                disabled={saving}
                className="w-full py-7 bg-(--brand-accent) text-primary-content rounded-[32px] text-[13px] font-black uppercase tracking-[0.3em] shadow-[0_20px_60px_var(--brand-accent-glow)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-4"
              >
                {saving ? (
                  <Loader2 className="w-8 h-8 animate-spin" />
                ) : (
                  <>
                    <Save className="w-6 h-6" /> Actualizar oportunidad
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Contact Drawer ─── */}
      {showContactEditor && (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-sm flex justify-end animate-fade-in">
          <div className="w-full max-w-lg h-full bg-base-300 border-l border-base-content/10 shadow-[0_0_150px_rgba(0,0,0,1)] p-6 md:p-12 overflow-y-auto animate-slide-in-from-right">
            <div className="flex items-start justify-between gap-6 mb-12">
              <div className="flex items-center gap-5">
                <div className="w-14 h-14 rounded-2xl bg-base-content/5 border border-base-content/10 flex items-center justify-center">
                  <User className="w-7 h-7 text-(--brand-accent)" />
                </div>
                <div>
                  <h2 className="text-3xl font-black uppercase tracking-tight">
                    CONTACTO
                  </h2>
                  <p className="text-base-content/50 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                    DUEÑO DE LA CUENTA
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowContactEditor(false)}
                className="w-12 h-12 rounded-full bg-base-content/5 flex items-center justify-center hover:bg-base-content/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-8">
              <div className="space-y-2">
                <p className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em] mb-2">
                  Nombre completo
                </p>
                <input
                  value={editData.contact_name || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, contact_name: e.target.value })
                  }
                  className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-6 py-5 text-base-content text-sm font-black uppercase focus:border-(--brand-accent) transition-all"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em] mb-2">
                  Correo corporativo
                </p>
                <input
                  type="email"
                  value={editData.contact_email || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, contact_email: e.target.value })
                  }
                  className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-6 py-5 text-base-content text-sm font-black lowercase focus:border-(--brand-accent) transition-all"
                />
              </div>
              <div className="space-y-2">
                <p className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em] mb-2">
                  Teléfono móvil
                </p>
                <input
                  value={editData.contact_phone || ""}
                  onChange={(e) =>
                    setEditData({ ...editData, contact_phone: e.target.value })
                  }
                  className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-6 py-5 text-base-content text-sm font-black focus:border-(--brand-accent) transition-all"
                />
              </div>

              <button
                onClick={async () => {
                  const ok = await saveEdit();
                  if (ok) setShowContactEditor(false);
                }}
                disabled={saving}
                className="w-full py-7 bg-base-content text-base-100 rounded-[28px] text-[12px] font-black uppercase tracking-[0.3em] hover:bg-primary hover:text-primary-content transition-all"
              >
                {saving ? (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                ) : (
                  "Guardar contacto"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Site Editor Drawer ─── */}
      {showSiteEditor && (
        <div className="fixed inset-0 z-100 bg-black/80 backdrop-blur-md flex justify-end animate-fade-in">
          <div className="w-full max-w-4xl h-full bg-base-300 border-l border-base-content/10 shadow-[0_0_150px_rgba(0,0,0,1)] p-6 md:p-12 overflow-y-auto animate-slide-in-from-right relative">
            <div className="absolute top-0 right-0 p-8">
              <button
                onClick={() => setShowSiteEditor(false)}
                className="w-12 h-12 rounded-full bg-base-content/5 flex items-center justify-center hover:bg-base-content/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-6 mb-12">
              <div className="w-20 h-20 rounded-[32px] bg-gradient-to-br from-(--brand-accent) to-(--brand-accent-glow) flex items-center justify-center shadow-[0_0_50px_var(--brand-accent-glow)]">
                <MapPin className="w-10 h-10 text-primary-content" />
              </div>
              <div>
                <h2 className="text-5xl font-black uppercase tracking-tighter leading-none">
                  DATOS DE SITIO
                </h2>
                <p className="text-base-content/50 text-[10px] font-black uppercase tracking-[0.2em] mt-3">
                  GEOPOSICIONAMIENTO Y CONTACTO TÉCNICO
                </p>
              </div>
            </div>

            <div className="space-y-12">
              <div className="grid md:grid-cols-2 gap-10">
                <SmartSelector
                  label="SITIO (CLIENTE FINAL)"
                  placeholder="Buscar sitio..."
                  icon={Building2}
                  options={relatedPartners.map((p) => ({
                    id: p.id,
                    name: p.name,
                    subtitle: p.type !== "contact" ? p.type?.toUpperCase() : "",
                  }))}
                  selectedId={editData.site_id}
                  onSelect={(opt) => {
                    setEditData({
                      ...editData,
                      site_id: opt ? Number(opt.id) : null,
                      site_name: opt ? opt.name : "",
                    });
                  }}
                />

                <SmartSelector
                  label="CONTACTO EN SITIO"
                  placeholder="Buscar contacto..."
                  icon={User}
                  options={relatedPartners
                    .filter(
                      (p) =>
                        p.type === "contact" || p.id === solicitud.partner_id,
                    )
                    .map((p) => ({
                      id: p.id,
                      name: p.name,
                      subtitle: p.email,
                      extra: p.phone,
                    }))}
                  selectedId={editData.site_contact_id}
                  onSelect={(opt) => {
                    const partner = relatedPartners.find(
                      (p) => p.id === opt?.id,
                    );
                    setEditData({
                      ...editData,
                      site_contact_id: opt ? Number(opt.id) : null,
                      site_contact: opt ? opt.name : "",
                      site_phone: partner ? partner.phone : editData.site_phone,
                      site_email: partner ? partner.email : editData.site_email,
                    });
                  }}
                />
              </div>

              {/* Address Grid */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em]">
                  DIRECCIÓN DE INSTALACIÓN
                </label>
                <div className="grid md:grid-cols-4 gap-4">
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="CALLE"
                      value={editData.site_street || ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          site_street: e.target.value,
                        })
                      }
                      className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-6 py-5 text-base-content text-sm font-black uppercase focus:border-(--brand-accent) transition-all"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="NÚMERO"
                    value={editData.site_number || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, site_number: e.target.value })
                    }
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-6 py-5 text-base-content text-sm font-black uppercase focus:border-(--brand-accent) transition-all"
                  />
                  <input
                    type="text"
                    placeholder="CP"
                    value={editData.site_zip || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, site_zip: e.target.value })
                    }
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-6 py-5 text-base-content text-sm font-black uppercase focus:border-(--brand-accent) transition-all"
                  />
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="COLONIA"
                      value={editData.site_colony || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, site_colony: e.target.value })
                      }
                      className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-6 py-5 text-base-content text-sm font-black uppercase focus:border-(--brand-accent) transition-all"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="CIUDAD"
                    value={editData.site_city || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, site_city: e.target.value })
                    }
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-6 py-5 text-base-content text-sm font-black uppercase focus:border-(--brand-accent) transition-all"
                  />
                  <input
                    type="text"
                    placeholder="ESTADO"
                    value={editData.site_state || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, site_state: e.target.value })
                    }
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-6 py-5 text-base-content text-sm font-black uppercase focus:border-(--brand-accent) transition-all"
                  />
                </div>
              </div>

              <div className="grid md:grid-cols-3 gap-6">
                <div className="space-y-4">
                  <label className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em]">
                    TELÉFONO
                  </label>
                  <input
                    type="text"
                    value={editData.site_phone || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, site_phone: e.target.value })
                    }
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-6 py-5 text-base-content text-sm font-black focus:border-(--brand-accent) transition-all"
                  />
                </div>
                <div className="space-y-4 md:col-span-2">
                  <label className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em]">
                    EMAIL TÉCNICO
                  </label>
                  <input
                    type="email"
                    value={editData.site_email || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, site_email: e.target.value })
                    }
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-6 py-5 text-base-content text-sm font-black lowercase focus:border-(--brand-accent) transition-all"
                  />
                </div>
              </div>

              {/* Site Geolocation */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em] flex items-center gap-2">
                  <Globe className="w-3 h-3" /> COORDENADAS DE INSTALACIÓN
                  (SITIO)
                </label>
                <input
                  type="text"
                  placeholder="Pega aquí el link de Google Maps…"
                  onChange={(e) => {
                    const c = parseLatLng(e.target.value);
                    if (c)
                      setEditData({
                        ...editData,
                        site_lat: c[0],
                        site_lng: c[1],
                      });
                  }}
                  className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-6 py-4 text-base-content text-xs focus:border-(--brand-accent)/50 transition-all outline-none"
                />
                <MapPicker
                  lat={editData.site_lat}
                  lng={editData.site_lng}
                  onChange={(la, ln) =>
                    setEditData({ ...editData, site_lat: la, site_lng: ln })
                  }
                />
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-base-content/45 group-focus-within:text-(--brand-accent)/40 transition-colors uppercase">
                      LAT
                    </span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.000000"
                      value={editData.site_lat ?? ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          site_lat:
                            e.target.value === ""
                              ? null
                              : parseFloat(e.target.value),
                        })
                      }
                      className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl pl-16 pr-6 py-5 text-base-content text-sm font-mono focus:border-(--brand-accent) transition-all outline-none"
                    />
                  </div>
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-base-content/45 group-focus-within:text-(--brand-accent)/40 transition-colors uppercase">
                      LNG
                    </span>
                    <input
                      type="number"
                      step="any"
                      placeholder="0.000000"
                      value={editData.site_lng ?? ""}
                      onChange={(e) =>
                        setEditData({
                          ...editData,
                          site_lng:
                            e.target.value === ""
                              ? null
                              : parseFloat(e.target.value),
                        })
                      }
                      className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl pl-16 pr-6 py-5 text-base-content text-sm font-mono focus:border-(--brand-accent) transition-all outline-none"
                    />
                  </div>
                </div>
              </div>

              <button
                onClick={async () => {
                  const ok = await saveEdit();
                  if (ok) setShowSiteEditor(false);
                }}
                disabled={saving}
                className="w-full py-7 bg-base-content text-base-100 hover:bg-primary hover:text-primary-content hover:shadow-[0_0_50px_var(--brand-accent-glow)] rounded-[28px] text-[12px] font-black uppercase tracking-[0.3em] active:scale-[0.98] transition-all disabled:opacity-50 mt-10"
              >
                {saving ? (
                  <Loader2 className="w-8 h-8 animate-spin mx-auto" />
                ) : (
                  "Guardar cambios de sitio"
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black/90 backdrop-blur-md z-100 flex items-center justify-center p-6 animate-fade-in">
          <div className="bg-base-200 rounded-[40px] p-12 border border-base-content/10 max-w-md w-full shadow-[0_0_100px_rgba(0,0,0,0.8)] animate-slide-in-up relative overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-error" />
            <h3 className="text-3xl font-black uppercase tracking-tighter mb-4 text-center leading-none">
              ¿ESTÁ SEGURO?
            </h3>
            <p className="text-base-content/55 text-[10px] font-black uppercase tracking-[0.2em] mb-12 text-center leading-relaxed">
              LA SOLICITUD <span className="text-base-content">#{solicitud.id}</span> Y
              TODOS SUS ARCHIVOS SERÁN ELIMINADOS DE FORMA PERMANENTE.
            </p>
            <div className="space-y-4">
              <button
                onClick={deleteSolicitud}
                disabled={deleting}
                className="btn-cta-danger w-full py-5 rounded-2xl text-[10px]"
              >
                {deleting ? (
                  <Loader2 className="w-5 h-5 animate-spin mx-auto" />
                ) : (
                  "SÍ, ELIMINAR REGISTRO"
                )}
              </button>
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="btn-cta-tertiary w-full py-5 rounded-2xl text-[10px]"
              >
                MANTENER SOLICITUD
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Details Grid ─── */}
      <div className="grid lg:grid-cols-3 gap-10">
        {/* INFO COLUMN */}
        <div className="lg:col-span-2 space-y-10">
          {/* ─── Odoo-style Opportunity Details ─── */}
          <div className="bg-base-200 rounded-[40px] p-10 border border-base-content/5 relative overflow-hidden shadow-2xl transition-all hover:bg-base-300 group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-(--brand-accent)/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="flex flex-col gap-10 relative z-10">
              {/* Header: Name and Metrics */}
              <div className="space-y-8">
                <div className="flex items-center gap-3 opacity-20 transition-opacity group-hover:opacity-40">
                  <div className="h-0.5 w-12 bg-base-content rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">
                    Oportunidad CRM
                  </h3>
                </div>

                <h2 className="text-4xl font-black uppercase tracking-tighter leading-none text-base-content/90">
                  {solicitud.business_name}
                </h2>

                <div className="grid grid-cols-2 gap-8 pt-6 border-t border-base-content/5">
                  <div className="bg-base-content/[0.02] border border-base-content/5 rounded-3xl p-8 group hover:border-(--brand-accent)/40 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-(--brand-accent)/5 blur-2xl rounded-full" />
                    <p className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em] mb-3">
                      Ingreso Estimado
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-(--brand-accent)/40">
                        $
                      </span>
                      <p className="text-4xl font-black text-base-content tracking-tighter">
                        {solicitud.plan_price?.toLocaleString() || "0.00"}
                      </p>
                      <span className="text-[10px] font-black text-base-content/50 uppercase ml-1">
                        MXN
                      </span>
                    </div>
                  </div>

                  <div className="bg-base-content/[0.02] border border-base-content/5 rounded-3xl p-8 group hover:border-info/40 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-info/5 blur-2xl rounded-full" />
                    <p className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em] mb-3">
                      Probabilidad
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-4xl font-black text-base-content tracking-tighter">
                        {solicitud.probability || 0}
                        <span className="text-lg text-base-content/50 ml-1">%</span>
                      </p>
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
                          solicitud.probability >= 80
                            ? "bg-success/10 border-success/20 text-success"
                            : solicitud.probability >= 50
                              ? "bg-info/10 border-info/20 text-info"
                              : "bg-(--brand-accent)/10 border-(--brand-accent)/20 text-(--brand-accent)"
                        }`}
                      >
                        <Target className="w-5 h-5" />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Columns */}
              <div className="grid md:grid-cols-2 gap-x-20 gap-y-8">
                {/* Left Column */}
                <div className="space-y-6">
                  <DetailItem label="Cliente" value={solicitud.business_name} />
                  <DetailItem
                    label="Correo"
                    value={solicitud.contact_email}
                    isLink
                    href={`mailto:${solicitud.contact_email}`}
                  />
                  <DetailItem
                    label="Teléfono"
                    value={solicitud.contact_phone}
                  />
                  <DetailItem label="Sitio" value={solicitud.site_name} />
                  <DetailItem
                    label="Contacto en Sitio"
                    value={solicitud.site_contact}
                  />
                  <DetailItem label="RFC" value={solicitud.rfc} isMono />
                </div>

                {/* Right Column */}
                <div className="space-y-6">
                  <DetailItem
                    label="Vendedor"
                    value={solicitud.salesperson || "Asignado por sistema"}
                  />
                  <DetailItem
                    label="Etapa CRM"
                    value={solicitud.lead_stage || "Prospección"}
                  />
                  <DetailItem label="Compañía" value={solicitud.company_name} />
                  <DetailItem
                    label="Cierre previsto"
                    value={
                      solicitud.expected_closing
                        ? new Date(
                            solicitud.expected_closing,
                          ).toLocaleDateString("es-MX", {
                            day: "2-digit",
                            month: "2-digit",
                            year: "numeric",
                          })
                        : "Sin definir"
                    }
                  />
                  <DetailItem
                    label="Producto / Plan"
                    value={solicitud.plan_speed}
                  />
                  <DetailItem
                    label="Ubicación"
                    value={`${solicitud.city || "CDMX"}, ${solicitud.state || "MÉXICO"}`}
                  />
                  {solicitud.tags?.length > 0 && (
                    <div className="space-y-2">
                      <p className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em]">
                        Etiquetas
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {solicitud.tags.map((tag: string, i: number) => (
                          <span
                            key={i}
                            className="px-3 py-1 bg-base-content/5 border border-base-content/10 rounded-full text-[9px] font-black uppercase text-base-content/60"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-10 flex justify-end">
                <button
                  onClick={() => setShowOpportunityEditor(true)}
                  className="px-8 py-4 bg-base-content/[0.03] hover:bg-base-content/5 border border-base-content/10 rounded-2xl text-[10px] font-black uppercase tracking-widest text-base-content/60 hover:text-(--brand-accent) transition-all flex items-center gap-2"
                >
                  <Pencil className="w-4 h-4" /> Editar datos
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* TRACKING COLUMN */}
        <div className="space-y-10">
          {/* Timeline View */}
          <div className="bg-base-200 rounded-[40px] p-10 border border-base-content/5 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-(--brand-accent)/5 blur-[80px] rounded-full group-hover:bg-(--brand-accent)/10 transition-colors" />

            <div className="flex items-center gap-4 mb-12">
              <div className="flex flex-col gap-1.5">
                <div className="h-0.5 w-6 bg-(--brand-accent) rounded-full" />
                <div className="h-0.5 w-4 bg-(--brand-accent)/30 rounded-full" />
              </div>
              <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-base-content/50">
                LOG DE ACTIVIDAD
              </h3>
            </div>

            <div className="relative pl-10 space-y-12">
              <div className="absolute top-3 left-4.5 bottom-10 w-[1.5px] bg-base-content/[0.04]" />

              {solicitud.timeline?.map((step: any, i: number) => {
                const isFinished = step.status === "completed";
                const isNow = step.status === "current";
                const isNext = step.status === "pending";

                return (
                  <div
                    key={i}
                    className={`relative transition-all duration-500 ${isNext ? "opacity-20" : ""}`}
                  >
                    <div
                      className={`absolute top-1.5 -left-7 rounded-full border-[3px] transition-all duration-500 z-10 w-5 h-5
                        ${isFinished || isNow ? "bg-(--brand-accent) border-base-200 shadow-[0_0_15px_var(--brand-accent-glow)] scale-110" : "bg-base-200 border-base-content/10"}`}
                    />

                    {isNow && (
                      <div className="absolute top-1.5 -left-7 w-5 h-5 rounded-full bg-(--brand-accent) animate-ping opacity-40 scale-150" />
                    )}

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <span
                          className={`text-[11px] font-black uppercase tracking-widest ${isFinished || isNow ? "text-base-content" : "text-base-content/50"}`}
                        >
                          {step.title}
                        </span>
                        {isFinished && (
                          <div className="w-1.5 h-1.5 rounded-full bg-(--brand-accent) shadow-[0_0_8px_currentColor]" />
                        )}
                      </div>
                      {step.timestamp && (
                        <p className="text-[10px] font-mono text-base-content/50 tracking-wider">
                          {new Date(step.timestamp).toLocaleTimeString(
                            "es-MX",
                            { hour: "2-digit", minute: "2-digit" },
                          )}
                        </p>
                      )}
                      {step.description && !isNext && (
                        <div className="text-[11px] font-medium leading-relaxed p-6 rounded-3xl bg-base-content/[0.02] border border-base-content/5 text-base-content/60">
                          {step.description}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* CRM Integration Details */}
          {solicitud.lead_id && (
            <div className="bg-base-200 rounded-[40px] p-10 border border-base-content/5 relative overflow-hidden group shadow-2xl transition-all hover:bg-base-300">
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-(--brand-accent)/2 blur-[100px] rounded-full" />

              <div className="flex items-center gap-4 mb-12">
                <div className="flex flex-col gap-1.5">
                  <div className="h-0.5 w-6 bg-(--brand-accent) rounded-full" />
                  <div className="h-0.5 w-4 bg-(--brand-accent)/30 rounded-full" />
                </div>
                <h3 className="text-[11px] font-black uppercase tracking-[0.4em] text-base-content/50">
                  ODOO CRM HUB
                </h3>
              </div>

              <div className="space-y-6 relative z-10">
                {/* Opportunities History */}
                <div className="space-y-4">
                  <p className="text-[9px] font-black text-base-content/45 uppercase tracking-[0.4em] mb-6">
                    OPORTUNIDADES DEL CONTACTO
                  </p>
                  {loadingOpps ? (
                    <div className="flex justify-center p-10">
                      <Loader2 className="w-6 h-6 animate-spin text-base-content/50" />
                    </div>
                  ) : opportunities.length === 0 ? (
                    <p className="text-xs text-base-content/50 text-center py-4">
                      Sin historial detectado
                    </p>
                  ) : (
                    <div className="space-y-3">
                      {opportunities.map((opp, idx) => (
                        <div
                          key={idx}
                          className="bg-base-content/[0.02] border border-base-content/5 rounded-2xl p-5 hover:bg-base-content/5 transition-all"
                        >
                          <div className="flex justify-between items-start mb-2">
                            <h4 className="text-[11px] font-black text-base-content uppercase truncate max-w-[150px]">
                              {opp.name}
                            </h4>
                            <span
                              className={`text-[8px] font-black px-2 py-0.5 rounded-full border ${
                                opp.stage_id?.[1]?.includes("Ganado") ||
                                opp.stage_id?.[1]?.includes("Concretado")
                                  ? "bg-success/20 border-success/20 text-success"
                                  : "bg-base-content/10 border-base-content/10 text-base-content/60"
                              }`}
                            >
                              {opp.stage_id?.[1] || "NUEVO"}
                            </span>
                          </div>
                          <div className="flex justify-between items-center text-[9px] font-bold text-base-content/50">
                            <span>ID: #{opp.id}</span>
                            <span>
                              ${opp.expected_revenue?.toLocaleString() || 0}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                <div className="group/crm flex items-center justify-between p-7 rounded-3xl bg-base-content/[0.02] border border-base-content/5 hover:border-(--brand-accent)/20 transition-all cursor-default relative overflow-hidden">
                  <div className="relative z-10">
                    <p className="text-[9px] font-black text-base-content/45 uppercase tracking-widest mb-2">
                      IDENTIFICADOR OPORTUNIDAD
                    </p>
                    <div className="flex items-center gap-3">
                      <p className="text-xl font-black uppercase tracking-tight text-(--brand-accent)">
                        # {solicitud.lead_id}
                      </p>
                      <button
                        onClick={() => {
                          navigator.clipboard.writeText(
                            String(solicitud.lead_id),
                          );
                        }}
                        className="p-1.5 rounded-lg bg-base-content/5 hover:bg-primary hover:text-primary-content transition-all opacity-0 group-hover/crm:opacity-100"
                        title="Copiar ID"
                      >
                        <Copy className="w-3 h-3" />
                      </button>
                    </div>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-neutral text-neutral-content border border-base-content/5 flex items-center justify-center group-hover/crm:bg-primary group-hover/crm:text-primary-content transition-colors relative z-10">
                    <Briefcase className="w-7 h-7" />
                  </div>
                </div>

                <div className="flex items-center justify-between p-7 rounded-3xl bg-base-content/[0.02] border border-base-content/5">
                  <div>
                    <p className="text-[9px] font-black text-base-content/45 uppercase tracking-widest mb-2">
                      ETAPA ACTUAL CRM
                    </p>
                    <p className="text-xl font-black uppercase tracking-tight text-base-content/90">
                      {solicitud.lead_stage || "PROSPECCIÓN"}
                    </p>
                  </div>
                  <div className="w-14 h-14 rounded-2xl bg-base-content/5 flex items-center justify-center">
                    <Tag className="w-7 h-7 text-base-content/50" />
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
