"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Check,
  MapPin,
  Wifi,
  Building2,
  ArrowLeft,
  ArrowRight,
  Shield,
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
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "../../../lib/api";
import { mapPortalProduct, type PortalProduct, productOption } from "../../../lib/products";
import SmartSelector from "../../../components/ui/SmartSelector";

const steps = [
  { label: "Ubicación", icon: MapPin },
  { label: "Plan", icon: Wifi },
  { label: "Negocio", icon: Building2 },
  { label: "Resumen", icon: FileText },
  { label: "Confirmación", icon: CheckCircle },
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
  required = true,
}: {
  label: string;
  name: string;
  type?: string;
  placeholder: string;
  icon?: any;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  error?: string;
  required?: boolean;
}) {
  return (
    <div className="space-y-2 group">
      <label className="text-[10px] font-black text-base-content/50 ml-1 uppercase tracking-[0.2em] group-focus-within:text-[var(--brand-accent)] transition-colors">
        {label} {required && <span className="text-[var(--brand-accent)]">*</span>}
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
    person_type: "moral" as "fisica" | "moral",
    regimen_societario_id: "" as number | "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    city: "",
    state: "",
    city_id: "" as number | "",
    state_id: "" as number | "",
    expected_closing: "",
    product_id: "" as number | "",
    plan_speed: "",
    plan_price: 0,
  });
  const [response, setResponse] = useState<any>(null);
  const [customerResults, setCustomerResults] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
  const [customerSearching, setCustomerSearching] = useState(false);
  // Contactos hijo del cliente existente, para elegir uno en "Contacto
  // Directo" en vez de crear siempre uno nuevo (QA v0.9.1 punto 3).
  const [customerContacts, setCustomerContacts] = useState<
    { id: number; name: string; email: string; phone: string }[]
  >([]);
  const [selectedContactId, setSelectedContactId] = useState<number | null>(null);

  const [products, setProducts] = useState<PortalProduct[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(false);

  // Catálogos reales de Odoo (`res.country.state` / `res.city`) para el
  // paso "Ubicación" — reemplaza el array hardcodeado de estados y el
  // input de texto libre para ciudad (QA v0.9 punto 1).
  const [states, setStates] = useState<{ id: number; name: string }[]>([]);
  const [cities, setCities] = useState<{ id: number; name: string }[]>([]);
  const [loadingCities, setLoadingCities] = useState(false);

  // Catálogo de Régimen Capital (`res.partner.regimen`, odoo/action-2914)
  // — solo se usa cuando la Razón Social es Persona Moral (QA v0.9 punto 2).
  const [regimenes, setRegimenes] = useState<{ id: number; name: string; full_name: string }[]>([]);

  useEffect(() => {
    apiFetch("/states", { company: true })
      .then((res) => setStates(Array.isArray(res?.states) ? res.states : []))
      .catch((err) => console.error("Error fetching states", err));
    apiFetch("/regimenes", { company: true })
      .then((res) => setRegimenes(Array.isArray(res?.regimenes) ? res.regimenes : []))
      .catch((err) => console.error("Error fetching regimenes", err));
  }, []);

  useEffect(() => {
    if (!formData.state_id) {
      setCities([]);
      return;
    }
    setLoadingCities(true);
    apiFetch("/cities", {
      method: "POST",
      company: true,
      body: { state_id: formData.state_id },
    })
      .then((res) => setCities(Array.isArray(res?.cities) ? res.cities : []))
      .catch((err) => console.error("Error fetching cities", err))
      .finally(() => setLoadingCities(false));
  }, [formData.state_id]);

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
            ? res.products.map(mapPortalProduct)
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

  useEffect(() => {
    const query = (formData.business_name || formData.rfc).trim();
    if (query.length < 2) {
      setCustomerResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setCustomerSearching(true);
      try {
        const result = await apiFetch("/customers", {
          method: "POST",
          company: true,
          body: { search: query, limit: 10 },
        });
        setCustomerResults(Array.isArray(result?.customers) ? result.customers : []);
      } catch {
        setCustomerResults([]);
      } finally {
        setCustomerSearching(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [formData.business_name, formData.rfc]);

  useEffect(() => {
    setCustomerContacts([]);
    setSelectedContactId(null);
    if (!selectedCustomer?.id) return;
    let active = true;
    apiFetch(`/customers/${selectedCustomer.id}/contacts`, {
      method: "POST",
      company: true,
    })
      .then((res) => {
        if (active) setCustomerContacts(Array.isArray(res?.contacts) ? res.contacts : []);
      })
      .catch((err) => console.error("Error fetching contacts", err));
    return () => {
      active = false;
    };
  }, [selectedCustomer?.id]);

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
    if (name === "rfc" || name === "business_name") {
      setSelectedCustomer(null);
    }
    // Editar el nombre a mano significa que es un contacto distinto.
    if (name === "contact_name") {
      setSelectedContactId(null);
    }
  };

  const handleSelectProduct = (opt: { id: number | string; name: string } | null) => {
    const product = products.find((p) => p.id === opt?.id);
    setFormData((prev) => ({
      ...prev,
      product_id: opt ? Number(opt.id) : "",
      plan_speed: product ? product.name : "",
      plan_price: product ? product.price : 0,
    }));
  };

  const goNext = async () => {
    if (currentStep === 1) {
      if (!formData.state_id || !formData.city_id) {
        setErrors({
          city: !formData.city_id ? "Ciudad es obligatoria" : "",
          state: !formData.state_id ? "Estado es obligatorio" : "",
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
    if (!selectedCustomer) return;
    setIsLoading(true);
    try {
      const data = await apiFetch("/solicitudes/opportunity", {
        method: "POST",
        company: true,
        body: {
          partner_id: selectedCustomer.id,
          business_name: selectedCustomer.name,
          contact_id: selectedContactId || undefined,
          product_id: formData.product_id || undefined,
          plan_speed: formData.plan_speed,
          plan_price: formData.plan_price,
          contact_name: formData.contact_name,
          contact_email: formData.contact_email,
          contact_phone: formData.contact_phone,
          city: formData.city,
          state: formData.state,
          rfc: formData.rfc,
          expected_closing: formData.expected_closing || undefined,
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
    <div className="max-w-6xl mx-auto py-2 md:py-6 xl:py-10 text-base-content animate-fade-in">
      {/* Header Area */}
      <div className="mb-8 md:mb-12 xl:mb-16">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-end mb-8 md:mb-12 gap-4 md:gap-6">
          <div className="relative pl-6">
            <div className="absolute left-0 top-0 bottom-0 w-1 bg-[var(--brand-accent)] rounded-full shadow-[0_0_15px_var(--brand-accent-glow)]" />
            <Link
              href="/dashboard"
              className="text-base-content/50 hover:text-[var(--brand-accent)] text-[10px] font-black uppercase tracking-[0.25em] mb-3 inline-flex items-center gap-2 transition-all duration-300"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Dashboard
            </Link>
            <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black text-base-content uppercase tracking-tighter leading-tight sm:leading-none mb-1">
              NUEVA SOLICITUD
            </h1>
            <p className="text-base-content/60 text-xs font-medium uppercase tracking-[0.1em]">
              Servicio de Internet Dedicado Empresarial SIDE
            </p>
          </div>
          <div className="flex items-center gap-3 text-[10px] font-black uppercase tracking-widest text-base-content/50 bg-base-content/[0.03] border border-base-content/[0.05] px-4 md:px-5 py-2.5 md:py-3 rounded-2xl shadow-xl max-md:hidden">
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
      <div className="bg-base-200 rounded-3xl p-5 sm:p-8 md:p-10 min-h-[420px] md:min-h-[520px] border border-base-content/[0.04] relative overflow-hidden shadow-2xl animate-slide-in-up">
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
          <div className="max-w-xl mx-auto space-y-8 pt-2 md:pt-8 relative animate-fade-in">
            <div className="text-center mb-6 md:mb-10">
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
                <label htmlFor="request-state" className="text-[10px] font-black text-base-content/50 ml-1 uppercase tracking-[0.2em] group-focus-within:text-[var(--brand-accent)]">
                  ESTADO *
                </label>
                <div className="relative">
                  <select
                    id="request-state"
                    name="state_id"
                    value={formData.state_id}
                    onChange={(e) => {
                      const state = states.find((s) => s.id === Number(e.target.value));
                      setFormData((prev) => ({
                        ...prev,
                        state_id: state?.id || "",
                        state: state?.name || "",
                        city_id: "",
                        city: "",
                      }));
                      if (errors.state) setErrors((prev) => ({ ...prev, state: "" }));
                    }}
                    className={`w-full bg-base-200 border rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--brand-accent)]/50 transition-all appearance-none cursor-pointer text-base-content font-medium
                        ${errors.state ? "border-error/40" : "border-base-content/[0.05] hover:border-base-content/[0.12]"}`}
                  >
                    <option value="">Selecciona un estado...</option>
                    {states.map((state) => (
                      <option key={state.id} value={state.id}>
                        {state.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/45 pointer-events-none group-focus-within:text-[var(--brand-accent)]" />
                </div>
              </div>
              <div className="space-y-2 group">
                <label htmlFor="request-city" className="text-[10px] font-black text-base-content/50 ml-1 uppercase tracking-[0.2em] group-focus-within:text-[var(--brand-accent)]">
                  CIUDAD *
                </label>
                <div className="relative">
                  <select
                    id="request-city"
                    name="city_id"
                    value={formData.city_id}
                    disabled={!formData.state_id}
                    onChange={(e) => {
                      const city = cities.find((c) => c.id === Number(e.target.value));
                      setFormData((prev) => ({
                        ...prev,
                        city_id: city?.id || "",
                        city: city?.name || "",
                      }));
                      if (errors.city) setErrors((prev) => ({ ...prev, city: "" }));
                    }}
                    className={`w-full bg-base-200 border rounded-2xl px-5 py-4 text-sm focus:outline-none focus:border-[var(--brand-accent)]/50 transition-all appearance-none cursor-pointer text-base-content font-medium disabled:opacity-50
                        ${errors.city ? "border-error/40" : "border-base-content/[0.05] hover:border-base-content/[0.12]"}`}
                  >
                    <option value="">
                      {!formData.state_id ? "Selecciona un estado primero..." : loadingCities ? "Cargando ciudades..." : "Selecciona una ciudad..."}
                    </option>
                    {cities.map((city) => (
                      <option key={city.id} value={city.id}>
                        {city.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="absolute right-5 top-1/2 -translate-y-1/2 w-4 h-4 text-base-content/45 pointer-events-none group-focus-within:text-[var(--brand-accent)]" />
                </div>
                {errors.city && (
                  <p className="text-error text-[10px] font-bold uppercase tracking-widest ml-1 flex items-center gap-1.5">
                    <span className="inline-block w-1.5 h-1.5 rounded-full bg-error" />
                    {errors.city}
                  </p>
                )}
              </div>
            </div>

            <button
              onClick={goNext}
              className="w-full btn-brand py-4 md:py-5 rounded-2xl transition-all duration-300 mt-8 md:mt-10 flex items-center justify-center gap-3 font-black uppercase tracking-[0.2em] text-xs shadow-xl group"
            >
              Continuar{" "}
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1" />
            </button>
          </div>
        )}

        {/* STEP 2: Plan */}
        {currentStep === 2 && (
          <div className="max-w-2xl mx-auto space-y-8 md:space-y-10 relative py-2 md:py-4 animate-fade-in">
            <div className="text-center mb-6 md:mb-10">
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
              options={products.map(productOption)}
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

            <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 pt-8 md:pt-10 border-t border-base-content/[0.03]">
              <button
                onClick={prevStep}
                className="flex items-center justify-center gap-2 min-h-11 px-2 text-base-content/50 hover:text-base-content text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Volver
              </button>
              <button
                onClick={goNext}
                disabled={!formData.product_id}
                className="btn-brand w-full sm:w-auto inline-flex items-center justify-center px-6 sm:px-10 py-4 rounded-xl disabled:opacity-20 text-xs font-black uppercase tracking-widest shadow-xl transition-all"
              >
                Continuar <ArrowRight className="w-4 h-4 ml-2" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 3: Negocio */}
        {currentStep === 3 && (
          <div className="max-w-4xl mx-auto space-y-8 md:space-y-12 relative py-2 md:py-4 animate-fade-in">
            <div className="text-center mb-6 md:mb-10">
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

            <div className="grid md:grid-cols-2 gap-8 lg:gap-10">
              <div className="space-y-6">
                <div className="flex items-center gap-2.5 mb-2">
                  <Building2 className="w-5 h-5 text-[var(--brand-accent)]" strokeWidth={1.75} />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-base-content/65">
                    Datos Fiscales
                  </h3>
                </div>
                <div className="space-y-4">
                  {/* Persona Física / Persona Moral — determina el tipo de
                      contacto a crear en Odoo (QA v0.9 punto 2). */}
                  <div className="space-y-2">
                    <label className="text-[10px] font-black text-base-content/50 ml-1 uppercase tracking-[0.2em]">
                      TIPO DE PERSONA
                    </label>
                    <div className="flex gap-2 bg-base-200 border border-base-content/[0.05] rounded-2xl p-1.5">
                      {([
                        { value: "moral", label: "Persona Moral" },
                        { value: "fisica", label: "Persona Física" },
                      ] as const).map((opt) => (
                        <button
                          key={opt.value}
                          type="button"
                          onClick={() =>
                            setFormData((prev) => ({
                              ...prev,
                              person_type: opt.value,
                              regimen_societario_id: opt.value === "fisica" ? "" : prev.regimen_societario_id,
                            }))
                          }
                          className={`flex-1 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${
                            formData.person_type === opt.value
                              ? "chip-selected"
                              : "text-base-content/55 hover:text-base-content hover:bg-base-content/[0.05]"
                          }`}
                        >
                          {opt.label}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <FormInput
                      label="RFC"
                      name="rfc"
                      placeholder="Ej: XAXX010101000"
                      icon={Search}
                      value={formData.rfc}
                      onChange={handleChange}
                      error={errors.rfc}
                    />
                    <p className="mt-2 text-[10px] text-base-content/45 font-medium ml-1">
                      Captura el RFC genérico si no tienes el RFC disponible para no detener tu proceso de venta.
                    </p>
                  </div>
                  {formData.person_type === "moral" && (
                    <SmartSelector
                      label="RÉGIMEN CAPITAL (OPCIONAL)"
                      placeholder="Seleccionar régimen..."
                      options={regimenes.map((r) => ({
                        id: r.id,
                        name: r.name,
                        subtitle: r.full_name,
                      }))}
                      selectedId={formData.regimen_societario_id}
                      onSelect={(opt) =>
                        setFormData((prev) => ({
                          ...prev,
                          regimen_societario_id: opt ? Number(opt.id) : "",
                        }))
                      }
                    />
                  )}
                  <div className="relative">
                    <FormInput
                      label="RAZÓN SOCIAL"
                      name="business_name"
                      placeholder="Busca un contacto o captura una razón social nueva"
                      icon={Building2}
                      value={formData.business_name}
                      onChange={handleChange}
                      error={errors.business_name}
                    />
                    {(customerSearching || customerResults.length > 0) && !selectedCustomer && (
                      <div className="absolute top-full left-0 right-0 z-[120] mt-2 max-h-64 overflow-y-auto rounded-2xl border border-base-content/10 bg-base-300 shadow-2xl">
                        {customerSearching && <p className="px-5 py-3 text-xs text-base-content/50">Buscando contactos…</p>}
                        {customerResults.map((customer) => (
                          <button
                            key={customer.id}
                            type="button"
                            onClick={() => {
                              setSelectedCustomer(customer);
                              setFormData((prev) => ({ ...prev, business_name: customer.name, rfc: customer.vat || prev.rfc }));
                              setCustomerResults([]);
                            }}
                            className="block w-full px-5 py-3 text-left hover:bg-primary/10"
                          >
                            <span className="block text-sm font-bold">{customer.display_name || customer.name}</span>
                            <span className="block text-xs text-base-content/50">{[customer.email, customer.vat].filter(Boolean).join(" · ")}</span>
                          </button>
                        ))}
                      </div>
                    )}
                    {selectedCustomer && (
                      <p className="mt-2 text-xs font-bold text-success">Cliente existente seleccionado: {selectedCustomer.name}</p>
                    )}
                    {!selectedCustomer && formData.business_name.trim() && customerResults.length === 0 && !customerSearching && (
                      <p className="mt-2 text-xs text-base-content/45">Se creará un nuevo cliente con esta razón social.</p>
                    )}
                  </div>
                </div>
              </div>
              <div className="space-y-6">
                <div className="flex items-center gap-2.5 mb-2">
                  <User className="w-5 h-5 text-[var(--brand-accent)]" strokeWidth={1.75} />
                  <h3 className="text-[11px] font-black uppercase tracking-[0.2em] text-base-content/65">
                    Contacto Directo
                  </h3>
                </div>
                {selectedCustomer && customerContacts.length > 0 && (
                  <SmartSelector
                    label="CONTACTO EXISTENTE"
                    placeholder="Elegir un contacto del cliente..."
                    options={customerContacts.map((c) => ({
                      id: c.id,
                      name: c.name,
                      subtitle: [c.email, c.phone].filter(Boolean).join(" · "),
                    }))}
                    selectedId={selectedContactId}
                    onSelect={(opt) => {
                      const contact = customerContacts.find((c) => c.id === Number(opt?.id));
                      setSelectedContactId(contact ? contact.id : null);
                      if (contact) {
                        setFormData((prev) => ({
                          ...prev,
                          contact_name: contact.name || "",
                          contact_email: contact.email || prev.contact_email,
                          contact_phone: contact.phone || prev.contact_phone,
                        }));
                        setErrors((prev) => ({ ...prev, contact_name: "", contact_email: "", contact_phone: "" }));
                      }
                    }}
                  />
                )}
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
            <div className="max-w-md">
              <FormInput
                label="FECHA DE CIERRE PREVISTO (OPCIONAL)"
                name="expected_closing"
                type="date"
                placeholder=""
                icon={undefined}
                value={formData.expected_closing}
                onChange={handleChange}
                required={false}
              />
            </div>
            <div className="flex flex-col-reverse sm:flex-row sm:justify-between sm:items-center gap-3 sm:gap-4 pt-8 md:pt-10 border-t border-base-content/[0.03]">
              <button
                onClick={prevStep}
                className="flex items-center justify-center gap-2 min-h-11 px-2 text-base-content/50 hover:text-base-content text-[10px] font-black uppercase tracking-widest transition-all"
              >
                <ArrowLeft className="w-4 h-4" /> Volver
              </button>
              <button
                onClick={goNext}
                className="btn-brand w-full sm:w-auto px-7 sm:px-12 py-4 sm:py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-[0_20px_40px_var(--brand-accent-glow)] transition-all flex items-center justify-center gap-3"
              >
                Continuar <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* STEP 4: Resumen */}
        {currentStep === 4 && (
          <div className="max-w-4xl mx-auto space-y-8 md:space-y-10 relative py-2 md:py-4 animate-fade-in">
            <div className="text-center mb-6 md:mb-10">
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
            <div className="grid md:grid-cols-2 gap-4 md:gap-6">
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
                  value: formData.rfc ? `RFC: ${formData.rfc}` : "RFC pendiente",
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
                  className="bg-base-200 border border-base-content/[0.04] rounded-3xl p-5 md:p-6 xl:p-8 group hover:border-[var(--brand-accent)]/30 transition-all duration-500"
                >
                  <div className="flex items-start gap-4">
                    <item.icon className="w-7 h-7 text-[var(--brand-accent)] shrink-0" strokeWidth={1.75} />
                    <div className="min-w-0">
                      <p className="text-[10px] font-black uppercase tracking-widest text-base-content/50 mb-2">
                        {item.label}
                      </p>
                      <h4 className="text-base md:text-lg font-black uppercase tracking-tight text-base-content mb-1 break-words">
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
            <div className="bg-base-200 border border-base-content/[0.04] rounded-3xl p-5 sm:p-8 md:p-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 md:gap-8 relative overflow-hidden">
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
                    selectedCustomer ? submitOpportunityOnly : submitFull
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
          <div className="max-w-2xl mx-auto space-y-8 md:space-y-10 relative animate-slide-in-up py-8 md:py-16 text-center">
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
                className="btn-brand px-7 sm:px-12 py-4 sm:py-5 rounded-2xl text-[10px] font-black uppercase tracking-[0.2em] shadow-xl hover:shadow-[0_20px_40px_var(--brand-accent-glow)] transition-all inline-flex w-full sm:w-auto items-center justify-center gap-3"
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
