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
  XCircle,
  UserPlus,
  ClipboardList,
  MessageSquare,
} from "lucide-react";
import DOMPurify from "dompurify";
import SmartSelector from "@/app/components/ui/SmartSelector";
import StageStepper from "@/app/components/ui/StageStepper";
import MapPicker from "@/app/components/ui/MapPicker";
import RichTextEditor from "@/app/components/ui/RichTextEditor";
import ChatterPanel from "@/app/components/ui/ChatterPanel";
import Link from "next/link";
import { useToast } from "@/app/components/ToastContext";
import { apiFetch, ApiError } from "@/app/lib/api";
import { mapPortalProduct, type PortalProduct, productOption } from "@/app/lib/products";
import { parseLatLng } from "@/app/lib/geo";

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
    site_lat: site.lat && site.lng ? site.lat : null,
    site_lng: site.lat && site.lng ? site.lng : null,
    site_city_id: site.city_id || null,
    site_state_id: site.state_id || null,
    site_region: site.region || "",
    site_contact_id: s.site_contact_id || null,
    site_contact: s.contact_name || "",
  };
}

function parseCoordinate(value: string, limit: number): number | null {
  if (!/^-?\d+(?:\.\d+)?$/.test(value.trim())) return null;
  const number = Number(value);
  return Number.isFinite(number) && Math.abs(number) <= limit ? number : null;
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

  // Notes state
  const [editingNotes, setEditingNotes] = useState(false);
  const [notesDraft, setNotesDraft] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [addingSurvey, setAddingSurvey] = useState(false);
  const [showSurveyConfirm, setShowSurveyConfirm] = useState(false);
  const [showChatter, setShowChatter] = useState(false);

  // Quotation state
  // (movido a pantalla dedicada /cotizacion)

  // Delete state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Site Editor State
  const [showSiteEditor, setShowSiteEditor] = useState(false);
  const [showOpportunityEditor, setShowOpportunityEditor] = useState(false);
  const [showContactEditor, setShowContactEditor] = useState(false);
  const [showClientEditor, setShowClientEditor] = useState(false);
  const { success, error: toastError } = useToast();
  const [siteErrors, setSiteErrors] = useState<Record<string, string>>({});
  const [autoOpenedSetup, setAutoOpenedSetup] = useState(false);

  // Régimen Capital (catálogo `res.partner.regimen`, odoo/action-2914) —
  // usado en el drawer "Editar Cliente" (QA v0.9 punto 4).
  const [regimenes, setRegimenes] = useState<{ id: number; name: string; full_name: string }[]>([]);

  // Marcar como Perdida (QA v0.9 punto 12).
  const [showLostModal, setShowLostModal] = useState(false);
  const [lostReasons, setLostReasons] = useState<{ id: number; name: string }[]>([]);
  const [lostSubreasons, setLostSubreasons] = useState<{ id: number; name: string }[]>([]);
  const [lostReasonId, setLostReasonId] = useState<number | null>(null);
  const [lostSubreasonId, setLostSubreasonId] = useState<number | null>(null);
  const [lostFeedback, setLostFeedback] = useState("");
  const [markingLost, setMarkingLost] = useState(false);

  // Alta inline de contacto nuevo para "Contacto en Sitio" (QA v0.9 punto 13).
  const [newSiteContactName, setNewSiteContactName] = useState("");
  const [creatingSiteContact, setCreatingSiteContact] = useState(false);

  // All opportunities state
  const [opportunities, setOpportunities] = useState<any[]>([]);
  const [loadingOpps, setLoadingOpps] = useState(false);
  const [quotations, setQuotations] = useState<any[]>([]);
  const [relatedPartners, setRelatedPartners] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loadingSites, setLoadingSites] = useState(false);
  const [siteLoadError, setSiteLoadError] = useState("");
  const [states, setStates] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  // Ciudades del Estado elegido en el drawer "Editar Cliente" (QA v0.9.1 punto 2).
  const [clientCities, setClientCities] = useState<any[]>([]);
  const [creatingSite, setCreatingSite] = useState(false);
  const [products, setProducts] = useState<PortalProduct[]>([]);
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
            ? res.products.map(mapPortalProduct)
            : [],
        );
      } catch (err) {
        console.error("Error fetching products", err);
      } finally {
        setLoadingProducts(false);
      }
    }
    async function fetchQuotations() {
      try {
        const res = await apiFetch(`/solicitudes/${id}/quotations`, { company: true });
        setQuotations(Array.isArray(res?.quotations) ? res.quotations : []);
      } catch (err) {
        console.error("Error fetching quotation history", err);
      }
    }

    fetchSolicitud();
    fetchOpportunities();
    fetchProducts();
    fetchQuotations();
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
    const pid = solicitud?.partner_id;
    if (!pid) {
      setSites([]);
      return;
    }
    let active = true;
    setLoadingSites(true);
    setSiteLoadError("");
    setSites([]);
    apiFetch(`/customers/${pid}/sites`, { company: true })
      .then((res) => {
        if (!active) return;
        const records = Array.isArray(res?.sites) ? res.sites : [];
        setSites(records.map((site: any) => ({
          ...site,
          city: site.city_name || site.city?.name || site.city || "",
          city_id: site.city_id || site.city?.id || null,
          state: site.state_name || site.state?.name || site.state || "",
          state_id: site.state_id || site.state?.id || null,
        })));
      })
      .catch((err: any) => {
        if (active) setSiteLoadError(err.message || "No se pudieron cargar los sitios de Odoo.");
      })
      .finally(() => {
        if (active) setLoadingSites(false);
      });
    return () => { active = false; };
  }, [solicitud?.partner_id]);

  useEffect(() => {
    apiFetch("/states", { company: true })
      .then((res) => setStates(Array.isArray(res?.states) ? res.states : []))
      .catch((err) => console.error("Error fetching states", err));
    apiFetch("/regimenes", { company: true })
      .then((res) => setRegimenes(Array.isArray(res?.regimenes) ? res.regimenes : []))
      .catch((err) => console.error("Error fetching regimenes", err));
    apiFetch("/lost_reasons", { company: true })
      .then((res) => setLostReasons(Array.isArray(res?.lost_reasons) ? res.lost_reasons : []))
      .catch((err) => console.error("Error fetching lost_reasons", err));
  }, []);

  useEffect(() => {
    if (!lostReasonId) {
      setLostSubreasons([]);
      setLostSubreasonId(null);
      return;
    }
    apiFetch("/lost_subreasons", {
      method: "POST",
      company: true,
      body: { lost_reason_id: lostReasonId },
    })
      .then((res) => setLostSubreasons(Array.isArray(res?.lost_subreasons) ? res.lost_subreasons : []))
      .catch((err) => console.error("Error fetching lost_subreasons", err));
  }, [lostReasonId]);

  useEffect(() => {
    if (!editData.site_state_id) {
      setCities([]);
      return;
    }
    apiFetch("/cities", {
      method: "POST",
      company: true,
      body: { state_id: editData.site_state_id },
    })
      .then((res) => setCities(Array.isArray(res?.cities) ? res.cities : []))
      .catch((err) => console.error("Error fetching cities", err));
  }, [editData.site_state_id]);

  useEffect(() => {
    if (!editData.client_state_id) {
      setClientCities([]);
      return;
    }
    apiFetch("/cities", {
      method: "POST",
      company: true,
      body: { state_id: editData.client_state_id },
    })
      .then((res) => setClientCities(Array.isArray(res?.cities) ? res.cities : []))
      .catch((err) => console.error("Error fetching cities", err));
  }, [editData.client_state_id]);

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
      site_lat: solicitud.site_lat ?? null,
      site_lng: solicitud.site_lng ?? null,
      site_city_id: solicitud.site_city_id || null,
      site_state_id: solicitud.site_state_id || null,
      expected_closing: solicitud.expected_closing || "",
      product_id: solicitud.product_id || "",
    });
    setEditing(true);
  };

  const cancelEdit = () => {
    setEditing(false);
    setEditData({});
  };

  const saveEdit = async (body: any = editData): Promise<boolean> => {
    setSaving(true);
    try {
      // `editData` puede ser una copia completa de la solicitud: las notas
      // solo se guardan desde su tarjeta para no pisarlas con una copia vieja.
      const { description: _description, ...fields } = body;
      const res = await apiFetch(`/solicitudes/${id}/update`, {
        method: "POST",
        company: true,
        body: fields,
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

  const saveNotes = async () => {
    setSavingNotes(true);
    try {
      const res = await apiFetch(`/solicitudes/${id}/update`, {
        method: "POST",
        company: true,
        body: { description: notesDraft },
      });
      setSolicitud(flattenSolicitud(res.solicitud));
      setEditingNotes(false);
      success("Notas guardadas");
    } catch (err: any) {
      toastError(err.message);
    } finally {
      setSavingNotes(false);
    }
  };

  const addSurvey = async () => {
    setAddingSurvey(true);
    try {
      const res = await apiFetch(`/solicitudes/${id}/add_survey`, {
        method: "POST",
        company: true,
      });
      setSolicitud(flattenSolicitud(res.solicitud));
      setShowSurveyConfirm(false);
      success("Cuestionario agregado a las notas");
    } catch (err: any) {
      setShowSurveyConfirm(false);
      toastError(err.message);
    } finally {
      setAddingSurvey(false);
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
    });
    setShowOpportunityEditor(true);
  };

  // El drawer de sitio parte de una copia completa de la solicitud; al
  // guardar solo deben viajar los datos del sitio. Mandar también
  // `business_name`/`rfc` hacía que Odoo reescribiera el Cliente y fallara
  // por contacto duplicado (QA v0.9.1 punto 4).
  const sitePayload = (data: any) =>
    Object.fromEntries(
      Object.entries(data).filter(
        ([key]) => key.startsWith("site_") || key === "create_site" || key === "expected_closing",
      ),
    );

  const openContactDrawer = () => {
    setEditData({
      contact_name: solicitud.contact_name || "",
      contact_email: solicitud.contact_email || "",
      contact_phone: solicitud.contact_phone || "",
      contact_edit: true,
    });
    setShowContactEditor(true);
  };

  const openClientDrawer = () => {
    const client = solicitud.client || {};
    setEditData({
      rfc: solicitud.rfc || "",
      street: client.street || "",
      street_number: client.street_number || "",
      street_number2: client.street_number2 || "",
      colony: client.colony || "",
      zip: client.zip || "",
      client_email: client.email || "",
      client_state_id: client.state_id || null,
      client_city_id: client.city_id || null,
      regimen_societario_id: client.regimen_societario_id || null,
      company_type: client.company_type || "company",
    });
    setShowClientEditor(true);
  };

  const openLostModal = () => {
    setLostReasonId(null);
    setLostSubreasonId(null);
    setLostFeedback("");
    setShowLostModal(true);
  };

  const submitLost = async () => {
    setMarkingLost(true);
    try {
      await apiFetch(`/leads/${id}/lost`, {
        method: "POST",
        company: true,
        body: {
          lost_reason_id: lostReasonId || undefined,
          lost_subreason_id: lostSubreasonId || undefined,
          lost_feedback: lostFeedback || undefined,
        },
      });
      success("Oportunidad marcada como perdida");
      setShowLostModal(false);
      router.push("/solicitudes");
    } catch (err: any) {
      toastError(err.message || "No se pudo marcar como perdida");
    } finally {
      setMarkingLost(false);
    }
  };

  const openSiteDrawer = () => {
    setCreatingSite(false);
    setEditData({
      ...solicitud,
      site_id: solicitud.site_id || null,
      site_contact_id: solicitud.site_contact_id || null,
      site_phone: solicitud.site_phone || "",
      site_email: solicitud.site_email || "",
      site_city: solicitud.site_city || "",
      site_state: solicitud.site_state || "",
      site_city_id: solicitud.site_city_id || null,
      site_state_id: solicitud.site_state_id || null,
      create_site: false,
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
      <div className="max-w-7xl mx-auto py-2 md:py-6 xl:py-10 animate-fade-in">
        <div className="h-10 w-full max-w-64 bg-base-content/5 rounded-2xl mb-8 md:mb-12 animate-pulse" />
        <div className="grid xl:grid-cols-3 gap-6 md:gap-8">
          <div className="xl:col-span-2 space-y-6 md:space-y-8">
            <div className="h-96 bg-base-content/[0.03] rounded-[40px] border border-base-content/5 animate-pulse" />
            <div className="h-64 bg-base-content/[0.03] rounded-[40px] border border-base-content/5 animate-pulse" />
          </div>
          <div className="h-80 xl:h-[600px] bg-base-content/[0.03] rounded-[40px] border border-base-content/5 animate-pulse" />
        </div>
      </div>
    );
  }

  if (error || !solicitud) {
    return (
      <div className="max-w-2xl mx-auto py-12 md:py-24 text-base-content text-center animate-fade-in">
        <AlertTriangle
          strokeWidth={1.5}
          className="w-16 h-16 text-base-content/30 mx-auto mb-10"
        />
        <h1 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tighter mb-4 leading-tight sm:leading-none">
          REGISTRO NO ENCONTRADO
        </h1>
        <p className="text-base-content/50 text-[10px] font-black uppercase tracking-[0.2em] mb-12">
          EL FOLIO #{id} NO EXISTE O NO TIENE ACCESO.
        </p>
        <Link
          href="/solicitudes"
          className="btn-brand w-full sm:w-auto px-8 sm:px-12 py-4 sm:py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl inline-flex items-center justify-center gap-3"
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
    <div className="max-w-7xl mx-auto py-2 md:py-6 xl:py-10 text-base-content space-y-8 md:space-y-12 animate-fade-in">
      {/* ─── Superior Header Area ─── */}
      {/* Título y acciones se ponen lado a lado solo desde xl: con 7 botones,
          en md/lg la fila apretaba el nombre del cliente hasta romperlo. */}
      <div className="flex flex-col xl:flex-row justify-between items-stretch xl:items-end gap-6 xl:gap-10">
        <div className="space-y-4 md:space-y-6 relative pl-5 md:pl-6 min-w-0">
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
            <h1 className="text-2xl sm:text-3xl xl:text-4xl font-black tracking-tight leading-tight mb-3 group cursor-default break-words">
              {solicitud.business_name}
              <span className="block text-base sm:text-xl font-mono text-base-content/30 mt-2 tracking-widest group-hover:text-primary transition-colors">
                #{solicitud.id}
              </span>
            </h1>
          </div>

          <div className="flex flex-wrap items-center gap-2 sm:gap-4">
            <span className="inline-flex items-center gap-3 text-[10px] font-black uppercase tracking-widest px-4 sm:px-5 py-2.5 rounded-2xl bg-primary/10 text-primary border border-primary/20 shadow-2xl">
              <span className="w-1.5 h-1.5 rounded-full bg-primary shadow-[0_0_8px_currentColor] animate-pulse" />
              {solicitud.status || "PENDIENTE"}
            </span>
            <div className="flex items-center gap-2 bg-base-content/5 border border-base-content/10 px-4 sm:px-5 py-2.5 rounded-2xl text-[10px] font-black text-base-content/55 uppercase tracking-widest">
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
        {/* xs: grid de 2 columnas (primaria y secundaria a todo el ancho,
            utilitarias en pares); md: 3 columnas; xl: fila alineada a la derecha. */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-2 sm:gap-3 w-full xl:w-auto xl:max-w-3xl xl:flex xl:flex-wrap xl:justify-end">
          {!editing ? (
            <>
              <button
                onClick={() =>
                  router.push(`/solicitud/${encodeURIComponent(id)}/cotizacion`)
                }
                className="btn-brand col-span-2 md:col-span-1 xl:flex-none px-6 sm:px-10 py-4 md:py-5 rounded-2xl text-[10px] shadow-[0_0_30px_var(--brand-accent-glow)] flex items-center justify-center gap-3 group active:scale-95"
              >
                <Receipt className="w-5 h-5" /> Crear cotización
              </button>
              <div
                className="relative group/tip col-span-2 md:col-span-1 xl:flex-none"
                title={
                  isWaiting
                    ? "Esta oportunidad está en manos de Ingeniería/Contratación. No puedes avanzarla manualmente hasta que ellos respondan."
                    : undefined
                }
              >
                <button
                  onClick={advanceStage}
                  disabled={isWaiting}
                  className="btn-cta-secondary w-full h-full px-6 sm:px-8 py-4 md:py-5 rounded-2xl text-[10px] hover:text-primary hover:border-primary/40 flex items-center justify-center gap-3 group disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:text-base-content disabled:hover:border-base-content/15 active:scale-95"
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
                onClick={() => setShowChatter(true)}
                className="btn-cta-tertiary xl:flex-none px-3 sm:px-6 py-3 md:py-4 rounded-2xl text-[10px] text-center leading-tight flex items-center justify-center gap-2 sm:gap-3 group"
              >
                <MessageSquare className="w-4 h-4 group-hover:text-primary transition-colors" />{" "}
                Interacciones
              </button>
              <button
                onClick={openContactDrawer}
                className="btn-cta-tertiary xl:flex-none px-3 sm:px-6 py-3 md:py-4 rounded-2xl text-[10px] text-center leading-tight flex items-center justify-center gap-2 sm:gap-3 group"
              >
                <User className="w-4 h-4 group-hover:text-primary transition-colors" />{" "}
                Editar contacto
              </button>
              <button
                onClick={openOpportunityDrawer}
                className="btn-cta-tertiary xl:flex-none px-3 sm:px-6 py-3 md:py-4 rounded-2xl text-[10px] text-center leading-tight flex items-center justify-center gap-2 sm:gap-3 group"
              >
                <Pencil className="w-4 h-4 group-hover:text-primary transition-colors" />{" "}
                Editar oportunidad
              </button>
              <button
                onClick={openClientDrawer}
                className="btn-cta-tertiary xl:flex-none px-3 sm:px-6 py-3 md:py-4 rounded-2xl text-[10px] text-center leading-tight flex items-center justify-center gap-2 sm:gap-3 group"
              >
                <Building2 className="w-4 h-4 group-hover:text-primary transition-colors" />{" "}
                Editar cliente
              </button>
              <button
                onClick={openSiteDrawer}
                className="btn-cta-tertiary xl:flex-none px-3 sm:px-6 py-3 md:py-4 rounded-2xl text-[10px] text-center leading-tight flex items-center justify-center gap-2 sm:gap-3 group"
              >
                <MapPin className="w-4 h-4 group-hover:text-primary transition-colors" />{" "}
                Editar sitio
              </button>
              <button
                onClick={openLostModal}
                className="btn-cta-tertiary col-span-2 md:col-span-3 xl:flex-none px-3 sm:px-6 py-3 md:py-4 rounded-2xl text-[10px] text-center leading-tight flex items-center justify-center gap-2 sm:gap-3 group text-error/60 hover:text-error"
              >
                <XCircle className="w-4 h-4" /> Marcar como perdida
              </button>
            </>
          ) : (
            <>
              <button
                onClick={cancelEdit}
                className="btn-cta-tertiary xl:flex-none px-4 sm:px-8 py-4 md:py-5 rounded-2xl text-[10px] flex items-center justify-center gap-2 sm:gap-3"
              >
                <X className="w-4 h-4" /> Cancelar
              </button>
              <button
                onClick={() => saveEdit()}
                disabled={saving}
                className="md:col-span-2 xl:flex-none btn-brand px-4 sm:px-12 py-4 md:py-5 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl transition-all flex items-center justify-center gap-3 disabled:opacity-30"
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
        <div className="card-premium p-5 md:p-6 xl:p-8">
          <StageStepper steps={solicitud.timeline} />
        </div>
      )}

      {/* ─── Pre-Sale Requirements Checklist ─── */}
      {isCapture && !isWaiting && (
          <div className="bg-base-200 rounded-3xl md:rounded-[40px] p-5 md:p-6 xl:p-8 border border-base-content/5 mb-6 md:mb-10 shadow-2xl relative overflow-hidden group">
            <div className="flex flex-col sm:flex-row sm:items-center gap-3.5 mb-6">
              <CheckCircle2 className="w-7 h-7 text-(--brand-accent) shrink-0" strokeWidth={1.75} />
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
                  className="w-full sm:w-auto min-h-11 px-6 py-3 rounded-xl bg-(--brand-accent) text-primary-content text-[11px] font-black uppercase tracking-widest hover:scale-105 transition-transform shrink-0"
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

            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3 md:gap-4">
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

            <div className="mt-6 md:mt-8 pt-6 md:pt-8 border-t border-base-content/5 flex flex-col lg:flex-row justify-between items-stretch lg:items-center gap-5 md:gap-6">
              <p className="text-[9px] font-black text-base-content/50 uppercase tracking-[0.2em] max-w-lg text-center lg:text-left">
                Toca cualquier requisito en rojo para completarlo. Cuando todo
                esté en verde podrás enviar la oportunidad a Ingeniería Pre-Venta.
              </p>
              {!editing && (
                <div className="flex flex-wrap gap-4">
                  <button
                    onClick={advanceStage}
                    disabled={!preventa.can_advance}
                    className="w-full lg:w-auto justify-center px-6 sm:px-10 py-4 md:py-5 bg-(--brand-accent) text-primary-content rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-[0_0_40px_var(--brand-accent-glow)] hover:scale-105 active:scale-95 transition-all flex items-center gap-3 disabled:opacity-30 disabled:cursor-not-allowed disabled:hover:scale-100"
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
        <div className="bg-(--brand-accent)/10 border border-(--brand-accent)/20 p-6 sm:p-8 md:p-10 rounded-[40px] flex flex-col md:flex-row items-center gap-6 md:gap-10 animate-slide-in-up">
          <div className="w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 rounded-[32px] bg-(--brand-accent) flex items-center justify-center shadow-[0_0_40px_var(--brand-accent-glow)] shrink-0">
            <Loader2 className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-primary-content animate-spin" />
          </div>
          <div className="flex-1 space-y-3 text-center md:text-left">
            <h3 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tighter leading-tight md:leading-none">
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
          <div className="flex flex-col gap-4 w-full md:w-auto">
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
        <div className="overlay-backdrop overlay-drawer animate-fade-in">
          <div className="drawer-panel md:max-w-xl lg:max-w-2xl animate-slide-in-from-right">
            <div className="flex items-start justify-between gap-4 md:gap-6 mb-8 md:mb-12">
              <div className="flex items-center gap-3 md:gap-5 min-w-0">
                <div className="relative w-12 h-12 md:w-14 md:h-14 shrink-0 flex items-center justify-center">
                  <div className="absolute inset-0 bg-(--brand-accent)/15 blur-2xl rounded-full" />
                  <Briefcase className="relative w-9 h-9 text-(--brand-accent)" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tighter">
                    OPORTUNIDAD
                  </h2>
                  <p className="text-base-content/50 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                    EDICIÓN COMERCIAL Y DE PLAN
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowOpportunityEditor(false)}
                aria-label="Cerrar"
                className="w-11 h-11 md:w-12 md:h-12 rounded-full bg-base-content/5 flex items-center justify-center hover:bg-base-content/10 transition-colors shrink-0"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-8 md:space-y-10">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 md:gap-6">
                <div className="space-y-2 sm:col-span-2">
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
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-base-content text-sm font-black uppercase focus:border-(--brand-accent)/50 transition-all font-mono"
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
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-base-content text-sm font-mono focus:border-(--brand-accent)/50 transition-all uppercase"
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
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-base-content text-sm font-black focus:border-(--brand-accent)/50 transition-all"
                  />
                </div>
              </div>

              <div className="space-y-6">
                <SmartSelector
                  label="PRODUCTO / PLAN ODOO"
                  placeholder="Buscar producto..."
                  icon={Tag}
                  options={products.map(productOption)}
                  selectedId={editData.product_id}
                  onSelect={(opt) => {
                    const product = products.find((p) => p.id === opt?.id);
                    setEditData({
                      ...editData,
                      product_id: opt ? Number(opt.id) : "",
                      plan_speed: product ? product.name : editData.plan_speed,
                      plan_price: product ? product.price : editData.plan_price,
                    });
                  }}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 bg-base-content/[0.02] p-5 sm:p-8 rounded-[32px] border border-base-content/5 shadow-inner">
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
                <div className="space-y-2 text-left sm:text-right">
                  <p className="text-[9px] font-black text-base-content/50 uppercase tracking-widest mb-1">
                    Inversión Mensual
                  </p>
                  <div className="flex items-center justify-start sm:justify-end gap-2">
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

              <button
                onClick={async () => {
                  const ok = await saveEdit();
                  if (ok) setShowOpportunityEditor(false);
                }}
                disabled={saving}
                className="sticky bottom-0 z-10 w-full py-5 md:py-7 bg-(--brand-accent) text-primary-content rounded-3xl md:rounded-[32px] text-[11px] md:text-[13px] font-black uppercase tracking-widest md:tracking-[0.3em] shadow-[0_20px_60px_var(--brand-accent-glow)] hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 mt-4 flex items-center justify-center gap-4"
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
        <div className="overlay-backdrop overlay-drawer animate-fade-in">
          <div className="drawer-panel sm:max-w-lg animate-slide-in-from-right">
            <div className="flex items-start justify-between gap-4 md:gap-6 mb-8 md:mb-12">
              <div className="flex items-center gap-3 md:gap-5 min-w-0">
                <div className="relative w-12 h-12 md:w-14 md:h-14 shrink-0 flex items-center justify-center">
                  <div className="absolute inset-0 bg-(--brand-accent)/15 blur-2xl rounded-full" />
                  <User className="relative w-8 h-8 text-(--brand-accent)" strokeWidth={1.5} />
                </div>
                <div>
                  <h2 className="text-2xl sm:text-3xl font-black uppercase tracking-tight">
                    CONTACTO
                  </h2>
                  <p className="text-base-content/50 text-[10px] font-black uppercase tracking-[0.2em] mt-2">
                    DUEÑO DE LA CUENTA
                  </p>
                </div>
              </div>
              <button
                onClick={() => setShowContactEditor(false)}
                aria-label="Cerrar" className="w-11 h-11 md:w-12 md:h-12 shrink-0 rounded-full bg-base-content/5 flex items-center justify-center hover:bg-base-content/10 transition-colors"
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
                  className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-base-content text-sm font-black uppercase focus:border-(--brand-accent) transition-all"
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
                  className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-base-content text-sm font-black lowercase focus:border-(--brand-accent) transition-all"
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
                  className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-base-content text-sm font-black focus:border-(--brand-accent) transition-all"
                />
              </div>

              <button
                onClick={async () => {
                  const ok = await saveEdit();
                  if (ok) setShowContactEditor(false);
                }}
                disabled={saving}
                className="sticky bottom-0 z-10 w-full py-5 md:py-7 bg-base-content text-base-100 rounded-3xl md:rounded-[28px] text-[11px] md:text-[12px] font-black uppercase tracking-widest md:tracking-[0.3em] hover:bg-primary hover:text-primary-content transition-all"
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

      {/* ─── Client Fiscal Data Drawer ─── */}
      {showClientEditor && (
        <div className="overlay-backdrop overlay-drawer animate-fade-in">
          <div className="drawer-panel md:max-w-xl lg:max-w-2xl animate-slide-in-from-right">
            <div className="flex items-start justify-between gap-4 md:gap-6 mb-8 md:mb-10">
              <div className="flex items-center gap-3 md:gap-5 min-w-0">
                <div className="w-12 h-12 md:w-14 md:h-14 shrink-0 rounded-2xl bg-primary/10 flex items-center justify-center">
                  <Building2 className="w-8 h-8 text-primary" />
                </div>
                <div>
                  <h2 className="text-xl sm:text-2xl md:text-3xl font-black uppercase tracking-tight break-words">DATOS FISCALES DEL CLIENTE</h2>
                  <p className="text-base-content/50 text-[10px] font-black uppercase tracking-[0.2em] mt-2">RFC Y DOMICILIO DE FACTURACIÓN</p>
                </div>
              </div>
              <button onClick={() => setShowClientEditor(false)} aria-label="Cerrar" className="w-11 h-11 md:w-12 md:h-12 shrink-0 rounded-full bg-base-content/5 flex items-center justify-center hover:bg-base-content/10 transition-colors">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em]">RFC</label>
                <input value={editData.rfc || ""} onChange={(e) => setEditData({ ...editData, rfc: e.target.value.toUpperCase() })} className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-sm font-mono uppercase focus:border-primary/50" />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em]">Correo electrónico</label>
                <input type="email" value={editData.client_email || ""} onChange={(e) => setEditData({ ...editData, client_email: e.target.value })} className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-sm font-bold focus:border-primary/50" />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-2">
                  <label className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em]">Calle</label>
                  <input value={editData.street || ""} onChange={(e) => setEditData({ ...editData, street: e.target.value })} className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-sm font-bold uppercase focus:border-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em]">Número exterior</label>
                  <input value={editData.street_number || ""} onChange={(e) => setEditData({ ...editData, street_number: e.target.value })} className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-sm font-bold uppercase focus:border-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em]">Número interior</label>
                  <input value={editData.street_number2 || ""} onChange={(e) => setEditData({ ...editData, street_number2: e.target.value })} className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-sm font-bold uppercase focus:border-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em]">Colonia</label>
                  <input value={editData.colony || ""} onChange={(e) => setEditData({ ...editData, colony: e.target.value })} className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-sm font-bold uppercase focus:border-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em]">Código Postal</label>
                  <input value={editData.zip || ""} onChange={(e) => setEditData({ ...editData, zip: e.target.value })} className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-sm font-bold uppercase focus:border-primary/50" />
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em]">Estado</label>
                  <select
                    value={editData.client_state_id || ""}
                    onChange={(e) => setEditData({ ...editData, client_state_id: Number(e.target.value) || null, client_city_id: null })}
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-sm font-bold uppercase focus:border-primary/50"
                  >
                    <option value="">Seleccionar estado</option>
                    {states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
                  </select>
                </div>
                <div className="space-y-2">
                  <label className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em]">Ciudad</label>
                  <select
                    value={editData.client_city_id || ""}
                    disabled={!editData.client_state_id}
                    onChange={(e) => setEditData({ ...editData, client_city_id: Number(e.target.value) || null })}
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-sm font-bold uppercase focus:border-primary/50 disabled:opacity-50"
                  >
                    <option value="">Seleccionar ciudad</option>
                    {clientCities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                  </select>
                </div>
              </div>

              {editData.company_type === "company" && (
                <SmartSelector
                  label="RÉGIMEN CAPITAL"
                  placeholder="Seleccionar régimen..."
                  options={regimenes.map((r) => ({ id: r.id, name: r.name, subtitle: r.full_name }))}
                  selectedId={editData.regimen_societario_id}
                  onSelect={(opt) => setEditData({ ...editData, regimen_societario_id: opt ? Number(opt.id) : null })}
                />
              )}

              <button
                onClick={async () => {
                  const ok = await saveEdit();
                  if (ok) setShowClientEditor(false);
                }}
                disabled={saving}
                className="w-full btn-brand py-6 rounded-2xl text-xs font-black uppercase tracking-[0.2em] flex items-center justify-center gap-3 disabled:opacity-50"
              >
                {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <><Save className="w-4 h-4" /> Guardar datos fiscales</>}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Site Editor Drawer ─── */}
      {showSiteEditor && (
        <div className="overlay-backdrop overlay-drawer animate-fade-in">
          <div className="drawer-panel md:max-w-2xl lg:max-w-3xl xl:max-w-4xl animate-slide-in-from-right relative">
            <div className="absolute top-0 right-0 p-4 sm:p-6 lg:p-8">
              <button
                onClick={() => setShowSiteEditor(false)}
                aria-label="Cerrar" className="w-11 h-11 md:w-12 md:h-12 shrink-0 rounded-full bg-base-content/5 flex items-center justify-center hover:bg-base-content/10 transition-colors"
              >
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="flex items-center gap-4 sm:gap-6 mb-8 md:mb-12 pr-14">
              <div className="w-14 h-14 sm:w-16 sm:h-16 md:w-20 md:h-20 rounded-[28px] md:rounded-[32px] bg-gradient-to-br from-(--brand-accent) to-(--brand-accent-glow) flex items-center justify-center shadow-[0_0_50px_var(--brand-accent-glow)] shrink-0">
                <MapPin className="w-7 h-7 sm:w-8 sm:h-8 md:w-10 md:h-10 text-primary-content" />
              </div>
              <div>
                <h2 className="text-2xl sm:text-3xl md:text-5xl font-black uppercase tracking-tighter leading-tight md:leading-none">
                  DATOS DE SITIO
                </h2>
                <p className="text-base-content/50 text-[10px] font-black uppercase tracking-[0.2em] mt-3">
                  GEOPOSICIONAMIENTO Y CONTACTO TÉCNICO
                </p>
              </div>
            </div>

            <div className="space-y-8 md:space-y-12">
              <div className="grid md:grid-cols-2 gap-6 lg:gap-10">
                <div className="space-y-3">
                  {!creatingSite ? (
                    <SmartSelector
                      label="SITIO (CLIENTE FINAL)"
                      placeholder={loadingSites ? "Cargando sitios de Odoo..." : "Buscar sitio..."}
                      icon={Building2}
                      options={[...sites, ...relatedPartners.filter((p) => p.id === editData.site_id && !sites.some((site) => site.id === p.id))]
                        .filter((p) => p.type === "delivery" || p.type === "other" || p.id === editData.site_id)
                        .map((p) => ({ id: p.id, name: p.name, subtitle: p.city }))}
                      selectedId={editData.site_id}
                      onSelect={(opt) => {
                        const partner = sites.find((p) => p.id === opt?.id) || relatedPartners.find((p) => p.id === opt?.id);
                        setEditData({
                          ...editData,
                          site_id: opt ? Number(opt.id) : null,
                          site_name: partner?.name || "",
                          site_street: partner?.street_name || "",
                          site_number: partner?.street_number || "",
                          site_colony: partner?.l10n_mx_edi_colony || "",
                          site_zip: partner?.zip || "",
                          site_city: partner?.city || "",
                          site_state: partner?.state || "",
                          site_city_id: partner?.city_id || null,
                          site_state_id: partner?.state_id || null,
                          site_lat: partner?.partner_latitude && partner?.partner_longitude ? partner.partner_latitude : null,
                          site_lng: partner?.partner_latitude && partner?.partner_longitude ? partner.partner_longitude : null,
                          site_phone: partner?.phone || "",
                          site_email: partner?.email || "",
                          create_site: false,
                        });
                      }}
                    />
                  ) : (
                    <div className="space-y-3">
                      <label className="block text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em]">Nombre del nuevo sitio</label>
                      <input
                        value={editData.site_name || ""}
                        onChange={(e) => setEditData({ ...editData, site_name: e.target.value })}
                        placeholder="Nombre o referencia del sitio"
                        className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-sm font-bold"
                      />
                    </div>
                  )}
                  {!creatingSite && siteLoadError && <p className="text-xs text-error">{siteLoadError}</p>}
                  {!creatingSite && !loadingSites && !siteLoadError && sites.length === 0 && <p className="text-xs text-base-content/50">Odoo no tiene sitios existentes para este cliente. Puedes crear uno nuevo.</p>}
                  <button type="button" onClick={() => {
                    const next = !creatingSite;
                    setCreatingSite(next);
                    setEditData({ ...editData, create_site: next, site_id: next ? null : editData.site_id, site_name: next ? "" : editData.site_name, site_street: next ? "" : editData.site_street, site_number: next ? "" : editData.site_number, site_colony: next ? "" : editData.site_colony, site_zip: next ? "" : editData.site_zip, site_city: next ? "" : editData.site_city, site_state: next ? "" : editData.site_state, site_city_id: next ? null : editData.site_city_id, site_state_id: next ? null : editData.site_state_id, site_region: next ? "" : editData.site_region, site_lat: next ? null : editData.site_lat, site_lng: next ? null : editData.site_lng });
                  }} className="text-xs font-bold text-primary underline underline-offset-4">
                    {creatingSite ? "Elegir un sitio existente" : "Crear nuevo Sitio (Dirección de Entrega)"}
                  </button>
                </div>

                <SmartSelector
                  label="CONTACTO EN SITIO"
                  placeholder="Buscar contacto..."
                  icon={User}
                  options={relatedPartners
                    .filter(
                      (p) =>
                      p.type === "contact",
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
                <div className="mt-3 flex gap-2">
                  <input
                    value={newSiteContactName}
                    onChange={(e) => setNewSiteContactName(e.target.value)}
                    placeholder="Nombre de un contacto nuevo"
                    className="input input-bordered bg-base-100 h-12 min-w-0 flex-1 rounded-xl"
                  />
                  <button
                    type="button"
                    className="btn btn-outline btn-primary"
                    disabled={!newSiteContactName.trim() || creatingSiteContact || !solicitud.partner_id}
                    onClick={async () => {
                      setCreatingSiteContact(true);
                      try {
                        const result = await apiFetch(`/customers/${solicitud.partner_id}/contacts/create`, {
                          method: "POST",
                          company: true,
                          body: { name: newSiteContactName.trim() },
                        });
                        const created = {
                          id: result.id,
                          name: result.name,
                          type: "contact",
                          email: "",
                          phone: "",
                        };
                        setRelatedPartners((prev) => [...prev, created]);
                        setEditData((prev: any) => ({
                          ...prev,
                          site_contact_id: result.id,
                          site_contact: result.name,
                          site_phone: "",
                          site_email: "",
                        }));
                        setNewSiteContactName("");
                      } catch (err: any) {
                        toastError(err.message || "No se pudo crear el contacto");
                      } finally {
                        setCreatingSiteContact(false);
                      }
                    }}
                  >
                    {creatingSiteContact ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                    Agregar
                  </button>
                </div>
              </div>

              {/* Address Grid */}
              <div className="space-y-4">
                <label className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em]">
                  DIRECCIÓN DE INSTALACIÓN
                </label>
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
                  <div className="col-span-2">
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
                      className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-base-content text-sm font-black uppercase focus:border-(--brand-accent) transition-all"
                    />
                  </div>
                  <input
                    type="text"
                    placeholder="NÚMERO"
                    value={editData.site_number || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, site_number: e.target.value })
                    }
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-base-content text-sm font-black uppercase focus:border-(--brand-accent) transition-all"
                  />
                  <input
                    type="text"
                    placeholder="CP"
                    value={editData.site_zip || ""}
                    onChange={(e) =>
                      setEditData({ ...editData, site_zip: e.target.value })
                    }
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-base-content text-sm font-black uppercase focus:border-(--brand-accent) transition-all"
                  />
                  <div className="md:col-span-2">
                    <input
                      type="text"
                      placeholder="COLONIA"
                      value={editData.site_colony || ""}
                      onChange={(e) =>
                        setEditData({ ...editData, site_colony: e.target.value })
                      }
                      className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-base-content text-sm font-black uppercase focus:border-(--brand-accent) transition-all"
                    />
                  </div>
                  <select
                    value={editData.site_state_id || ""}
                    onChange={(e) => {
                      const state = states.find((item) => item.id === Number(e.target.value));
                      setEditData({ ...editData, site_state_id: state?.id || null, site_state: state?.name || "", site_city_id: null, site_city: "", site_region: "" });
                    }}
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-base-content text-sm font-black uppercase"
                  >
                    <option value="">ESTADO</option>
                    {states.map((state) => <option key={state.id} value={state.id}>{state.name}</option>)}
                  </select>
                  <select
                    value={editData.site_city_id || ""}
                    disabled={!editData.site_state_id}
                    onChange={(e) => {
                      const city = cities.find((item) => item.id === Number(e.target.value));
                      setEditData({ ...editData, site_city_id: city?.id || null, site_city: city?.name || "", site_region: "" });
                    }}
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-base-content text-sm font-black uppercase disabled:opacity-50"
                  >
                    <option value="">CIUDAD</option>
                    {cities.map((city) => <option key={city.id} value={city.id}>{city.name}</option>)}
                  </select>
                  <input readOnly placeholder="PLAZA (AUTOMÁTICA)" value={editData.site_region || ""} className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-base-content/60 text-sm font-black uppercase" />
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
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-base-content text-sm font-black focus:border-(--brand-accent) transition-all"
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
                    className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl px-4 md:px-6 py-4 md:py-5 text-base-content text-sm font-black lowercase focus:border-(--brand-accent) transition-all"
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
                      type="text"
                      placeholder="0.000000"
                      value={editData.site_lat_raw ?? editData.site_lat ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = parseCoordinate(raw, 90);
                        setEditData({ ...editData, site_lat_raw: raw, ...(parsed !== null ? { site_lat: parsed } : {}) });
                        setSiteErrors({ ...siteErrors, site_lat: raw && parsed === null ? "Latitud inválida (−90 a 90)" : "" });
                      }}
                      onBlur={() => setEditData(({ site_lat_raw: _raw, ...rest }: any) => rest)}
                      className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl pl-16 pr-6 py-5 text-base-content text-sm font-mono focus:border-(--brand-accent) transition-all outline-none"
                    />
                  </div>
                  <div className="relative group">
                    <span className="absolute left-6 top-1/2 -translate-y-1/2 text-[10px] font-black text-base-content/45 group-focus-within:text-(--brand-accent)/40 transition-colors uppercase">
                      LNG
                    </span>
                    <input
                      type="text"
                      placeholder="0.000000"
                      value={editData.site_lng_raw ?? editData.site_lng ?? ""}
                      onChange={(e) => {
                        const raw = e.target.value;
                        const parsed = parseCoordinate(raw, 180);
                        setEditData({ ...editData, site_lng_raw: raw, ...(parsed !== null ? { site_lng: parsed } : {}) });
                        setSiteErrors({ ...siteErrors, site_lng: raw && parsed === null ? "Longitud inválida (−180 a 180)" : "" });
                      }}
                      onBlur={() => setEditData(({ site_lng_raw: _raw, ...rest }: any) => rest)}
                      className="w-full bg-base-content/[0.03] border border-base-content/10 rounded-2xl pl-16 pr-6 py-5 text-base-content text-sm font-mono focus:border-(--brand-accent) transition-all outline-none"
                    />
                  </div>
                </div>
                {(siteErrors.site_lat || siteErrors.site_lng) && <p className="text-xs text-error">{siteErrors.site_lat || siteErrors.site_lng}</p>}
              </div>

              <button
                onClick={async () => {
                  const ok = await saveEdit(sitePayload(editData));
                  if (ok) setShowSiteEditor(false);
                }}
                disabled={saving}
                className="sticky bottom-0 z-10 w-full py-5 md:py-7 bg-base-content text-base-100 hover:bg-primary hover:text-primary-content hover:shadow-[0_0_50px_var(--brand-accent-glow)] rounded-3xl md:rounded-[28px] text-[11px] md:text-[12px] font-black uppercase tracking-[0.3em] active:scale-[0.98] transition-all disabled:opacity-50 mt-10"
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

      {/* ─── Panel edge: abre Interacciones desde la orilla de la pantalla.
          El botón es más ancho que la pestaña para dejar un área táctil de 44px. */}
      <button
        type="button"
        onClick={() => setShowChatter(true)}
        aria-label="Abrir interacciones"
        title="Interacciones"
        className="group/edge fixed right-0 top-1/2 -translate-y-1/2 z-40 w-11 h-36 flex items-center justify-end"
      >
        <span className="w-1.5 h-28 overflow-hidden rounded-l-2xl bg-(--brand-accent)/70 text-primary-content shadow-[0_0_20px_var(--brand-accent-glow)] flex items-center justify-center transition-all duration-200 group-hover/edge:w-10 group-hover/edge:bg-(--brand-accent) group-focus-visible/edge:w-10 group-focus-visible/edge:bg-(--brand-accent)">
          <MessageSquare className="w-5 h-5 shrink-0 opacity-0 transition-opacity duration-200 group-hover/edge:opacity-100 group-focus-visible/edge:opacity-100" />
        </span>
      </button>

      {/* ─── Chatter Drawer ─── */}
      {showChatter && (
        <ChatterPanel solicitudId={id} onClose={() => setShowChatter(false)} />
      )}

      {/* ─── Survey Confirmation Modal ─── */}
      {showSurveyConfirm && (
        <div className="overlay-backdrop animate-fade-in">
          <div className="modal-sheet sm:max-w-md">
            <h3 className="text-2xl font-black uppercase tracking-tighter mb-4 text-center leading-tight">
              ¿Agregar cuestionario?
            </h3>
            <p className="text-base-content/60 text-sm mb-8 text-center leading-relaxed">
              Las notas ya tienen contenido. El cuestionario del producto se
              agregará al final, aunque ya se haya agregado antes.
            </p>
            <div className="flex flex-col-reverse sm:flex-row gap-3">
              <button
                onClick={() => setShowSurveyConfirm(false)}
                disabled={addingSurvey}
                className="btn btn-ghost flex-1"
              >
                Cancelar
              </button>
              <button
                onClick={addSurvey}
                disabled={addingSurvey}
                className="btn-cta-secondary flex-1 rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {addingSurvey ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                Agregar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ─── Delete Confirmation Modal ─── */}
      {showDeleteConfirm && (
        <div className="overlay-backdrop animate-fade-in">
          <div className="modal-sheet sm:max-w-md overflow-hidden">
            <div className="absolute top-0 left-0 right-0 h-1 bg-error" />
            <h3 className="text-2xl sm:text-3xl font-black uppercase tracking-tighter mb-4 text-center leading-tight sm:leading-none">
              ¿ESTÁ SEGURO?
            </h3>
            <p className="text-base-content/55 text-[10px] font-black uppercase tracking-[0.2em] mb-8 md:mb-12 text-center leading-relaxed">
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

      {/* ─── Mark Opportunity Lost Modal ─── */}
      {showLostModal && (
        <div className="overlay-backdrop animate-fade-in">
          <div className="modal-sheet sm:max-w-xl">
            <div className="absolute top-0 left-0 right-0 h-1 bg-error" />
            <div className="flex items-start justify-between gap-4 mb-6 md:mb-8">
              <div className="min-w-0">
                <h3 className="text-xl sm:text-2xl font-black uppercase tracking-tight">Marcar como perdida</h3>
                <p className="text-xs text-base-content/55 mt-2">La razón y el comentario son opcionales y sirven para documentar.</p>
              </div>
              <button onClick={() => setShowLostModal(false)} className="w-10 h-10 shrink-0 rounded-full bg-base-content/5 flex items-center justify-center" aria-label="Cerrar">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-base-content/50">Razón de pérdida (opcional)</label>
                <select value={lostReasonId || ""} onChange={(e) => setLostReasonId(Number(e.target.value) || null)} className="select select-bordered bg-base-100 w-full rounded-xl">
                  <option value="">Sin especificar</option>
                  {lostReasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-base-content/50">Subrazón (opcional)</label>
                <select value={lostSubreasonId || ""} onChange={(e) => setLostSubreasonId(Number(e.target.value) || null)} disabled={!lostReasonId} className="select select-bordered bg-base-100 w-full rounded-xl disabled:opacity-50">
                  <option value="">Sin especificar</option>
                  {lostSubreasons.map((reason) => <option key={reason.id} value={reason.id}>{reason.name}</option>)}
                </select>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] font-black uppercase tracking-widest text-base-content/50">Comentarios (opcional)</label>
                <textarea value={lostFeedback} onChange={(e) => setLostFeedback(e.target.value)} rows={4} className="textarea textarea-bordered bg-base-100 w-full rounded-xl" placeholder="Agrega información para documentar la pérdida..." />
              </div>
              <div className="flex flex-col-reverse sm:flex-row gap-3 pt-2">
                <button onClick={() => setShowLostModal(false)} className="btn btn-ghost flex-1">Cancelar</button>
                <button onClick={submitLost} disabled={markingLost} className="btn-cta-danger flex-1 rounded-xl py-3 flex items-center justify-center gap-2 disabled:opacity-50">
                  {markingLost ? <Loader2 className="w-4 h-4 animate-spin" /> : <XCircle className="w-4 h-4" />}
                  Confirmar oportunidad perdida
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ─── Main Details Grid ─── */}
      {/* 3 columnas solo desde xl: en lg (992px) el sidebar fijo deja ~700px de
          contenido y la columna lateral quedaba en ~220px, demasiado angosta. */}
      <div className="grid xl:grid-cols-3 gap-6 md:gap-8 xl:gap-10">
        {/* INFO COLUMN */}
        <div className="xl:col-span-2 space-y-6 md:space-y-8 xl:space-y-10">
          {/* ─── Odoo-style Opportunity Details ─── */}
          <div className="bg-base-200 rounded-3xl md:rounded-[40px] p-5 sm:p-8 md:p-10 border border-base-content/5 relative overflow-hidden shadow-2xl transition-all hover:bg-base-300 group">
            <div className="absolute top-0 right-0 w-96 h-96 bg-(--brand-accent)/5 blur-[120px] rounded-full pointer-events-none" />

            <div className="flex flex-col gap-6 sm:gap-10 relative z-10">
              {/* Header: Name and Metrics */}
              <div className="space-y-6 sm:space-y-8">
                <div className="flex items-center gap-3 opacity-20 transition-opacity group-hover:opacity-40">
                  <div className="h-0.5 w-12 bg-base-content rounded-full" />
                  <h3 className="text-[10px] font-black uppercase tracking-[0.4em]">
                    Oportunidad CRM
                  </h3>
                </div>

                <h2 className="text-2xl sm:text-3xl md:text-4xl font-black uppercase tracking-tighter leading-tight md:leading-none text-base-content/90 break-words">
                  {solicitud.business_name}
                </h2>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-8 pt-6 border-t border-base-content/5">
                  <div className="bg-base-content/[0.02] border border-base-content/5 rounded-3xl p-5 sm:p-6 md:p-8 group hover:border-(--brand-accent)/40 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-(--brand-accent)/5 blur-2xl rounded-full" />
                    <p className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em] mb-3">
                      Ingreso Estimado
                    </p>
                    <div className="flex items-baseline gap-2">
                      <span className="text-xl font-black text-(--brand-accent)/40">
                        $
                      </span>
                      <p className="text-2xl sm:text-3xl md:text-4xl font-black text-base-content tracking-tighter">
                        {solicitud.plan_price?.toLocaleString() || "0.00"}
                      </p>
                      <span className="text-[10px] font-black text-base-content/50 uppercase ml-1">
                        MXN
                      </span>
                    </div>
                  </div>

                  <div className="bg-base-content/[0.02] border border-base-content/5 rounded-3xl p-5 sm:p-6 md:p-8 group hover:border-info/40 transition-all duration-500 relative overflow-hidden">
                    <div className="absolute -top-10 -right-10 w-24 h-24 bg-info/5 blur-2xl rounded-full" />
                    <p className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em] mb-3">
                      Probabilidad
                    </p>
                    <div className="flex items-center justify-between">
                      <p className="text-2xl sm:text-3xl md:text-4xl font-black text-base-content tracking-tighter">
                        {solicitud.probability || 0}
                        <span className="text-lg text-base-content/50 ml-1">%</span>
                      </p>
                      <Target
                        strokeWidth={1.75}
                        className={`w-7 h-7 ${
                          solicitud.probability >= 80
                            ? "text-success"
                            : solicitud.probability >= 50
                              ? "text-info"
                              : "text-(--brand-accent)"
                        }`}
                      />
                    </div>
                  </div>
                </div>
              </div>

              {/* Data Columns */}
              <div className="grid md:grid-cols-2 gap-x-8 xl:gap-x-20 gap-y-6 md:gap-y-8">
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
                          ? new Date(`${solicitud.expected_closing}T00:00:00`).toLocaleDateString("es-MX", {
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
          <div className="bg-base-200 rounded-3xl md:rounded-[32px] p-5 sm:p-8 border border-base-content/5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-5">
              <div>
                <h3 className="text-lg font-black uppercase tracking-tight">Cotizaciones</h3>
                <p className="text-xs text-base-content/50">Historial directo de esta oportunidad</p>
              </div>
              <Link href={`/solicitud/${encodeURIComponent(id)}/cotizacion`} className="btn-brand inline-flex items-center justify-center w-full sm:w-auto px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest">Nueva cotización</Link>
            </div>
            {quotations.length === 0 ? (
              <p className="text-sm text-base-content/45">Todavía no hay cotizaciones.</p>
            ) : (
              <div className="divide-y divide-base-content/5">
                {quotations.map((quote) => (
                  <Link key={quote.id} href={`/solicitud/${encodeURIComponent(id)}/cotizacion?quotation=${quote.id}`} className="flex items-center justify-between gap-4 py-4 min-h-11 hover:text-primary">
                    <span className="min-w-0"><strong className="mr-3 break-all">{quote.name}</strong><span className="text-xs text-base-content/45">{quote.state}</span></span>
                    <span className="font-bold shrink-0">${Number(quote.amount_total || 0).toLocaleString("es-MX", { minimumFractionDigits: 2 })}</span>
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* ─── Notas / Cuestionario ─── */}
          <div className="bg-base-200 rounded-3xl md:rounded-[40px] p-5 sm:p-8 md:p-10 border border-base-content/5 shadow-2xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
              <h3 className="text-[10px] font-black uppercase tracking-[0.4em] text-base-content/50">
                Notas
              </h3>
              <div className="flex flex-col sm:flex-row gap-3">
                {editingNotes ? (
                  <>
                    <button
                      onClick={() => setEditingNotes(false)}
                      disabled={savingNotes}
                      className="btn-cta-tertiary w-full sm:w-auto px-5 py-3 rounded-2xl text-[10px] flex items-center justify-center gap-2"
                    >
                      <X className="w-4 h-4" /> Cancelar
                    </button>
                    <button
                      onClick={saveNotes}
                      disabled={savingNotes}
                      className="btn-cta-secondary w-full sm:w-auto px-5 py-3 rounded-2xl text-[10px] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {savingNotes ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                      Guardar notas
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => {
                        if (solicitud.description) setShowSurveyConfirm(true);
                        else addSurvey();
                      }}
                      disabled={addingSurvey || editing}
                      className="btn-cta-tertiary w-full sm:w-auto px-5 py-3 rounded-2xl text-[10px] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      {addingSurvey ? <Loader2 className="w-4 h-4 animate-spin" /> : <ClipboardList className="w-4 h-4" />}
                      Agregar cuestionario
                    </button>
                    <button
                      onClick={() => {
                        setNotesDraft(solicitud.description || "");
                        setEditingNotes(true);
                      }}
                      disabled={addingSurvey}
                      className="btn-cta-secondary w-full sm:w-auto px-5 py-3 rounded-2xl text-[10px] flex items-center justify-center gap-2 disabled:opacity-50"
                    >
                      <Pencil className="w-4 h-4" /> Editar
                    </button>
                  </>
                )}
              </div>
            </div>
            {editingNotes ? (
              <RichTextEditor value={notesDraft} onChange={setNotesDraft} />
            ) : solicitud.description ? (
              <div
                className="rich-text text-sm"
                // biome-ignore lint/security/noDangerouslySetInnerHtml: HTML sanitizado con DOMPurify
                dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(solicitud.description) }}
              />
            ) : (
              <p className="text-sm text-base-content/50">Sin notas registradas.</p>
            )}
          </div>
        </div>

        {/* TRACKING COLUMN — debajo del contenido hasta xl; en md/lg sus dos
            tarjetas van lado a lado para aprovechar el ancho. */}
        <div className="grid md:grid-cols-2 xl:grid-cols-1 gap-6 md:gap-8 xl:gap-10 items-start">
          {/* Timeline View */}
          <div className="bg-base-200 rounded-3xl md:rounded-[40px] p-5 sm:p-8 xl:p-10 border border-base-content/5 relative overflow-hidden group shadow-2xl">
            <div className="absolute top-0 right-0 w-48 h-48 bg-(--brand-accent)/5 blur-[80px] rounded-full group-hover:bg-(--brand-accent)/10 transition-colors" />

            <div className="flex items-center gap-4 mb-8 xl:mb-12">
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
            <div className="bg-base-200 rounded-3xl md:rounded-[40px] p-5 sm:p-8 xl:p-10 border border-base-content/5 relative overflow-hidden group shadow-2xl transition-all hover:bg-base-300">
              <div className="absolute bottom-0 right-0 w-64 h-64 bg-(--brand-accent)/2 blur-[100px] rounded-full" />

              <div className="flex items-center gap-4 mb-8 xl:mb-12">
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
                          <div className="flex justify-between items-start gap-2 mb-2">
                            <h4 className="text-[11px] font-black text-base-content uppercase truncate min-w-0">
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
                  <Briefcase
                    strokeWidth={1.5}
                    className="w-9 h-9 text-base-content/35 group-hover/crm:text-primary transition-colors relative z-10"
                  />
                </div>

                <div className="flex items-center justify-between gap-4 p-5 md:p-7 rounded-3xl bg-base-content/[0.02] border border-base-content/5">
                  <div>
                    <p className="text-[9px] font-black text-base-content/45 uppercase tracking-widest mb-2">
                      ETAPA ACTUAL CRM
                    </p>
                    <p className="text-xl font-black uppercase tracking-tight text-base-content/90">
                      {solicitud.lead_stage || "PROSPECCIÓN"}
                    </p>
                  </div>
                  <Tag className="w-9 h-9 text-base-content/35" strokeWidth={1.5} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
