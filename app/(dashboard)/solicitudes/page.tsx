"use client";

import { useEffect, useState, useCallback } from "react";
import {
  Search,
  Plus,
  MapPin,
  Wifi,
  ChevronLeft,
  ChevronRight,
  Loader2,
  RefreshCw,
  X,
  FileText,
  Building2,
  ArrowRight,
  Filter,
} from "lucide-react";
import Link from "next/link";
import { apiFetch } from "../../lib/api";

const PAGE_SIZE = 12;

function getStageBadge(status: string) {
  const s = (status || "").toLowerCase();

  if (
    s.includes("ganada") ||
    s.includes("won") ||
    s.includes("cerrada") ||
    s.includes("concreat") ||
    s.includes("activ")
  )
    return {
      bg: "bg-success/10",
      border: "border-success/20",
      color: "text-success",
      label: "Contratada",
    };
  if (s.includes("perdida") || s.includes("lost") || s.includes("cancel"))
    return {
      bg: "bg-error/10",
      border: "border-error/20",
      color: "text-error",
      label: "Perdida/Canc.",
    };
  if (
    s.includes("pre-venta") ||
    s.includes("preventa") ||
    s.includes("habilit") ||
    s.includes("contrat")
  )
    return {
      bg: "bg-info/10",
      border: "border-info/20",
      color: "text-info",
      label: "Habilitación",
    };

  return {
    bg: "bg-primary/10",
    border: "border-primary/20",
    color: "text-primary",
    label: status || "En Análisis",
  };
}

export default function SolicitudesPage() {
  const [solicitudes, setSolicitudes] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [loadedAll, setLoadedAll] = useState<any[]>([]);
  const [filter, setFilter] = useState("all");

  useEffect(() => {
    const t = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(1);
    }, 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchAll = useCallback(async (showRefreshing = false) => {
    if (showRefreshing) setRefreshing(true);
    else setLoading(true);
    setError("");
    try {
      const data = await apiFetch("/solicitudes?limit=250&offset=0", {
        company: true,
      });
      setLoadedAll(Array.isArray(data?.solicitudes) ? data.solicitudes : []);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  const filtered = loadedAll.filter((s) => {
    const matchesSearch =
      !debouncedSearch ||
      s.business_name?.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
      String(s.lead_id ?? "").includes(debouncedSearch.trim());

    if (filter === "all") return matchesSearch;
    if (filter === "active")
      return (
        matchesSearch &&
        !s.status?.toLowerCase().includes("won") &&
        !s.status?.toLowerCase().includes("lost")
      );
    if (filter === "won")
      return (
        matchesSearch &&
        (s.status?.toLowerCase().includes("won") ||
          s.status?.toLowerCase().includes("ganada"))
      );
    return matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const paginated = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  if (loading && !refreshing) {
    return (
      <div className="max-w-7xl mx-auto py-20 px-4 space-y-12">
        <div className="flex flex-col gap-4 animate-pulse">
          <div className="h-10 w-64 bg-base-200 rounded-2xl" />
          <div className="h-4 w-48 bg-base-200 rounded-xl" />
        </div>
        <div className="grid md:grid-cols-3 gap-8">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="h-64 bg-base-200 rounded-[2rem]" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto py-12 px-4 space-y-10 animate-in fade-in duration-700">
      {/* ── Page Header ── */}
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-end gap-10">
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <div className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
            <p className="text-[10px] font-black text-primary uppercase tracking-[0.25em]">
              Gestión de Oportunidades
            </p>
          </div>
          <h1 className="text-5xl font-black text-base-content tracking-tighter">
            MIS SOLICITUDES
          </h1>
          <p className="text-sm font-bold text-base-content/40 uppercase tracking-tight">
            Tienes{" "}
            <span className="text-base-content font-black">
              {filtered.length} trámites
            </span>{" "}
            en este listado
          </p>
        </div>

        <div className="flex flex-wrap gap-4 w-full lg:w-auto">
          <button
            onClick={() => fetchAll(true)}
            disabled={refreshing}
            className="btn btn-ghost bg-base-200 rounded-2xl h-14 px-6 text-[10px] font-black uppercase tracking-widest border border-base-content/5"
          >
            {refreshing ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <RefreshCw className="w-4 h-4 mr-2" />
            )}
            Sincronizar
          </button>
          <Link
            href="/solicitud/nueva"
            className="btn-brand flex items-center rounded-2xl h-14 px-10 text-[10px]"
          >
            <Plus className="w-5 h-5 mr-1" /> Nueva Solicitud
          </Link>
        </div>
      </div>

      {/* ── Search & Filters ── */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1 group">
          <div className="absolute inset-y-0 left-6 flex items-center pointer-events-none">
            <Search className="w-5 h-5 text-base-content/40 group-focus-within:text-primary transition-colors" />
          </div>
          <input
            type="text"
            placeholder="Buscar por Empresa o Folio..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-base-200 border border-base-content/5 rounded-2xl pl-16 pr-6 py-6 font-bold text-sm focus:outline-none focus:border-primary/40 transition-all shadow-sm"
          />
        </div>

        <div className="flex bg-base-200 p-1 rounded-2xl border border-base-content/10 gap-1">
          <button
            onClick={() => setFilter("all")}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${filter === "all" ? "chip-selected" : "text-base-content/55 hover:text-base-content hover:bg-base-content/[0.05] border border-transparent transition-all"}`}
          >
            Todas
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${filter === "active" ? "chip-selected" : "text-base-content/55 hover:text-base-content hover:bg-base-content/[0.05] border border-transparent transition-all"}`}
          >
            En Proceso
          </button>
          <button
            onClick={() => setFilter("won")}
            className={`px-6 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest ${filter === "won" ? "chip-selected" : "text-base-content/55 hover:text-base-content hover:bg-base-content/[0.05] border border-transparent transition-all"}`}
          >
            Finalizadas
          </button>
        </div>
      </div>

      {/* ── Grid ── */}
      {paginated.length === 0 ? (
        <div className="py-32 text-center bg-base-200/50 rounded-[3rem] border-2 border-dashed border-base-content/5 flex flex-col items-center gap-6">
          <div className="w-20 h-20 bg-base-100 rounded-3xl flex items-center justify-center opacity-20">
            <FileText className="w-10 h-10" />
          </div>
          <div>
            <h3 className="text-lg font-black text-base-content/40 uppercase tracking-tight">
              Sin correspondencia
            </h3>
            <p className="text-xs font-bold text-base-content/50 uppercase tracking-widest mt-2">
              {search ? `Para: "${search}"` : "Aún no tienes registros"}
            </p>
          </div>
        </div>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {paginated.map((s) => {
            const badge = getStageBadge(s.status);
            const initial = (s.business_name || "?").trim().charAt(0).toUpperCase();
            return (
              <Link
                key={s.lead_id}
                href={`/solicitud/${s.lead_id}`}
                className="block group"
              >
                <div className="card-premium card-hover p-7 h-full flex flex-col gap-6 relative overflow-hidden">
                  <span className={`absolute left-0 top-0 bottom-0 w-1 ${badge.color.replace("text-", "bg-")}`} />

                  {/* Identity row */}
                  <div className="flex items-start justify-between gap-4 pl-2">
                    <div className="flex items-center gap-3.5 min-w-0">
                      <div className="avatar-chip w-11 h-11 rounded-2xl text-base shrink-0">
                        {initial}
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-black text-base-content leading-tight group-hover:text-primary transition-colors truncate uppercase">
                          {s.business_name}
                        </h3>
                        <p className="text-[9px] font-bold text-base-content/50 uppercase tracking-widest flex items-center gap-1.5 mt-0.5">
                          <MapPin className="w-3 h-3 text-primary/60 shrink-0" />
                          <span className="truncate">{s.city || "S/D"}, {s.state || "S/E"}</span>
                        </p>
                      </div>
                    </div>
                    <ArrowRight className="w-4 h-4 text-base-content/20 group-hover:text-primary group-hover:translate-x-0.5 transition-all shrink-0 mt-1" />
                  </div>

                  <div className="flex items-center justify-between gap-4 pl-2">
                    <p className="text-[9px] font-black text-base-content/40 uppercase tracking-widest font-mono">
                      #OP-{s.lead_id}
                    </p>
                    <div
                      className={`px-3.5 py-1.5 rounded-full text-[9px] font-black uppercase tracking-widest border ${badge.bg} ${badge.color} ${badge.border}`}
                    >
                      {badge.label}
                    </div>
                  </div>

                  {/* Details Strip */}
                  <div className="mt-auto grid grid-cols-2 gap-6 pt-5 border-t border-base-content/10 pl-2">
                    <div className="space-y-1">
                      <p className="text-[9px] font-black text-base-content/50 uppercase tracking-widest">
                        Plan Side
                      </p>
                      <p className="text-xs font-black text-base-content uppercase truncate">
                        {s.plan_speed || "No asignado"}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="text-[9px] font-black text-base-content/50 uppercase tracking-widest">
                        Inversión
                      </p>
                      <p className="text-sm font-black text-base-content">
                        ${(s.plan_price || 0).toLocaleString("es-MX")}
                        <span className="text-[9px] text-base-content/45 ml-1">
                          MXN
                        </span>
                      </p>
                    </div>
                  </div>
                </div>
              </Link>
            );
          })}

          {/* Trailing ghost slot — turns leftover grid space into an
              invitation instead of dead air. */}
          <Link href="/solicitud/nueva" className="block group">
            <div className="h-full min-h-[176px] rounded-[1.5rem] border-2 border-dashed border-base-content/10 hover:border-primary/40 flex flex-col items-center justify-center gap-3 p-7 transition-all duration-300 hover:bg-primary/[0.03]">
              <div className="w-11 h-11 rounded-2xl bg-base-content/5 border border-base-content/10 flex items-center justify-center text-base-content/30 group-hover:text-primary group-hover:border-primary/30 group-hover:scale-110 transition-all">
                <Plus className="w-5 h-5" />
              </div>
              <p className="text-[10px] font-black text-base-content/40 group-hover:text-primary uppercase tracking-widest transition-colors">
                Nueva Solicitud
              </p>
            </div>
          </Link>
        </div>
      )}

      {/* ── Pagination ── */}
      {totalPages > 1 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-8 pt-12 border-t border-base-content/5">
          <p className="text-[10px] font-black text-base-content/50 uppercase tracking-widest">
            Visualizando{" "}
            <span className="text-base-content/40">
              {(page - 1) * PAGE_SIZE + 1}—
              {Math.min(page * PAGE_SIZE, filtered.length)}
            </span>{" "}
            de {filtered.length}
          </p>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page === 1}
              className="btn btn-ghost bg-base-200 p-0 w-12 h-12 rounded-2xl disabled:opacity-20"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
            <div className="flex gap-2">
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  onClick={() => setPage(p)}
                  className={`w-12 h-12 rounded-2xl text-[10px] font-black transition-all ${page === p ? "chip-selected scale-105" : "bg-base-200 border border-transparent text-base-content/45 hover:text-base-content"}`}
                >
                  {p}
                </button>
              ))}
            </div>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page === totalPages}
              className="btn btn-ghost bg-base-200 p-0 w-12 h-12 rounded-2xl disabled:opacity-20"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
