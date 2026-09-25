"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  MapPin,
  Wifi,
  Building2,
  ArrowLeft,
  ArrowRight,
  Shield,
  Zap,
  Phone,
  Mail,
  User,
  FileText,
  ChevronDown,
  Loader2,
  CheckCircle,
  LayoutGrid,
  Search,
  Tag,
  Compass,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "../../../lib/api";
import { parseLatLng, geocodeCityState } from "../../../lib/geo";
import MapPicker from "../../../components/ui/MapPicker";
import SmartSelector from "../../../components/ui/SmartSelector";

const steps = [
  { label: "Ubicación", icon: MapPin },
  { label: "Plan", icon: Wifi },
  { label: "Negocio", icon: Building2 },
  { label: "Resumen", icon: FileText },
  { label: "Confirmación", icon: CheckCircle },
];

const ESTADOS_MX = [
  "Aguascalientes",
  "Baja California",
  "Baja California Sur",
  "Campeche",
  "Chiapas",
  "Chihuahua",
  "Ciudad de México",
  "Coahuila",
  "Colima",
  "Durango",
  "Guanajuato",
  "Guerrero",
  "Hidalgo",
  "Jalisco",
  "Estado de México",
  "Michoacán",
  "Morelos",
  "Nayarit",
  "Nuevo León",
  "Oaxaca",
  "Puebla",
  "Querétaro",
  "Quintana Roo",
  "San Luis Potosí",
  "Sinaloa",
  "Sonora",
  "Tabasco",
  "Tamaulipas",
  "Tlaxcala",
  "Veracruz",
  "Yucatán",
  "Zacatecas",
];

// ─── Reusable Input ──
function FormInput({
  label,
  name,
  type = "text",
  placeholder,
  icon: Icon,
  value,
  onChange,
  error,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  icon?: any;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
}) {
  return (
    <div className="space-y-2 group">
      <label className="text-[10px] font-black text-base-content/50 ml-1 uppercase tracking-[0.2em] group-focus-within:text-[var(--brand-accent)] transition-colors">
        {label} <span className="text-[var(--brand-accent)]">*</span>
      </label>
      <div className="relative">
        <input
          type={type}
          name={name}
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={`w-full bg-base-200 border rounded-2xl px-5 py-4 text-sm
            focus:outline-none focus:border-[var(--brand-accent)]/50 focus:bg-base-300
            transition-all duration-300 placeholder:text-base-content/45 text-base-content font-medium
            ${error ? "border-error/40" : "border-base-content/[0.05] hover:border-base-content/[0.12]"}`}
        />
        {Icon && (
          <Icon className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/45 group-focus-within:text-[var(--brand-accent)] group-focus-within:opacity-50 transition-all duration-300 pointer-events-none" />
        )}
      </div>
      {error && (
        <p className="text-error text-[10px] font-bold uppercase tracking-widest ml-1 flex items-center gap-1.5 animate-in fade-in slide-in-from-left-2 transition-all">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-error shadow-[0_0_8px_color-mix(in_oklch,var(--color-error)_50%,transparent)]" />
          {error}
        </p>
      )}
    </div>
  );
}

export default function NuevaSolicitudPage() {
  const router = useRouter();
  const [currentStep, setCurrentStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [formData, setFormData] = useState({
    business_name: "",
    rfc: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    city: "",
    state: "",
    lead_lat: null as number | null,
    lead_lng: null as number | null,
    product_id: "" as number | "",
    plan_speed: "",
    plan_price: 0,
  });
  const [response, setResponse] = useState<any>(null);
  const [rfcCheck, setRfcCheck] = useState<{
    checking: boolean;
    checked: boolean;
    partner: any | null;
  }>({ checking: false, checked: false, partner: null });

  const [products, setProducts] = useState<
    { id: number; name: string; price: number }[]
  >([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  useEffect(() => {
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
    fetchProducts();
  }, []);

  // Geolocalización del Step 1: al completar Estado + Ciudad, centramos el
  // mapa ahí automáticamente (geocoding vía Nominatim/OSM). En cuanto el
  // usuario interactúa manualmente con el mapa (clic, arrastre, pegar link,
  // o escribir LAT/LNG) dejamos de sobreescribir su selección exacta.
  const [geocoding, setGeocoding] = useState(false);
  const manualPinRef = useRef(false);

  useEffect(() => {
    if (manualPinRef.current) return;
    const city = formData.city.trim();
    const state = formData.state.trim();
    if (!city || !state) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(async () => {
      setGeocoding(true);
      const coords = await geocodeCityState(city, state, controller.signal);
      if (coords && !manualPinRef.current) {
        setFormData((prev) => ({
          ...prev,
          lead_lat: coords[0],
          lead_lng: coords[1],
        }));
      }
      setGeocoding(false);
    }, 700);

    return () => {
      controller.abort();
      clearTimeout(timeoutId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [formData.city, formData.state]);

  const nextStep = () => setCurrentStep((prev) => Math.min(prev + 1, 5));
  const prevStep = () => setCurrentStep((prev) => Math.max(prev - 1, 1));

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>,
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors({ ...errors, [name]: "" });
    }
    if (name === "rfc") {
      setRfcCheck({ ...rfcCheck, checked: false, partner: null });
    }
  };

  const handleSelectProduct = (opt: { id: number | string; name: string } | null) => {
    const product = products.find((p) => p.id === opt?.id);
    setFormData((prev) => ({
      ...prev,
      product_id: opt ? Number(opt.id) : "",
      plan_speed: opt ? opt.name : "",
      plan_price: product ? product.price : 0,
    }));
  };

  const verifyRFC = async () => {
    const rfc = formData.rfc.trim().toUpperCase();
    if (!rfc) return;

    setIsLoading(true);
    setRfcCheck({ checking: true, checked: false, partner: null });
    try {
      const data = await apiFetch(
        `/solicitudes/check_rfc?rfc=${encodeURIComponent(rfc)}`,
      );
      setRfcCheck({
        checking: false,
        checked: true,
        partner: data.partner,
      });
      if (data.partner) {
        setFormData((prev) => ({ ...prev, business_name: data.partner.name }));
      }
    } catch {
      setRfcCheck({ checking: false, checked: true, partner: null });
    } finally {
      setIsLoading(false);
    }
  };

  const goNext = async () => {
    if (currentStep === 1) {
      if (!formData.city.trim() || !formData.state.trim()) {
        setErrors({
          city: !formData.city.trim() ? "Ciudad es obligatoria" : "",
          state: !formData.state.trim() ? "Estado es obligatorio" : "",
        });
        return;
      }
    }
    if (currentStep === 2 && !formData.product_id) return;
    if (currentStep === 3) {
      if (
        !formData.rfc.trim() ||
        !formData.business_name.trim() ||
        !formData.contact_name.trim() ||
        !formData.contact_email.trim() ||
        !formData.contact_phone.trim()
      ) {
        setErrors({
          rfc: !formData.rfc.trim() ? "RFC es obligatorio" : "",
          business_name: !formData.business_name.trim()
            ? "Razón social es obligatoria"
            : "",
          contact_name: !formData.contact_name.trim()
            ? "Nombre es obligatorio"
            : "",
          contact_email: !formData.contact_email.trim()
            ? "Email es obligatorio"
            : "",
          contact_phone: !formData.contact_phone.trim()
            ? "Teléfono es obligatorio"
            : "",
        });
        return;
      }
    }
    nextStep();
  };

  const submitFull = async () => {
    setIsLoading(true);
    try {
      const data = await apiFetch("/solicitudes", {
        method: "POST",
        company: true,
        body: {
          ...formData,
          product_id: formData.product_id || undefined,
        },
      });
      // Siguiente paso: capturar requisitos de pre-venta (sitio/contacto/cierre)
      if (data?.lead_id) {
        router.push(`/solicitud/${data.lead_id}?setup=1`);
        return;
      }
      setResponse(data);
      setCurrentStep(5);
    } catch (error: any) {
      alert(error.message || "Error al intentar crear la solicitud.");
    } finally {
      setIsLoading(false);
    }
  };

  const submitOpportunityOnly = async () => {
    if (!rfcCheck.partner) return;
    setIsLoading(true);
    try {
      const data = await apiFetch("/solicitudes/opportunity", {
        method: "POST",
        company: true,
        body: {
          partner_id: rfcCheck.partner.id,
          business_name: rfcCheck.partner.name,
          product_id: formData.product_id || undefined,
          plan_speed: formData.plan_speed,
          plan_price: formData.plan_price,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          city: formData.city,
          state: formData.state,
          rfc: formData.rfc,
          lead_lat: formData.lead_lat ?? undefined,
          lead_lng: formData.lead_lng ?? undefined,
        },
      });
      // Siguiente paso: capturar requisitos de pre-venta (sitio/contacto/cierre)
      if (data?.lead_id) {
        router.push(`/solicitud/${data.lead_id}?setup=1`);
        return;
      }
      setResponse({ ...data, opportunityOnly: true });
      setCurrentStep(5);
    } catch (error: any) {
      alert(error.message || "Error al crear la oportunidad.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="max-w-6xl mx-auto py-12 px-4 text-base-content animate-fade-in">
      {/* Header Area */}
      <div className="mb-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-12 gap-6">
          <div className="relative pl-6">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--brand-accent)] rounded-full shadow-[0_0_15px_var(--brand-accent-glow)]" />
            <Link
              href="/dashboard"
              className="text-base-content/50 hover:text-[var(--brand-accent)] text-[10px] font-black uppercase tracking-[0.25em] mb-3 inline-flex items-center gap-2 transition-all duration-300"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <h1 className="text-3xl sm:text-4xl md:text-5xl font-black text-base-content uppercase tracking-tighter leading-tight sm:leading-none mb-1">
              NUEVA SOLICITUD
            </h1>
            <p className="text-base-content/60 text-xs font-medium uppercase tracking-[0.1em]">
              Servicio de Internet Dedicado Empresarial SIDE
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-base-content/50 bg-base-content/[0.03] border border-base-content/[0.05] px-5 py-3 rounded-2xl shadow-xl">
            <Shield className="w-4 h-4 text-[var(--brand-accent)] opacity-50" />{" "}
            Secure Protocol
          </div>
        </div>

        {/* Stepper Area */}
        <div className="relative pt-4 px-2">
          <div className="absolute top-8 left-0 right-0 h-0.5 bg-base-content/[0.04] rounded-full" />
          <div
            className="absolute top-8 left-0 h-0.5 bg-[var(--brand-accent)] rounded-full transition-all duration-700 ease-out shadow-[0_0_10px_var(--brand-accent-glow)]"
            style={{
              width: `${((currentStep - 1) / (steps.length - 1)) * 100}%`,
            }}
          />

          {/* `grid grid-cols-5` en vez de `flex justify-between`: fuerza
              columnas de ancho IGUAL. Con flex, cada "columna" media según
              su contenido (el label más largo, "Confirmación", mide más de
              lo que le toca en un reparto de 375px/5 ≈ 65px), así que los
              labels vecinos se traslapaban en mobile. Los labels individuales
              además se ocultan por debajo de `sm:` (aparecen solo desde
              tablet en adelante, donde sí hay espacio) — en mobile se
              reemplazan por un único caption centrado debajo de todo el
              stepper (ver más abajo). */}
          <div className="relative grid grid-cols-5 items-center w-full">
            {steps.map((step, index) => {
              const stepNum = index + 1;
              const isActive = stepNum === currentStep;
              const isCompleted = stepNum < currentStep;
              const StepIcon = step.icon;

              return (
                <div
                  key={stepNum}
                  className="flex flex-col items-center gap-2 sm:gap-4 group"
                >
                  <div
                    className={`w-8 h-8 sm:w-10 sm:h-10 rounded-xl flex items-center justify-center transition-all duration-500 relative z-10
                      ${isActive ? "bg-[var(--brand-accent)] text-primary-content scale-110 sm:scale-125 shadow-[0_0_25px_var(--brand-accent-glow)] rotate-3" : ""}
                      ${isCompleted ? "bg-base-200 text-[var(--brand-accent)] border border-[var(--brand-accent)]/30" : ""}
                      ${!isActive && !isCompleted ? "bg-base-200 border border-base-content/[0.05] text-base-content/45" : ""}
                    `}
                  >
                    {isCompleted ? (
                      <Check className="w-4 h-4 sm:w-5 sm:h-5" />
                    ) : (
                      <StepIcon
                        className={`w-4 h-4 sm:w-5 sm:h-5 ${isActive ? "animate-pulse" : ""}`}
                      />
                    )}
                  </div>
                  <span
                    className={`hidden sm:block text-[9px] font-black uppercase tracking-widest transition-all duration-500
                      ${isActive ? "text-base-content translate-y-1" : isCompleted ? "text-base-content/65" : "text-base-content/45"}
                    `}
                  >
                    {step.label}
                  </span>
                </div>
              );
            })}
          </div>

          {/* Caption solo mobile — reemplaza los labels individuales
              ocultados arriba, sin competir por espacio horizontal. */}
          <p className="sm:hidden text-center mt-4 text-[10px] font-black uppercase tracking-widest text-base-content/60">
            Paso {currentStep} de {steps.length} · {steps[currentStep - 1].label}
          </p>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="bg-base-200 rounded-3xl p-5 sm:p-8 md:p-10 min-h-[520px] border border-base-content/[0.04] relative overflow-hidden shadow-2xl animate-slide-in-up">
        <div
          className="absolute inset-0 opacity-[0.02] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 2px 2px, var(--color-base-content) 1px, transparent 0)",
            backgroundSize: "32px 32px",
          }}
        />

        {/* STEP 1: Ubicación */}
        {currentStep === 1 && (
          <div className="max-w-xl mx-auto space-y-8 pt-8 relative animate-fade-in">
            <div className="text-center mb-10">
              <div className="relative w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 flex items-center justify-center group">
                <div className="absolute inset-0 bg-[var(--brand-accent)]/10 blur-2xl rounded-full" />
                <MapPin
                  strokeWidth={1.5}
                  className="relative w-8 h-8 sm:w-11 sm:h-11 text-[var(--brand-accent)] transition-all duration-500 group-hover:scale-110 group-hover:rotate-6"
                />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-3 uppercase tracking-tighter text-base-content">
                UBICACIÓN
              </h2>
              <p className="text-base-content/60 text-[10px] font-black uppercase tracking-[0.2em] max-w-sm mx-auto">
                Selecciona la zona de instalación.
              </p>
            </div>
            <div className="space-y-6">
              <div className="space-y-2 group">
                <label className="text-[10px] font-black text-base-content/50 ml-1 uppercase tracking-[0.2em] group-focus-within:text-[var(--brand-accent)]">
                  ESTADO *
                </label>
                <div className="relative">
                  <select
                    name="state"
                    value={formData.state}
                    onChange={handleChange}
                    className={`w-full bg-base-200 border rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--brand-accent)]/50 transition-all appearance-none cursor-pointer text-base-content font-medium
                        ${errors.state ? "border-error/40" : "border-base-content/[0.05] hover:border-base-content/[0.12]"}`}
                  >
                    <option value="">Selecciona un estado...</option>
                    {ESTADOS_MX.map((state) => (
                      <option key={state} value={state}>
                        {state}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/45 pointer-events-none group-focus-within:text-[var(--brand-accent)]" />
                </div>
              </div>
              <FormInput
                label="CIUDAD"
                name="city"
                placeholder="Ej: Monterrey"
                icon={MapPin}
                value={formData.city}
                onChange={handleChange}
                error={errors.city}
              />
            </div>

            {/* Geolocalización (opcional) — mismo componente que usa el
                modal de edición de solicitudes existentes. El mapa se centra
                solo en Estado/Ciudad; el usuario afina el punto exacto con
                un clic o arrastrando el pin. */}
            <div className="space-y-4">
              <p className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.2em] flex items-center gap-2 ml-1">
                <Compass className="w-3 h-3" /> UBICACIÓN EXACTA (OPCIONAL)
              </p>
              <input
                type="text"
                placeholder="Pega aquí el link de Google Maps…"
                onChange={(e) => {
                  const c = parseLatLng(e.target.value);
                  if (c) {
                    manualPinRef.current = true;
                    setFormData((prev) => ({ ...prev, lead_lat: c[0], lead_lng: c[1] }));
                  }
                }}
                className="w-full bg-base-200 border border-base-content/[0.05] rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--brand-accent)]/50 transition-all text-base-content font-medium placeholder:text-base-content/45"
              />
              <MapPicker
                lat={formData.lead_lat}
                lng={formData.lead_lng}
                onChange={(la, ln) => {
                  manualPinRef.current = true;
                  setFormData((prev) => ({ ...prev, lead_lat: la, lead_lng: ln }));
                }}
              />
              <p className="text-[9px] font-bold uppercase tracking-widest text-base-content/40 flex items-center gap-1.5 ml-1">
                {geocoding ? (
                  <>
                    <Loader2 className="w-3 h-3 animate-spin" /> Buscando
                    coordenadas de {formData.city}, {formData.state}…
                  </>
                ) : manualPinRef.current ? (
                  <>
                    <Check className="w-3 h-3 text-[var(--brand-accent)]" />{" "}
                    Ubicación exacta confirmada
                  </>
                ) : formData.lead_lat != null ? (
                  "Ubicación aproximada — haz clic en el mapa para precisarla"
                ) : (
                  "Selecciona Estado y Ciudad para centrar el mapa"
                )}
              </p>
              <div className="grid grid-cols-2 gap-4">
                <input
                  type="number"
                  step="any"
                  placeholder="LAT"
                  value={formData.lead_lat ?? ""}
                  onChange={(e) => {
                    manualPinRef.current = true;
                    setFormData((prev) => ({
                      ...prev,
                      lead_lat:
                        e.target.value === "" ? null : parseFloat(e.target.value),
                    }));
                  }}
                  className="w-full bg-base-200 border border-base-content/[0.05] rounded-2xl px-5 py-4 text-sm font-mono focus:outline-none focus:border-[var(--brand-accent)]/50 transition-all text-base-content"
                />
                <input
                  type="number"
                  step="any"
                  placeholder="LNG"
                  value={formData.lead_lng ?? ""}
                  onChange={(e) => {
                    manualPinRef.current = true;
                    setFormData((prev) => ({
                      ...prev,
                      lead_lng:
                        e.target.value === "" ? null : parseFloat(e.target.value),
                    }));
                  }}
                  className="w-full bg-base-200 border border-base-content/[0.05] rounded-2xl px-5 py-4 text-sm font-mono focus:outline-none focus:border-[var(--brand-accent)]/50 transition-all text-base-content"
                />
              </div>
            </div>

            <button
              onClick={goNext}
              className="w-full btn-brand py-5 rounded-2xl transition-all duration-300 mt-10 flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-xs shadow-xl group"
            >
              Continuar{" "}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1" />
            </button>
          </div>
        )}

        {/* STEP 2: Plan */}
        {currentStep === 2 && (
          <div className="max-w-2xl mx-auto space-y-10 relative py-4 animate-fade-in">
            <div className="text-center mb-10">
              <div className="relative w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                <div className="absolute inset-0 bg-[var(--brand-accent)]/10 blur-2xl rounded-full" />
                <Wifi strokeWidth={1.5} className="relative w-8 h-8 sm:w-11 sm:h-11 text-[var(--brand-accent)]" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-3 uppercase tracking-tighter">
                SELECCIONA TU PLAN
              </h2>
              <p className="text-base-content/60 text-[10px] font-black uppercase tracking-[0.25em]">
                Confirmado para {formData.city}, {formData.state}
              </p>
            </div>

            {/* Selector real de producto Odoo — mismo componente y mismo
                endpoint (filtrado por "Accede a portal") que usa el modal
                de edición de solicitudes existentes. */}
            <SmartSelector
              label="PRODUCTO / PLAN"
              placeholder={loadingProducts ? "Cargando planes..." : "Buscar plan..."}
              icon={Tag}
              options={products.map((p) => ({
                id: p.id,
                name: p.name,
                extra: `$${p.price.toLocaleString()}`,
              }))}
              selectedId={formData.product_id}
              onSelect={handleSelectProduct}
            />

            {formData.product_id && (
              <div className="bg-base-200 border border-[var(--brand-accent)]/20 rounded-3xl p-5 sm:p-8 flex flex-col sm:flex-row sm:items-end justify-between gap-3 animate-in fade-in slide-in-from-top-4">
                <div className="min-w-0">
                  <p className="text-[10px] font-black text-base-content/50 uppercase tracking-widest mb-2">
                    Plan seleccionado
                  </p>
                  <h3 className="text-lg sm:text-xl md:text-2xl font-black uppercase tracking-tight break-words">
                    {formData.plan_speed}
                  </h3>
                </div>
                <div className="text-left sm:text-right shrink-0">
                  <span className="text-2xl sm:text-3xl md:text-4xl font-black text-base-content">
                    ${formData.plan_price.toLocaleString()}
                  </span>
                  <span className="text-base-content/50 text-[10px] uppercase font-black tracking-widest pb-1 ml-1">
                    /mes
                  </span>
                </div>
              </div>
            )}

            <div className="flex flex-wrap justify-between items-center gap-4 pt-10 border-t border-base-content/[0.03]">
              <button
                onClick={prevStep}
                className="flex items-center gap-2 text-base-content/50 hover:text-base-content text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Volver
              </button>
              <button
                onClick={goNext}
                disabled={!formData.product_id}
                className="btn-brand px-6 sm:px-10 py-4 rounded-xl disabled:opacity-20 text-xs font-black uppercase tracking-widest shadow-xl transition-all"
              >
                Continuar <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Negocio */}
        {currentStep === 3 && (
          <div className="max-w-4xl mx-auto space-y-12 relative py-4 animate-fade-in">
            <div className="text-center mb-10">
              <div className="relative w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 flex items-center justify-center group">
                <div className="absolute inset-0 bg-[var(--brand-accent)]/10 blur-2xl rounded-full" />
                <User
                  strokeWidth={1.5}
                  className="relative w-8 h-8 sm:w-11 sm:h-11 text-[var(--brand-accent)] transition-transform duration-500 group-hover:rotate-12"
                />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-3 uppercase tracking-tighter">
                DATOS DE NEGOCIO
              </h2>
              <p className="text-base-content/60 text-[10px] font-black uppercase tracking-[0.25em]">
                Información fiscal y contacto.
              </p>
            </div>

            <div className="grid md:grid-cols-2 gap-10">
              <div className="space-y-6">
                <div className="flex items-center gap-2.5 mb-2">
                  <Building2 className="w-5 h-5 text-[var(--brand-accent)]" strokeWidth={1.75} />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-base-content/65">
                    Datos Fiscales
                  </h3>
                </div>
                <div className="space-y-4">
                  <div className="space-y-2 group">
                    <label className="text-[10px] font-black text-base-content/50 ml-1 uppercase tracking-[0.2em] group-focus-within:text-[var(--brand-accent)]">
                      RFC *
                    </label>
                    <div className="relative flex gap-3">
                      <div className="relative flex-1">
                        <input
                          type="text"
                          name="rfc"
                          value={formData.rfc}
                          onChange={handleChange}
                          placeholder="XAXX010101000"
                          className={`w-full bg-base-200 border rounded-2xl px-5 py-4 text-sm focus:border-[var(--brand-accent)]/50 transition-all text-base-content font-medium
                          ${errors.rfc ? "border-error/40" : "border-base-content/[0.05]"}`}
                        />
                        <Search className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/45" />
                      </div>
                      <button
                        onClick={verifyRFC}
                        disabled={isLoading || !formData.rfc}
                        className="btn-brand px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest disabled:opacity-20 transition-all"
                      >
                        {isLoading ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          "Validar"
                        )}
                      </button>
                    </div>
                  </div>
                  {rfcCheck.checked && !rfcCheck.partner && (
                    <FormInput
                      label="RAZÓN SOCIAL"
                      name="business_name"
                      placeholder="Empresa S.A. de C.V."
                      icon={Building2}
                      value={formData.business_name}
                      onChange={handleChange}
                      error={errors.business_name}
                    />
                  )}
                  {rfcCheck.partner && (
                    <div className="bg-base-200 border border-[var(--brand-accent)]/20 p-6 rounded-2xl animate-in slide-in-from-top-4 backdrop-blur-md">
                      <div className="flex items-center gap-3 mb-2">
                        <CheckCircle className="w-5 h-5 text-[var(--brand-accent)]" />
                        <span className="text-[10px] font-black uppercase tracking-widest text-[var(--brand-accent)]">
                          Cliente Registrado
                        </span>
                      </div>
                      <p className="text-base-content font-black text-lg uppercase tracking-tight">
                        {rfcCheck.partner.name}
                      </p>
                    </div>
                  )}
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-2.5 mb-2">
                  <User className="w-5 h-5 text-[var(--brand-accent)]" strokeWidth={1.75} />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-base-content/65">
                    Contacto Directo
                  </h3>
                </div>
                <FormInput
                  label="NOMBRE"
                  name="contact_name"
                  placeholder="Ej: Juan Pérez"
                  icon={User}
                  value={formData.contact_name}
                  onChange={handleChange}
                  error={errors.contact_name}
                />
                <FormInput
                  label="EMAIL"
                  name="contact_email"
                  type="email"
                  placeholder="juan@empresa.com"
                  icon={Mail}
                  value={formData.contact_email}
                  onChange={handleChange}
                  error={errors.contact_email}
                />
                <FormInput
                  label="TELÉFONO"
                  name="contact_phone"
                  placeholder="10 dígitos"
                  icon={Phone}
                  value={formData.contact_phone}
                  onChange={handleChange}
                  error={errors.contact_phone}
                />
              </div>
            </div>
            <div className="flex flex-wrap justify-between items-center gap-4 pt-10 border-t border-base-content/[0.03]">
              <button
                onClick={prevStep}
                className="flex items-center gap-2 text-base-content/50 hover:text-base-content text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Volver
              </button>
              <button
                onClick={goNext}
                className="btn-brand px-7 sm:px-12 py-4 sm:py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-[0_20px_40px_var(--brand-accent-glow)] transition-all flex items-center gap-3"
              >
                Continuar <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Resumen */}
        {currentStep === 4 && (
          <div className="max-w-4xl mx-auto space-y-10 relative py-4 animate-fade-in">
            <div className="text-center mb-10">
              <div className="relative w-14 h-14 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 flex items-center justify-center">
                <div className="absolute inset-0 bg-[var(--brand-accent)]/10 blur-2xl rounded-full" />
                <FileText strokeWidth={1.5} className="relative w-8 h-8 sm:w-11 sm:h-11 text-[var(--brand-accent)]" />
              </div>
              <h2 className="text-xl sm:text-2xl md:text-3xl font-black mb-3 uppercase tracking-tighter">
                RESUMEN
              </h2>
              <p className="text-base-content/60 text-[10px] font-black uppercase tracking-[0.25em]">
                Confirma los detalles antes de enviar.
              </p>
            </div>
            <div className="grid md:grid-cols-2 gap-6">
              {[
                {
                  label: "Servicio",
                  title: formData.plan_speed || "Plan Dedicado SIDE",
                  value: `$${formData.plan_price.toLocaleString()} / mes`,
                  icon: Wifi,
                },
                {
                  label: "Ubicación",
                  title: `${formData.city}, ${formData.state}`,
                  value: "Instalación en Sitio",
                  icon: MapPin,
                },
                {
                  label: "Empresa",
                  title: formData.business_name,
                  value: `RFC: ${formData.rfc}`,
                  icon: Building2,
                },
                {
                  label: "Contacto",
                  title: formData.contact_name,
                  value: formData.contact_email,
                  icon: User,
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-base-200 border border-base-content/[0.04] rounded-3xl p-8 group hover:border-[var(--brand-accent)]/30 transition-all duration-500"
                >
                  <div className="flex items-start gap-4">
                    <item.icon className="w-7 h-7 text-[var(--brand-accent)] shrink-0" strokeWidth={1.75} />
                    <div>
                      <p className="text-[10px] font-black uppercase tracking-widest text-base-content/50 mb-2">
                        {item.label}
                      </p>
                      <h4 className="text-lg font-black uppercase tracking-tight text-base-content mb-1">
                        {item.title}
                      </h4>
                      <p className="text-base-content/65 text-xs font-medium">
                        {item.value}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
            <div className="bg-base-200 border border-base-content/[0.04] rounded-3xl p-5 sm:p-8 md:p-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8 relative overflow-hidden">
              <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--brand-accent)]" />
              <div>
                <h4 className="text-base-content/50 text-[10px] font-black uppercase tracking-[0.3em] mb-2">
                  Inversión Mensual
                </h4>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl sm:text-4xl md:text-5xl font-black text-base-content">
                    ${formData.plan_price.toLocaleString()}
                  </span>
                  <span className="text-base-content/50 text-xs font-black uppercase tracking-widest pb-1">
                    MXN / MES
                  </span>
                </div>
              </div>
              <div className="flex flex-col gap-3 w-full md:w-auto">
                <button
                  onClick={
                    rfcCheck.partner ? submitOpportunityOnly : submitFull
                  }
                  disabled={isLoading}
                  className="btn-brand px-7 sm:px-12 py-4 sm:py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-[0_20px_40px_var(--brand-accent-glow)] transition-all flex items-center justify-center gap-3"
                >
                  {isLoading ? (
                    <Loader2 className="w-5 h-5 animate-spin" />
                  ) : (
                    <>
                      Enviar Solicitud <ArrowRight className="w-5 h-5" />
                    </>
                  )}
                </button>
              </div>
            </div>
            <button
              onClick={prevStep}
              className="mx-auto flex items-center gap-2 text-base-content/50 hover:text-base-content text-[10px] font-black uppercase tracking-widest transition-all"
            >
              <ArrowLeft className="w-4 h-4" /> Modificar Datos
            </button>
          </div>
        )}

        {/* STEP 5: Confirmación */}
        {currentStep === 5 && (
          <div className="max-w-2xl mx-auto space-y-10 relative animate-slide-in-up py-16 text-center">
            <div className="relative inline-block">
              <div className="relative z-10 w-20 h-20 sm:w-24 sm:h-24 md:w-32 md:h-32 bg-[var(--brand-accent)] text-primary-content rounded-[32px] md:rounded-[40px] flex items-center justify-center mx-auto mb-6 sm:mb-10 shadow-[0_0_60px_var(--brand-accent-glow)] rotate-6">
                <CheckCircle className="w-10 h-10 sm:w-12 sm:h-12 md:w-16 md:h-16" />
              </div>
              <div className="absolute inset-0 bg-[var(--brand-accent)]/20 blur-3xl rounded-full scale-150 animate-pulse" />
            </div>
            <div>
              <h2 className="text-3xl sm:text-4xl md:text-5xl font-black mb-4 uppercase tracking-tighter leading-tight sm:leading-none">
                ¡ENVIADO!
              </h2>
              <div className="h-1 w-20 bg-[var(--brand-accent)] mx-auto rounded-full mb-8 shadow-[0_0_15px_var(--brand-accent-glow)]" />
              <p className="text-base-content font-medium text-base sm:text-lg max-w-md mx-auto">
                Tu solicitud ha sido recibida. Un ejecutivo senior se pondrá en
                contacto contigo en breve.
              </p>
            </div>
            <div className="bg-base-content/[0.02] border border-base-content/[0.05] rounded-3xl p-6 sm:p-8 max-w-md mx-auto">
              <p className="text-[10px] font-black text-base-content/50 uppercase tracking-[0.3em] mb-4">
                Folio de Seguimiento
              </p>
              <div className="text-lg sm:text-xl md:text-2xl font-black text-base-content tracking-[0.05em] sm:tracking-[0.1em] mb-2 font-mono break-all">
                #{response?.opportunity_id || response?.id || "SIDE-092"}
              </div>
            </div>
            <div className="pt-8">
              <Link
                href="/dashboard"
                className="btn-brand px-7 sm:px-12 py-4 sm:py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-[0_20px_40px_var(--brand-accent-glow)] transition-all inline-flex items-center gap-3"
              >
                Finalizar y Volver <LayoutGrid className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
