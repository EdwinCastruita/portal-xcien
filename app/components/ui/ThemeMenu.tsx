"use client";

import { Check, Palette } from "lucide-react";
import { useBrandTheme } from "../ThemeProvider";

const THEME_LABELS: Record<string, string> = {
  xcien: "XCIEN",
  luminet: "Luminet",
  huus: "Huus",
  dim: "Dim",
  obsidian: "Obsidian",
  aurora: "Aurora",
  dark: "Wispi",
  dracula: "Dracula",
  ivory: "Ivory",
  cupcake: "Cupcake",
  retro: "Retro",
};

/** Selector de tema en la barra superior (antes vivía en DashboardHeader). */
export default function ThemeMenu() {
  const { theme, themeOptions, setTheme } = useBrandTheme();

  return (
    <div className="dropdown dropdown-end">
      <label
        tabIndex={0}
        aria-label="Tema de colores"
        title="Tema de colores"
        className="btn btn-ghost bg-transparent border-none rounded-full h-11 w-11 md:h-14 md:w-14 p-0 flex items-center justify-center gap-0 relative text-base-content/40 hover:text-base-content hover:bg-base-content/10 active:scale-95"
      >
        <Palette className="w-5 h-5" />
        <span
          data-theme={theme}
          className="absolute bottom-2.5 right-2.5 md:bottom-3.5 md:right-3.5 w-2.5 h-2.5 rounded-full bg-primary border border-base-content/20"
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
        className="dropdown-content max-sm:!fixed max-sm:right-4 max-sm:top-16 sm:!absolute z-[100] card-premium elevate-3 p-3 w-64 mt-2 sm:mt-4"
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
                type="button"
                onClick={() => setTheme(t)}
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
  );
}
