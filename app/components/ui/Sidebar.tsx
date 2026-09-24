"use client";

import { useEffect, useState } from "react";
import {
  LayoutDashboard,
  FilePlus2,
  List,
  Settings,
  LogOut,
  X,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { apiFetch, getCookie, SESSION_COOKIE } from "../../lib/api";
import { useMobileSidebar } from "./MobileSidebarContext";

const navItems = [
  { icon: LayoutDashboard, label: "Dashboard", href: "/dashboard" },
  { icon: FilePlus2, label: "Nueva", href: "/solicitud/nueva" },
  { icon: List, label: "Solicitudes", href: "/solicitudes" },
  { icon: Settings, label: "Config", href: "/configuracion" },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const { isOpen, close } = useMobileSidebar();

  const [companyId, setCompanyId] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [logoError, setLogoError] = useState(false);

  useEffect(() => {
    setCompanyId(getCookie("company_id"));
    setCompanyName(getCookie("company_name"));
  }, []);

  const showLogo = Boolean(companyId) && !logoError;

  const handleLogout = async () => {
    try {
      await apiFetch("/logout", { method: "POST" });
    } catch (err) {
      // La sesión se limpia igual del lado cliente aunque el backend falle;
      // solo lo logueamos para poder diagnosticarlo si vuelve a pasar.
      console.error("Error al cerrar sesión en el backend", err);
    }
    const expire = "expires=Thu, 01 Jan 1970 00:00:00 GMT";
    [
      SESSION_COOKIE,
      "user_name",
      "user_email",
      "company_id",
      "company_name",
    ].forEach((k) => (document.cookie = `${k}=; path=/; ${expire}`));
    router.push("/");
  };

  return (
    <>
      {/* Overlay oscuro detrás del panel — solo en mobile, y solo mientras
          está abierto. Tocarlo cierra el menú (igual que arrastrar/tocar
          afuera de cualquier drawer estándar). */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 md:hidden animate-fade-in"
          onClick={close}
          aria-hidden="true"
        />
      )}

      {/* Fixed to the viewport, not the flex layout — guarantees it always
          spans the full window height regardless of sibling content height,
          scroll position, or flex quirks.
          En mobile vive fuera de pantalla (-translate-x-full) hasta que
          `isOpen` lo desliza a la vista; en `md:` y superior siempre está
          visible como antes. */}
      <aside
        className={`fixed left-0 top-0 h-screen w-64 flex flex-col py-8 px-4 shrink-0 border-r border-primary/10 overflow-y-auto custom-scrollbar z-[60] transition-transform duration-300 ease-in-out ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        } md:translate-x-0`}
        style={{
          background:
            "linear-gradient(180deg, var(--color-base-200) 0%, var(--color-base-200) 60%, var(--color-base-300) 100%)",
        }}
      >
        {/* ambient corner glow so the panel doesn't read as a flat block */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-72 h-72 bg-primary/[0.08] blur-[100px] rounded-full" />
        <div className="pointer-events-none absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-t from-primary/[0.04] to-transparent" />

        {/* Botón de cerrar — solo mobile, ya que en desktop el panel nunca
            se oculta y no tiene sentido un botón de cierre. */}
        <div className="relative flex justify-end mb-4 md:hidden">
          <button
            onClick={close}
            aria-label="Cerrar menú de navegación"
            className="w-9 h-9 rounded-full flex items-center justify-center text-base-content/60 hover:text-base-content hover:bg-base-content/10 transition-all"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* ── Brand Logo Area ──
            Apilado en columna a propósito: el logo arriba, grande y a todo
            el ancho disponible (se ve mejor que apretado en una fila), y el
            texto debajo con espacio propio para extenderse/envolver cuando
            el nombre de la compañía es largo (antes competía por ancho con
            el logo al estar lado a lado). */}
        <div
          className="relative px-3 mb-10 flex flex-col gap-4 group cursor-pointer"
          onClick={() => router.push("/dashboard")}
        >
          <h1 className="text-lg font-bold tracking-tight text-base-content leading-tight">
              Portal Comercial
            </h1>
          <div
            className={`rounded-2xl flex items-center justify-center overflow-hidden transition-transform duration-300 group-hover:scale-[1.02] ${
              showLogo
                ? "w-full h-28 bg-white p-4 shadow-md border border-black/5"
                : "w-14 h-14 bg-primary shadow-[0_8px_20px_-6px_var(--brand-accent-glow)]"
            }`}
          >
            
            {showLogo ? (
              <img
                src={`/logo.png?company=${companyId}`}
                alt={companyName || "Logo"}
                className="w-full h-full object-contain"
                onError={() => setLogoError(true)}
              />
            ) : (
              <div className="flex gap-[3px] items-end" style={{ height: "18px" }}>
                <div className="w-[3px] h-full bg-primary-content rounded-full" />
                <div className="w-[3px] h-[65%] bg-primary-content/70 rounded-full" />
                <div className="w-[3px] h-[35%] bg-primary-content/40 rounded-full" />
              </div>
            )}
          </div>
          <div>
            
            <p className="text-[9px] text-center font-bold text-primary tracking-[0.2em] uppercase mt-1.5 leading-relaxed">
              {companyName ? `${companyName}` : "Ventas"}
            </p>
          </div>
        </div>

        {/* ── Navigation ── */}
        <p className="relative px-4 mb-3 text-[9px] font-black text-base-content/35 uppercase tracking-[0.25em]">
          Menú
        </p>
        <nav className="relative flex flex-col gap-1.5">
          {navItems.map(({ icon: Icon, label, href }) => {
            const isActive = pathname === href || pathname.startsWith(href + "/");
            const isDisabled = href === "/configuracion";

            if (isDisabled) {
              return (
                <div
                  key={href}
                  className="flex items-center gap-4 px-4 py-3.5 rounded-xl opacity-25 cursor-not-allowed"
                >
                  <Icon className="w-[18px] h-[18px] text-base-content/40" />
                  <span className="text-sm font-bold tracking-tight text-base-content/40">
                    {label}
                  </span>
                  <span className="ml-auto text-[8px] font-black uppercase tracking-widest text-base-content/25 border border-base-content/10 rounded-full px-2 py-0.5">
                    Pronto
                  </span>
                </div>
              );
            }

            return (
              <Link
                key={href}
                href={href}
                className={`relative flex items-center gap-4 px-4 py-3.5 rounded-xl group ${
                  isActive
                    ? "chip-selected"
                    : "text-base-content/55 hover:bg-base-content/[0.06] hover:text-base-content border border-transparent"
                }`}
                style={{ transition: "all 0.3s cubic-bezier(0.16,1,0.3,1)" }}
              >
                {isActive && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 rounded-full bg-primary" />
                )}
                <Icon
                  className={`w-[18px] h-[18px] transition-transform group-hover:scale-110 ${isActive ? "text-primary" : ""}`}
                />
                <span className="text-sm font-bold tracking-tight">
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        {/* Fills the rest of the column with intent instead of dead air —
            a real link, not decoration, so it isn't another dead-looking
            element pretending to be clickable. */}
        <div className="relative flex-1 flex items-end justify-center pb-6 pt-10">
          <Link
            href="/solicitud/nueva"
            className="group/promo w-full rounded-2xl border border-dashed border-primary/20 hover:border-primary/40 bg-primary/[0.03] hover:bg-primary/[0.07] p-4 text-center transition-all"
          >
            <p className="text-[9px] font-black text-primary/70 group-hover/promo:text-primary uppercase tracking-widest leading-relaxed transition-colors">
              Vende más rápido
            </p>
            <p className="text-[9px] font-bold text-base-content/35 uppercase tracking-widest mt-1 leading-relaxed">
              Crea tu siguiente solicitud
            </p>
          </Link>
        </div>

        {/* ── Footer / Logout ── */}
        <div className="relative pt-4 border-t border-base-content/10">
          <button
            onClick={handleLogout}
            className="flex items-center gap-4 px-4 py-3.5 w-full rounded-xl transition-all duration-300 text-base-content/50 hover:bg-error/10 hover:text-error group"
          >
            <LogOut className="w-[18px] h-[18px] transition-transform group-hover:-translate-x-1" />
            <span className="text-sm font-bold tracking-tight">
              Cerrar Sesión
            </span>
          </button>
        </div>
      </aside>

      {/* Spacer so the fixed sidebar doesn't overlap flow content — solo
          reserva espacio en `md:` y superior; en mobile el panel vive fuera
          de pantalla y no debe robarle ancho al contenido. */}
      <div className="hidden md:block w-64 shrink-0" aria-hidden="true" />
    </>
  );
}
