"use client";

import { useEffect, useState } from "react";
import { User as UserIcon, LayoutGrid, Check } from "lucide-react";
import { useBrandTheme } from "../ThemeProvider";
import { apiFetch, getCookie } from "../../lib/api";

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
    const sessionId = getCookie("session_id");
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
    <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-10 gap-8 animate-fade-in relative">
      {/* Dynamic Background Blur */}
      <div className="absolute -left-20 -top-20 w-64 h-64 bg-primary/5 blur-[100px] rounded-full pointer-events-none" />

      {/* ── Left: Greeting Area ── */}
      <div className="relative z-10 space-y-2">
        <p className="text-xs font-bold text-primary tracking-widest uppercase">
          ¡{getGreeting()}, {firstName}!
        </p>
        <h1 className="text-4xl md:text-5xl font-black text-base-content tracking-tighter leading-none">
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
      <div className="flex items-center gap-3 w-full md:w-auto">
        {/* Theme Selector — secondary weight, doesn't compete with user profile */}
        <div className="dropdown dropdown-end">
          <label
            tabIndex={0}
            className="btn btn-ghost bg-transparent border border-base-content/10 rounded-2xl h-14 px-5 flex items-center gap-2.5 text-base-content/50 hover:text-base-content hover:bg-base-200"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="text-[10px] font-black uppercase tracking-widest">
              Diseño
            </span>
            <span
              data-theme={theme}
              className="w-3 h-3 rounded-full bg-primary border border-base-content/20 shrink-0"
            />
          </label>
          <div
            tabIndex={0}
            className="dropdown-content z-30 card-premium elevate-3 p-3 w-64 mt-2"
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
        <div className="flex items-center gap-4 bg-base-200 border border-base-content/5 rounded-2xl px-5 py-2.5 elevate-1">
          <div className="text-right hidden sm:block">
            <p className="text-[11px] font-black text-base-content uppercase tracking-widest mb-0.5">
              {displayName}
            </p>
            <p className="text-[9px] text-base-content/55 font-bold uppercase tracking-widest">
              Socio Comercial
            </p>
          </div>
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center text-[10px] font-black text-primary-content shadow-lg shadow-primary/20">
            {initials || <UserIcon className="w-5 h-5" />}
          </div>
        </div>
      </div>
    </div>
  );
}
