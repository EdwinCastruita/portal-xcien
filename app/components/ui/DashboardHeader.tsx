"use client";

import { useEffect, useState } from "react";
import { User as UserIcon, LayoutGrid, Check } from "lucide-react";
import { useBrandTheme } from "../ThemeProvider";
import { apiFetch, getCookie, SESSION_COOKIE } from "../../lib/api";

function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 18) return "Buenas tardes";
  return "Buenas noches";
}

const THEME_LABELS: Record<string, string> = {
  dim: "Dim",
  obsidian: "Obsidian",
  aurora: "Aurora",
  dark: "Wispi",
  dracula: "Dracula",
  ivory: "Ivory",
  cupcake: "Cupcake",
  retro: "Retro",
};

export default function DashboardHeader() {
  const { theme, themeOptions, setTheme } = useBrandTheme();
  const [user, setUser] = useState<{
    name: string;
    email: string;
    company_name: string;
  } | null>(null);

  useEffect(() => {
    const sessionId = getCookie(SESSION_COOKIE);
    if (!sessionId) return;

    apiFetch("/me")
      .then((data) => {
        const u = data?.user;
        if (u) {
          setUser(u);
          if (u.company_name) {
            document.cookie = `company_name=${encodeURIComponent(u.company_name)}; path=/; max-age=86400`;
          }
        }
      })
      .catch(() => null);
  }, []);

  const displayName = user?.name || "Usuario";
  const firstName = displayName.split(" ")[0];
  const initials = displayName
    .split(" ")
    .slice(0, 2)
    .map((w: string) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-8 md:mb-10 gap-6 lg:gap-8 animate-fade-in relative">
      {/* Dynamic Background Blur */}
      <div className="absolute -left-20 -top-20 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      {/* ── Left: Greeting Area ── */}
      <div className="relative z-10 space-y-2">
        <p className="text-xs font-bold text-primary tracking-widest uppercase">
          ¡{getGreeting()}, {firstName}!
        </p>
        <h1 className="text-3xl sm:text-4xl xl:text-5xl font-black text-base-content tracking-tighter leading-none">
          PANEL DE CONTROL
        </h1>
        {user?.company_name && (
          <div className="flex items-center gap-3 pt-2">
            <div className="px-3 py-1 rounded-full bg-base-content/5 border border-base-content/10">
              <p className="text-[10px] text-base-content/70 font-black uppercase tracking-widest">
                {user.company_name}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* ── Right: User Controls Area ── */}
      <div className="flex items-center gap-2 sm:gap-3 w-full lg:w-auto">
        {/* Theme Selector — secondary weight, doesn't compete with user profile */}
        <div className="dropdown dropdown-end">
          <label
            tabIndex={0}
            className="btn btn-ghost bg-transparent border border-base-content/10 rounded-2xl h-12 md:h-14 px-4 md:px-5 flex items-center gap-2.5 text-base-content/50 hover:text-base-content hover:bg-base-200"
          >
            <LayoutGrid className="w-4 h-4" />
            {/* En xs solo icono + muestra de color para que el perfil quepa al lado. */}
            <span className="hidden sm:inline text-[10px] font-black uppercase tracking-widest">
              Tema de colores
            </span>
            <span className="sr-only sm:hidden">Tema de colores</span>
            <span
              data-theme={theme}
              className="w-3 h-3 rounded-full bg-primary border border-base-content/20 shrink-0"
            />
          </label>
          {/* `!absolute` es obligatorio: `card-premium` define `position:
              relative` (para su pseudo-elemento decorativo) fuera de
              cualquier `@layer` en globals.css, y por spec de CSS Cascade
              Layers eso gana SIEMPRE sobre el `position:absolute` de
              daisyUI (que sí vive dentro de una layer), sin importar
              especificidad. Sin el `!`, este panel deja de flotar y en
              vez de eso empuja todo el header hacia la derecha al abrirse. */}
          <div
            tabIndex={0}
            className="dropdown-content !absolute left-0 sm:left-auto z-30 card-premium elevate-3 p-3 w-[calc(100vw-2rem)] max-w-64 sm:w-64 mt-2"
          >
            <p className="text-[9px] font-black text-base-content/45 uppercase tracking-[0.25em] px-2 pt-1 pb-2">
              Tema visual
            </p>
            <div className="grid grid-cols-2 gap-2">
              {themeOptions.map((t) => {
                const active = theme === t;
                return (
                  <button
                    key={t}
                    onClick={() => setTheme(t as any)}
                    className={`relative flex items-center gap-2.5 rounded-xl px-3 py-3 text-left transition-all ${
                      active
                        ? "bg-primary/10 border border-primary/30"
                        : "bg-base-content/[0.03] border border-transparent hover:bg-base-content/[0.06]"
                    }`}
                  >
                    <span
                      data-theme={t}
                      className="w-4 h-4 rounded-full bg-primary border border-base-content/20 shrink-0"
                    />
                    <span
                      className={`text-[10px] font-black uppercase tracking-widest truncate ${active ? "text-primary" : "text-base-content/70"}`}
                    >
                      {THEME_LABELS[t] || t}
                    </span>
                    {active && (
                      <Check className="w-3 h-3 text-primary ml-auto shrink-0" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* User Profile */}
        <div className="flex items-center gap-3 md:gap-4 ml-auto lg:ml-0 min-w-0 bg-base-200 border border-base-content/5 rounded-2xl px-3 sm:px-5 py-1.5 md:py-2.5 elevate-1">
          <div className="text-right min-w-0 hidden sm:block">
            <p className="text-[11px] font-black text-base-content uppercase tracking-widest mb-0.5 truncate max-w-[14rem]">
              {displayName}
            </p>
            <p className="text-[9px] text-base-content/55 font-bold uppercase tracking-widest">
              Socio Comercial
            </p>
          </div>
          <div className="w-9 h-9 md:w-10 md:h-10 shrink-0 rounded-xl bg-primary flex items-center justify-center text-[10px] font-black text-primary-content shadow-lg shadow-primary/20">
            {initials || <UserIcon className="w-5 h-5" />}
          </div>
        </div>
      </div>
    </div>
  );
}
