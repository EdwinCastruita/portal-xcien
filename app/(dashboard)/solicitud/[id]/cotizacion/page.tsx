"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useToast } from "@/app/components/ToastContext";
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  ChevronRight,
  CreditCard,
  Download,
  FileSignature,
  FileText,
  Layers,
  Loader2,
  Mail,
  MapPin,
  Plus,
  Printer,
  Receipt,
  Trash2,
  UploadCloud,
  Zap,
} from "lucide-react";
import { API_BASE, apiFetch, getCookie } from "@/app/lib/api";

export default function CotizacionPage() {
  const params = useParams();
  const id = params?.id as string;
  const printRef = useRef<HTMLDivElement>(null);

  const [solicitud, setSolicitud] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const [templates, setTemplates] = useState<any[]>([]);
  const [addresses, setAddresses] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [loadingMeta, setLoadingMeta] = useState(false);

  const [form, setForm] = useState({
    payment_method: "Transferencia Bancaria",
    billing_address: "",
    partner_invoice_id: null as number | null,
    partner_shipping_id: null as number | null,
    template_id: null as number | null,
    expiration_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
      .toISOString()
      .split("T")[0],
    note: "",
  });

  const [lines, setLines] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);
  const [quotation, setQuotation] = useState<any>(null);
  const [sendingEmail, setSendingEmail] = useState(false);
  const [emailSent, setEmailSent] = useState(false);

  const [existingQuotations, setExistingQuotations] = useState<any[]>([]);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const { success, error: toastError } = useToast();

  useEffect(() => {
    async function fetchData() {
      try {
        setLoadingMeta(true);
        const resSolic = await apiFetch(`/solicitudes/${id}`, {
          company: true,
        });
        const data = resSolic.solicitud;
        setSolicitud(data);

        const resTemp = await apiFetch(`/quotation_templates`, {
          company: true,
        }).catch(() => null);
        if (resTemp?.templates) setTemplates(resTemp.templates);

        const pId = data.partner_id || data.lead_id;
        const resAddr = await apiFetch(`/partners/${pId}/related`, {
          company: true,
        }).catch(() => null);
        if (resAddr?.partners) {
          const addrData = resAddr.partners;
          setAddresses(addrData || []);
          const inv =
            addrData.find((a: any) => a.type === "invoice") || addrData[0];
          const ship =
            addrData.find((a: any) => a.type === "delivery") || addrData[0];
          setForm((prev) => ({
            ...prev,
            partner_invoice_id: inv?.id || null,
            partner_shipping_id: ship?.id || null,
            billing_address:
              `${data.business_name}, ${data.city}, ${data.state}`.trim(),
          }));
        }

        const resProd = await apiFetch(`/products`, {
          method: "POST",
          company: true,
        }).catch(() => null);
        if (resProd?.products) {
          setProducts(
            resProd.products.map((p: any) => ({
              id: p.id,
              name: p.name,
              price: p.list_price ?? p.price ?? 0,
            })),
          );
        }

        setLines([
          {
            product_id: data.product_id || null,
            name: `Internet Dedicado - ${data.plan_speed}`,
            quantity: 1,
            price: data.plan_price || 0,
            id: Math.random().toString(36).substr(2, 9),
          },
        ]);
      } catch (err: any) {
        setError(err.message || "Error");
      } finally {
        setLoading(false);
        setLoadingMeta(false);
      }
    }
    fetchData();
    fetchHistory();
  }, [id]);

  const fetchHistory = async () => {
    try {
      setLoadingHistory(true);
      const res = await apiFetch(`/solicitudes/${id}/quotations`, {
        company: true,
      });
      setExistingQuotations(
        Array.isArray(res?.quotations) ? res.quotations : [],
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadQuotation = async (orderId: number) => {
    try {
      setLoading(true);
      const res = await apiFetch(`/quotations/${orderId}`, { company: true });
      const data = res.quotation;
      setEditingId(orderId);
      setQuotation(null);
      setEmailSent(false);
      setContract(data.contract || null);
      setContractFile(null);
      setForm({
        payment_method: "Transferencia Bancaria",
        billing_address: "",
        partner_invoice_id: data.partner_invoice_id?.[0] || null,
        partner_shipping_id: data.partner_shipping_id?.[0] || null,
        template_id: data.sale_order_template_id?.[0] || null,
        expiration_date: data.validity_date || "",
        note: data.note || "",
      });
      setLines(
        data.order_lines.map((l: any) => ({
          id: l.id,
          product_id: l.product_id,
          name: l.name,
          quantity: l.quantity,
          price: l.price,
        })),
      );
    } catch (err) {
      toastError("Error al cargar la cotización");
    } finally {
      setLoading(false);
    }
  };

  const deleteQuotation = async (orderId: number) => {
    if (!confirm("¿Cancelar esta cotización?")) return;
    try {
      await apiFetch(`/quotations/${orderId}/cancel`, {
        method: "POST",
        company: true,
      });
      fetchHistory();
      if (editingId === orderId) resetForm();
    } catch (err) {
      toastError("Error al eliminar la cotización");
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setQuotation(null);
    setEmailSent(false);
    setContract(null);
    setContractFile(null);
    setForm((prev) => ({
      ...prev,
      expiration_date: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
      note: "",
    }));
    if (solicitud) {
      setLines([
        {
          product_id: solicitud.product_id || null,
          name: `Internet Dedicado - ${solicitud.plan_speed}`,
          quantity: 1,
          price: solicitud.plan_price || 0,
          id: Math.random().toString(36).substr(2, 9),
        },
      ]);
    }
  };

  const addLine = () => {
    setLines([
      ...lines,
      {
        product_id: null,
        name: "",
        quantity: 1,
        price: 0,
        id: Math.random().toString(36).substr(2, 9),
      },
    ]);
  };

  const removeLine = (id: string) => setLines(lines.filter((l) => l.id !== id));

  const updateLine = (id: string, field: string, value: any) => {
    setLines(
      lines.map((l) => {
        if (l.id === id) {
          if (field === "product_id") {
            const pid = parseInt(value) || null;
            const prod = products.find((p) => p.id === pid);
            return {
              ...l,
              product_id: pid,
              name: prod?.name || l.name,
              price: prod?.price || l.price,
            };
          }
          return { ...l, [field]: value };
        }
        return l;
      }),
    );
  };

  const subtotal = useMemo(
    () =>
      lines.reduce(
        (acc, l) => acc + (l.product_id ? l.quantity * l.price : 0),
        0,
      ),
    [lines],
  );
  const taxes = subtotal * 0.16;
  const total = subtotal + taxes;

  const createQuotation = async () => {
    const validLines = lines.filter((l) => l.product_id !== null);
    if (validLines.length === 0)
      return toastError("Por favor, selecciona al menos un producto.");

    setSaving(true);
    try {
      const isEdit = !!editingId;
      const path = isEdit
        ? `/quotations/${editingId}/update`
        : `/solicitudes/${id}/quotation`;

      const resVal = await apiFetch(path, {
        method: "POST",
        company: true,
        body: { ...form, lines: validLines },
      });
      const qId = isEdit ? editingId : resVal.order_id;

      const previewRes = await apiFetch(`/quotations/${qId}`, {
        company: true,
      });
      setQuotation(previewRes.quotation);
      setContract(previewRes.quotation.contract || null);
      setContractFile(null);
      fetchHistory();
      success(
        isEdit ? "Cotización actualizada" : "Cotización generada con éxito",
      );
    } catch (err: any) {
      toastError(err.message || "Error inesperado al generar la cotización");
    } finally {
      setSaving(false);
    }
  };

  const sendEmail = async () => {
    if (!quotation) return;
    setSendingEmail(true);
    try {
      await apiFetch(`/quotations/${quotation.id}/send`, {
        method: "POST",
        company: true,
      });
      setEmailSent(true);
      success("Cotización enviada exitosamente por correo");
    } catch (err) {
      toastError("Error al enviar el correo");
    } finally {
      setSendingEmail(false);
    }
  };

  const [contract, setContract] = useState<any>(null);
  const [contractFile, setContractFile] = useState<File | null>(null);
  const [uploadingContract, setUploadingContract] = useState(false);

  const currentOrderId = quotation?.id ?? editingId;

  const uploadContract = async () => {
    if (!currentOrderId) return;
    if (!contractFile)
      return toastError("Selecciona el PDF del contrato firmado");
    setUploadingContract(true);
    try {
      const url = new URL(
        `${API_BASE}/quotations/${currentOrderId}/contract`,
      );
      const session = getCookie("session_id");
      if (session) url.searchParams.set("_sid", session);
      const cid = getCookie("company_id");
      if (cid) url.searchParams.set("_cid", cid);
      const fd = new FormData();
      fd.append("file", contractFile);
      const res = await fetch(url.toString(), { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (data?.success === false)
        throw new Error(data.message || "Operación rechazada por Odoo");
      setContract(data.contract);
      setContractFile(null);
      success("Contrato firmado subido con éxito");
      fetchHistory();
    } catch (err: any) {
      toastError(err.message || "Error al subir el contrato");
    } finally {
      setUploadingContract(false);
    }
  };

  const downloadContract = async () => {
    if (!currentOrderId) return;
    try {
      const url = new URL(
        `${API_BASE}/quotations/${currentOrderId}/contract`,
      );
      const session = getCookie("session_id");
      if (session) url.searchParams.set("_sid", session);
      const cid = getCookie("company_id");
      if (cid) url.searchParams.set("_cid", cid);
      const res = await fetch(url.toString());
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data?.message || "No se pudo descargar el contrato");
      }
      const blob = await res.blob();
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = contract?.filename || "contrato.pdf";
      a.click();
      URL.revokeObjectURL(a.href);
    } catch (err: any) {
      toastError(err.message || "Error al descargar el contrato");
    }
  };

  if (loading)
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 bg-base-100">
        <Loader2 className="w-12 h-12 animate-spin text-primary" />
        <p className="text-base-content/40 font-bold uppercase tracking-widest text-xs">
          Preparando Editor Profesional...
        </p>
      </div>
    );

  const selectedInvoice = addresses.find(
    (a) => a.id === form.partner_invoice_id,
  );
  const selectedShipping = addresses.find(
    (a) => a.id === form.partner_shipping_id,
  );

  return (
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-6 bg-base-200/50 p-8 rounded-[2rem] border border-base-content/5 shadow-sm">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-primary/60">
            <Link
              href={`/solicitud/${id}`}
              className="hover:text-primary transition-colors flex items-center gap-1"
            >
              <ArrowLeft className="w-3 h-3" /> Solicitud
            </Link>
            <ChevronRight className="w-3 h-3 opacity-20" />
            <span>Editor</span>
          </div>
          <h1 className="text-4xl font-black tracking-tighter text-base-content flex items-center gap-3">
            <Receipt className="w-8 h-8 text-primary" />
            {quotation
              ? "REVISAR DOCUMENTO"
              : editingId
                ? "EDITAR COTIZACIÓN"
                : "NUEVA COTIZACIÓN"}
          </h1>
          <p className="text-xs font-bold text-base-content/30 uppercase tracking-tight">
            ID Oportunidad:{" "}
            <span className="text-base-content/60 font-black">
              {solicitud.business_name}
            </span>
          </p>
        </div>

        <div className="flex flex-wrap gap-3 w-full lg:w-auto">
          {quotation ? (
            <>
              <button
                onClick={resetForm}
                className="btn btn-ghost bg-base-300/50 hover:bg-base-300 flex-1 lg:flex-none h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest"
              >
                <Plus className="w-4 h-4 mr-2" /> Nueva
              </button>
              <button
                onClick={sendEmail}
                disabled={sendingEmail || emailSent}
                className={`btn flex-1 lg:flex-none h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest border-none transition-all ${
                  emailSent
                    ? "bg-success/10 text-success"
                    : "bg-primary/10 text-primary hover:bg-primary hover:text-primary-content"
                }`}
              >
                {sendingEmail ? (
                  <Loader2 className="animate-spin w-4 h-4 mr-2" />
                ) : emailSent ? (
                  <Check className="w-4 h-4 mr-2" />
                ) : (
                  <Mail className="w-4 h-4 mr-2" />
                )}
                {emailSent ? "Enviado con Éxito" : "Enviar por Correo"}
              </button>
              <button
                onClick={() => window.print()}
                className="btn btn-primary h-14 px-10 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-xl shadow-primary/20"
              >
                <Printer className="w-4 h-4 mr-2" /> Imprimir PDF
              </button>
            </>
          ) : (
            <>
              {editingId && (
                <button
                  onClick={resetForm}
                  className="btn btn-ghost h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest text-base-content/40"
                >
                  Descartar
                </button>
              )}
              <button
                onClick={createQuotation}
                disabled={saving}
                className="btn btn-primary h-14 px-12 rounded-2xl text-[10px] font-black uppercase tracking-widest shadow-2xl shadow-primary/30 flex items-center gap-3 overflow-hidden group relative"
              >
                {saving ? (
                  <div className="flex items-center gap-2">
                    <Loader2 className="animate-spin w-5 h-5" />
                    <span>PROCESANDO...</span>
                  </div>
                ) : (
                  <>
                    <Zap className="w-5 h-5 group-hover:scale-110 transition-transform" />
                    <span>
                      {editingId
                        ? "GUARDAR CAMBIOS"
                        : "PROCESAR Y GENERAR COTIZACIÓN"}
                    </span>
                  </>
                )}
              </button>
            </>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-[1fr_400px] gap-8 items-start">
        <div className="space-y-8">
          {!quotation ? (
            <div className="space-y-8">
              {/* Step 1: Config Basic */}
              <div className="bg-base-200 rounded-[2.5rem] p-8 lg:p-12 border border-base-content/5 shadow-sm space-y-10 group transition-all hover:shadow-md">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <Calendar className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black tracking-tight uppercase">
                    Datos Generales
                  </h3>
                </div>

                <div className="grid md:grid-cols-3 gap-8">
                  <div className="form-control w-full">
                    <label className="label mb-1">
                      <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-40">
                        Vencimiento
                      </span>
                    </label>
                    <input
                      type="date"
                      value={form.expiration_date}
                      onChange={(e) =>
                        setForm({ ...form, expiration_date: e.target.value })
                      }
                      className="input input-bordered bg-base-100 h-14 px-6 rounded-2xl font-bold focus:border-primary transition-all"
                    />
                  </div>
                  <div className="form-control w-full">
                    <label className="label mb-1">
                      <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-40">
                        Término de Pago
                      </span>
                    </label>
                    <select
                      value={form.payment_method}
                      onChange={(e) =>
                        setForm({ ...form, payment_method: e.target.value })
                      }
                      className="select select-bordered bg-base-100 h-14 px-6 rounded-2xl font-bold focus:border-primary appearance-none tracking-tight"
                    >
                      <option>Transferencia Bancaria</option>
                      <option>Pago con Tarjeta</option>
                      <option>Net 30</option>
                      <option>Pago Anticipado</option>
                    </select>
                  </div>
                  <div className="form-control w-full">
                    <label className="label mb-1">
                      <span className="label-text text-[10px] font-black uppercase tracking-widest opacity-40">
                        Plantilla Visual
                      </span>
                    </label>
                    <select
                      value={form.template_id || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          template_id: parseInt(e.target.value) || null,
                        })
                      }
                      className="select select-bordered bg-base-100 h-14 px-6 rounded-2xl font-bold focus:border-primary appearance-none tracking-tight"
                    >
                      <option value="">Personalizada (Standard)</option>
                      {templates.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-8">
                  <div className="form-control w-full bg-base-300/30 p-6 rounded-3xl space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-base-content/40">
                      <Building2 className="w-3.5 h-3.5" /> Facturación
                    </div>
                    <select
                      value={form.partner_invoice_id || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          partner_invoice_id: parseInt(e.target.value) || null,
                        })
                      }
                      className="select bg-base-100 w-full h-14 rounded-2xl font-bold"
                    >
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} [{a.city || "S/L"}]
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="form-control w-full bg-base-300/30 p-6 rounded-3xl space-y-4">
                    <div className="flex items-center gap-2 text-[10px] font-black uppercase tracking-widest text-base-content/40">
                      <MapPin className="w-3.5 h-3.5" /> Punto de Entrega
                    </div>
                    <select
                      value={form.partner_shipping_id || ""}
                      onChange={(e) =>
                        setForm({
                          ...form,
                          partner_shipping_id: parseInt(e.target.value) || null,
                        })
                      }
                      className="select bg-base-100 w-full h-14 rounded-2xl font-bold"
                    >
                      {addresses.map((a) => (
                        <option key={a.id} value={a.id}>
                          {a.name} [{a.city || "S/L"}]
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>

              {/* Step 2: Line Items */}
              <div className="bg-base-200 rounded-[2.5rem] p-8 lg:p-12 border border-base-content/5 shadow-sm space-y-10">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                      <Layers className="w-5 h-5" />
                    </div>
                    <h3 className="text-lg font-black tracking-tight uppercase">
                      Servicios y Conceptos
                    </h3>
                  </div>
                  <button
                    onClick={addLine}
                    className="btn btn-sm btn-ghost bg-primary/5 hover:bg-primary/10 rounded-xl text-[10px] font-black uppercase tracking-widest text-primary"
                  >
                    + Nuevo Registro
                  </button>
                </div>

                <div className="space-y-4">
                  {lines.map((l) => (
                    <div
                      key={l.id}
                      className="grid grid-cols-[1fr_80px_140px_48px] gap-4 items-center bg-base-100 p-6 rounded-3xl border border-base-content/5 group hover:border-primary/20 transition-all"
                    >
                      <div className="space-y-2">
                        <select
                          value={l.product_id || ""}
                          onChange={(e) =>
                            updateLine(l.id, "product_id", e.target.value)
                          }
                          className="w-full bg-transparent text-sm font-black text-primary outline-none cursor-pointer"
                        >
                          <option value="" className="bg-base-100">
                            Seleccionar servicio...
                          </option>
                          {products.map((p) => (
                            <option
                              key={p.id}
                              value={p.id}
                              className="bg-base-100"
                            >
                              {p.name}
                            </option>
                          ))}
                        </select>
                        <input
                          value={l.name}
                          onChange={(e) =>
                            updateLine(l.id, "name", e.target.value)
                          }
                          className="w-full bg-transparent text-[10px] font-bold text-base-content/30 uppercase outline-none focus:text-base-content"
                          placeholder="Propiedades adicionales o descripción..."
                        />
                      </div>
                      <div className="form-control">
                        <input
                          type="number"
                          value={l.quantity}
                          onChange={(e) =>
                            updateLine(
                              l.id,
                              "quantity",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="input input-sm bg-base-200 text-center font-black h-12 rounded-xl border-none focus:ring-1 ring-primary"
                        />
                      </div>
                      <div className="form-control">
                        <input
                          type="number"
                          value={l.price}
                          onChange={(e) =>
                            updateLine(
                              l.id,
                              "price",
                              parseFloat(e.target.value) || 0,
                            )
                          }
                          className="input input-sm bg-base-200 text-right font-black h-12 rounded-xl border-none focus:ring-1 ring-primary pr-4"
                        />
                      </div>
                      <div className="flex justify-end">
                        <button
                          onClick={() => removeLine(l.id)}
                          className="w-10 h-10 flex items-center justify-center rounded-xl text-error/20 hover:bg-error/10 hover:text-error transition-all"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Local Sumary */}
                <div className="flex justify-end pt-6">
                  <div className="text-right space-y-1">
                    <p className="text-[10px] font-black uppercase text-base-content/30 tracking-widest">
                      Total Parcial (Sin Impuestos)
                    </p>
                    <p className="text-3xl font-black text-base-content">
                      $
                      {subtotal.toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </p>
                  </div>
                </div>
              </div>

              {/* Step 3: Notes */}
              <div className="bg-base-200 rounded-[2.5rem] p-8 lg:p-12 border border-base-content/5 shadow-sm space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                    <FileText className="w-5 h-5" />
                  </div>
                  <h3 className="text-lg font-black tracking-tight uppercase">
                    Condiciones Comerciales
                  </h3>
                </div>
                <textarea
                  value={form.note}
                  onChange={(e) => setForm({ ...form, note: e.target.value })}
                  rows={4}
                  className="textarea bg-base-100 w-full rounded-3xl p-8 font-medium border-base-content/5 focus:border-primary/20"
                  placeholder="Ej: Oferta válida hasta fin de mes. Tiempos de entrega de 5-10 días hábiles..."
                />
              </div>
            </div>
          ) : (
            /* ── PREVIEW MODE ── */
            <div
              ref={printRef}
              className="bg-white text-black p-[2.5cm] shadow-2xl min-h-[29.7cm] flex flex-col font-sans border-t-[14px] border-[#003a70] rounded-b-2xl"
              style={{ fontFamily: "'Comfortaa', sans-serif" }}
            >
              <div className="flex justify-between items-start mb-16 pb-12 border-b-2 border-slate-50">
                <div className="space-y-2">
                  <h2
                    className="text-7xl font-black italic tracking-tighter text-[#003a70]"
                    style={{ fontFamily: "Oswald, sans-serif" }}
                  >
                    XCIEN
                  </h2>
                  <p className="text-[11px] font-bold text-slate-300 tracking-[0.4em] uppercase">
                    Connectivity Solutions
                  </p>
                </div>
                <div className="text-right group">
                  <h1
                    className="text-5xl font-black uppercase text-slate-900 leading-none"
                    style={{ fontFamily: "Oswald, sans-serif" }}
                  >
                    COTIZACIÓN
                  </h1>
                  <div className="mt-4 flex flex-col items-end gap-1">
                    <span className="text-[10px] font-black text-slate-300 uppercase">
                      Documento de Venta No.
                    </span>
                    <div className="bg-[#003a70] text-white px-8 py-3 rounded-full font-black text-xl shadow-lg border-2 border-[#003a70] group-hover:bg-white group-hover:text-[#003a70] transition-all">
                      #{quotation.name}
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-24 mb-20 relative">
                <div className="absolute left-1/2 top-4 bottom-4 w-px bg-slate-50 hidden md:block" />
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-200 border-b-2 border-slate-50 pb-3 uppercase tracking-[0.2em] flex items-center gap-2">
                    <Building2 className="w-3 h-3" /> Información Fiscal
                  </h4>
                  <div className="pl-2">
                    <p className="text-2xl font-black text-[#003a70] uppercase leading-tight mb-2">
                      {selectedInvoice?.name || solicitud.business_name}
                    </p>
                    <p className="text-xs font-black text-slate-400 mb-4 underline decoration-slate-200 decoration-2 underline-offset-4 tracking-tighter italic">
                      RFC: {solicitud.rfc}
                    </p>
                    <p className="text-[12px] text-slate-500 font-medium leading-relaxed bg-slate-50/50 p-6 rounded-3xl border border-slate-50 italic">
                      {selectedInvoice?.street_name || "Dirección Fiscal"}{" "}
                      {selectedInvoice?.street_number || ""}
                      <br />
                      {selectedInvoice?.l10n_mx_edi_colony || ""}
                      <br />
                      {selectedInvoice?.city || ""}, CP{" "}
                      {selectedInvoice?.zip || ""}
                    </p>
                  </div>
                </div>
                <div className="space-y-6">
                  <h4 className="text-[10px] font-black text-slate-200 border-b-2 border-slate-50 pb-3 uppercase tracking-[0.2em] flex items-center gap-2">
                    <MapPin className="w-3 h-3" /> Punto de Servicio
                  </h4>
                  <div className="pl-2">
                    <p className="text-2xl font-black text-slate-800 uppercase leading-tight mb-6">
                      {selectedShipping?.name || solicitud.business_name}
                    </p>
                    <p className="text-[12px] text-slate-500 font-medium leading-relaxed bg-slate-50/50 p-6 rounded-3xl border border-slate-50 italic">
                      {selectedShipping?.street_name || "Lugar de Instalación"}{" "}
                      {selectedShipping?.street_number || ""}
                      <br />
                      {selectedShipping?.l10n_mx_edi_colony || ""}
                      <br />
                      {selectedShipping?.city || ""}, CP{" "}
                      {selectedShipping?.zip || ""}
                    </p>
                  </div>
                </div>
              </div>

              <div className="grow mb-12">
                <table className="w-full text-sm border-spacing-0">
                  <thead
                    className="bg-[#003a70] text-white uppercase text-[10px] font-black tracking-widest"
                    style={{ fontFamily: "Oswald, sans-serif" }}
                  >
                    <tr>
                      <th className="py-6 px-10 text-left rounded-tl-[1.5rem]">
                        Concepto / Plan Técnico
                      </th>
                      <th className="py-6 px-6 text-center w-24">Cant.</th>
                      <th className="py-6 px-8 text-right w-48">Unitario</th>
                      <th className="py-6 px-10 text-right w-48 rounded-tr-[1.5rem]">
                        Subtotal
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {(quotation.order_lines || lines).map(
                      (l: any, i: number) => (
                        <tr
                          key={i}
                          className="border-b-2 border-slate-50 group transition-colors hover:bg-slate-50/50"
                        >
                          <td className="py-10 px-10">
                            <p className="font-black text-slate-800 text-[15px] uppercase tracking-tight">
                              {l.name}
                            </p>
                            <p className="text-[9px] text-slate-300 mt-2 uppercase font-black">
                              Ref: SIST-TEL-00{l.product_id}
                            </p>
                          </td>
                          <td className="py-10 px-6 text-center text-slate-400 font-black text-lg">
                            {l.quantity}
                          </td>
                          <td className="py-10 px-8 text-right text-slate-500 font-bold font-mono">
                            $
                            {Number(l.price).toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                          <td className="py-10 px-10 text-right font-black text-slate-900 font-mono text-lg">
                            $
                            {(l.quantity * l.price).toLocaleString("es-MX", {
                              minimumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      ),
                    )}
                  </tbody>
                </table>
              </div>

              <div className="flex justify-between items-end mt-20 pt-16 border-t-2 border-slate-100 pb-10 relative">
                <div className="max-w-md bg-slate-50/80 p-10 rounded-[2.5rem] border-2 border-slate-100 shadow-inner relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-5">
                    <Receipt className="w-24 h-24 rotate-12" />
                  </div>
                  <h5
                    className="text-[10px] font-black uppercase text-slate-300 mb-4 tracking-[0.1em]"
                    style={{ fontFamily: "Oswald, sans-serif" }}
                  >
                    Cláusulas y Notas Especiales:
                  </h5>
                  <div className="text-[11px] text-slate-500 italic leading-[1.8] font-medium whitespace-pre-wrap">
                    {form.note ||
                      "Vigencia de 15 días. Sujeto a factibilidad técnica en sitio. Todos los precios están expresados en Moneda Nacional. El tiempo de implementación inicia una vez liquidado el anticipo."}
                  </div>
                </div>

                <div className="w-96 space-y-6">
                  <div className="space-y-3 px-6 pb-2 border-b-2 border-slate-50">
                    <div className="flex justify-between text-[11px] font-black text-slate-300 uppercase tracking-tighter">
                      <span>Subtotal Bruto</span>
                      <span className="text-slate-800 font-mono">
                        $
                        {subtotal.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                    <div className="flex justify-between text-[11px] font-black text-slate-300 uppercase tracking-tighter">
                      <span>Impuestos (IVA 16%)</span>
                      <span className="text-slate-800 font-mono">
                        $
                        {taxes.toLocaleString("es-MX", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                  <div className="bg-[#003a70] text-white p-8 rounded-[2.5rem] shadow-2xl relative overflow-hidden flex justify-between items-center group-hover:scale-105 transition-transform duration-500">
                    <div className="relative z-10">
                      <p
                        className="text-[10px] font-black uppercase tracking-[0.3em] opacity-50 mb-1"
                        style={{ fontFamily: "Oswald, sans-serif" }}
                      >
                        Importe Total
                      </p>
                      <p className="text-[12px] font-bold opacity-80 uppercase tracking-tight italic">
                        Divisa: Pesos Mexicanos
                      </p>
                    </div>
                    <span
                      className="text-4xl font-black relative z-10"
                      style={{ fontFamily: "Oswald, sans-serif" }}
                    >
                      $
                      {total.toLocaleString("es-MX", {
                        minimumFractionDigits: 2,
                      })}
                    </span>
                    <div className="absolute top-0 right-0 w-32 h-32 bg-white/5 rounded-full -mr-16 -mt-16 blur-2xl" />
                  </div>
                </div>
              </div>

              <div className="mt-20 pt-20 border-t border-slate-50 text-center">
                <div className="inline-block border-b-2 border-slate-900 pb-2 px-12 mb-4">
                  <p
                    className="text-xs font-black text-slate-900 uppercase"
                    style={{ fontFamily: "Oswald, sans-serif" }}
                  >
                    Firma de Conformidad
                  </p>
                </div>
                <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                  {solicitud.business_name} • RESPONSABLE COMERCIAL
                </p>
              </div>
            </div>
          )}
        </div>

        {/* ── Contrato digitalizado ── */}
        {currentOrderId && (
          <div className="bg-base-200 rounded-[2.5rem] p-8 lg:p-12 border border-base-content/5 shadow-sm space-y-8">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-2xl bg-primary/10 flex items-center justify-center text-primary">
                <FileSignature className="w-5 h-5" />
              </div>
              <div className="flex-1">
                <h3 className="text-lg font-black tracking-tight uppercase">
                  Contrato digitalizado
                </h3>
                <p className="text-[10px] font-bold text-base-content/30 uppercase tracking-widest mt-1">
                  Sube el contrato ya firmado por el cliente
                </p>
              </div>
              {contract?.uploaded && (
                <span className="px-4 py-2 rounded-full text-[9px] font-black uppercase tracking-widest bg-success/10 text-success border border-success/20">
                  <Check className="w-3 h-3 inline mr-1" /> Contrato subido
                </span>
              )}
            </div>

            {contract?.uploaded ? (
              <div className="flex flex-col sm:flex-row sm:items-center gap-6">
                <div className="flex items-center gap-4 bg-base-300/50 border border-base-content/5 rounded-2xl px-6 py-4 flex-1 min-w-0">
                  <div className="w-11 h-11 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
                    <FileText className="w-5 h-5 text-primary" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-black uppercase tracking-tight truncate">
                      {contract.filename || "contrato.pdf"}
                    </p>
                    <p className="text-[9px] font-bold text-success uppercase tracking-widest mt-0.5">
                      Firmado y digitalizado
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    onClick={downloadContract}
                    className="btn btn-ghost bg-base-300/50 hover:bg-base-300 flex-1 sm:flex-none h-13 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest"
                  >
                    <Download className="w-4 h-4 mr-2" /> Descargar
                  </button>
                  <label className="cursor-pointer flex-1 sm:flex-none">
                    <span className="btn btn-ghost bg-base-300/50 hover:bg-base-300 h-13 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest flex items-center justify-center gap-3">
                      <UploadCloud className="w-4 h-4" /> Reemplazar
                    </span>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      onChange={(e) => {
                        const f = e.target.files?.[0] || null;
                        setContractFile(f);
                        if (f) uploadContract();
                        e.target.value = "";
                      }}
                    />
                  </label>
                </div>
              </div>
            ) : (
              <div className="grid md:grid-cols-[1fr_auto] gap-6 items-end">
                <label className="block">
                  <span className="text-[10px] font-black text-base-content/40 uppercase tracking-widest mb-2 block">
                    Archivo PDF del contrato firmado
                  </span>
                  <div className="flex items-center gap-4 bg-base-content/[0.03] border border-dashed border-base-content/15 rounded-2xl px-6 py-5 transition-all hover:border-primary/30">
                    <UploadCloud className="w-6 h-6 text-base-content/30 shrink-0" />
                    <div className="min-w-0">
                      <p className="text-xs font-black uppercase tracking-tight truncate">
                        {contractFile?.name || "Selecciona el PDF del contrato…"}
                      </p>
                      <p className="text-[9px] font-bold text-base-content/30 uppercase tracking-widest mt-0.5">
                        Solo PDF, ya firmado por el cliente
                      </p>
                    </div>
                    <input
                      type="file"
                      accept="application/pdf,.pdf"
                      className="hidden"
                      id="contract-pdf-input"
                      onChange={(e) =>
                        setContractFile(e.target.files?.[0] || null)
                      }
                    />
                  </div>
                </label>
                <div className="flex gap-3">
                  <label
                    htmlFor="contract-pdf-input"
                    className="btn btn-ghost bg-base-300/50 hover:bg-base-300 h-14 px-6 rounded-2xl text-[10px] font-black uppercase tracking-widest cursor-pointer"
                  >
                    Elegir archivo
                  </label>
                  <button
                    onClick={uploadContract}
                    disabled={uploadingContract || !contractFile}
                    className={`btn h-14 px-8 rounded-2xl text-[10px] font-black uppercase tracking-widest border-none transition-all active:scale-[0.98] disabled:opacity-40 disabled:cursor-not-allowed ${
                      uploadingContract
                        ? "bg-primary/10 text-primary"
                        : "bg-primary text-primary-content hover:brightness-110"
                    }`}
                  >
                    {uploadingContract ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        SUBIENDO...
                      </>
                    ) : (
                      <>
                        <UploadCloud className="w-4 h-4 mr-2" />
                        Subir contrato
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* ── SIDEBAR HISTORY ── */}
        <div className="space-y-8 sticky top-8">
          <div className="flex justify-between items-center px-2">
            <h3
              className="text-sm font-black uppercase tracking-widest text-base-content/30 flex items-center gap-3"
              style={{ fontFamily: "Oswald, sans-serif" }}
            >
              <Receipt className="w-5 h-5 text-primary/40" /> Historial de
              Trámites
            </h3>
            <div className="badge badge-primary font-black text-[10px] tracking-tight py-3">
              {existingQuotations.length}{" "}
              {existingQuotations.length === 1 ? "Registro" : "Registros"}
            </div>
          </div>

          <div className="space-y-4 max-h-[1200px] overflow-y-auto pr-4 scrollbar-thin scrollbar-thumb-base-300">
            {loadingHistory ? (
              <div className="py-20 text-center">
                <Loader2 className="animate-spin w-8 h-8 mx-auto text-primary/10" />
              </div>
            ) : existingQuotations.length === 0 ? (
              <div className="p-12 bg-base-200 border-2 border-dashed border-base-content/5 rounded-[2.5rem] text-center space-y-4">
                <div className="w-16 h-16 bg-base-100 rounded-full flex items-center justify-center mx-auto opacity-20">
                  <Receipt className="w-8 h-8" />
                </div>
                <p className="text-[10px] uppercase font-black text-base-content/20 tracking-widest leading-loose mx-auto max-w-[160px]">
                  Aún no existen cotizaciones para esta oportunidad.
                </p>
              </div>
            ) : (
              existingQuotations.map((q) => (
                <div
                  key={q.id}
                  className={`relative p-8 rounded-[2rem] border-2 transition-all duration-300 cursor-pointer group overflow-hidden ${
                    editingId === q.id
                      ? "bg-primary/10 border-primary ring-4 ring-primary/5"
                      : "bg-base-200 border-transparent hover:border-primary/20 hover:bg-base-200/80 hover:-translate-y-1 hover:shadow-xl"
                  }`}
                >
                  <div className="flex justify-between items-start mb-6">
                    <div>
                      <p
                        onClick={() => loadQuotation(q.id)}
                        className="text-lg font-black group-hover:text-primary transition-colors tracking-tight"
                      >
                        {q.name}
                      </p>
                      <p className="text-[10px] font-bold text-base-content/30 uppercase tracking-tighter mt-1">
                        {new Date(
                          q.date_order || q.create_date,
                        ).toLocaleDateString("es-MX", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </p>
                    </div>
                    <button
                      onClick={() => deleteQuotation(q.id)}
                      className="w-10 h-10 rounded-2xl bg-base-100 flex items-center justify-center text-base-content/10 hover:bg-error/10 hover:text-error transition-all"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div
                    className="flex justify-between items-end"
                    onClick={() => loadQuotation(q.id)}
                  >
                    <div className="space-y-2">
                      <span
                        className={`px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${
                          q.state === "cancel"
                            ? "bg-error/10 text-error border-error/10"
                            : q.state === "sale"
                              ? "bg-success/10 text-success border-success/10"
                              : "bg-primary/10 text-primary border-primary/10"
                        }`}
                      >
                        {q.state === "draft"
                          ? "Borrador"
                          : q.state === "sent"
                            ? "Enviada"
                            : q.state === "sale"
                              ? "Confirmada"
                              : "Cancelada"}
                      </span>
                      {q.contract?.uploaded && (
                        <span className="inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border border-success/20 bg-success/10 text-success">
                          <Check className="w-3 h-3" /> Contrato
                        </span>
                      )}
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-bold text-base-content/30 uppercase tracking-tighter leading-none mb-1">
                        Monto Total
                      </p>
                      <p
                        className="text-2xl font-black text-base-content"
                        style={{ fontFamily: "Oswald, sans-serif" }}
                      >
                        $
                        {q.amount_total.toLocaleString("es-MX", {
                          minimumFractionDigits: 0,
                        })}
                      </p>
                    </div>
                  </div>

                  {/* Decorative element for hover */}
                  <div
                    className={`absolute bottom-0 right-0 w-32 h-32 bg-primary/5 rounded-full transition-all duration-500 opacity-0 group-hover:opacity-100 -mb-16 -mr-16 scale-0 group-hover:scale-100`}
                  />
                </div>
              ))
            )}
          </div>

          {/* Technical help tip */}
          <div className="p-8 bg-primary/5 rounded-[2rem] border border-primary/10">
            <p className="text-[10px] font-black uppercase tracking-[0.2em] text-primary/60 mb-2 flex items-center gap-2">
              <Zap className="w-3 h-3" /> Tip Pro
            </p>
            <p className="text-[11px] font-medium leading-relaxed text-base-content/40 italic">
              Selecciona cualquier registro para cargarlo de nuevo en el editor
              principal y realizar ajustes antes de volver a enviarlo o
              imprimirlo.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
