"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

type Theme =
  | "dim"
  | "dark"
  | "cupcake"
  | "retro"
  | "dracula"
  | "obsidian"
  | "aurora"
  | "ivory";

// La pantalla de login siempre debe verse con el tema "Wispi" (valor interno
// "dark"), sin importar qué tema haya elegido el usuario para el dashboard.
// Todo lo demás queda a elección del usuario (persistido en la cookie).
const LOGIN_ROUTE = "/";
const FORCED_LOGIN_THEME: Theme = "dark";

interface ThemeContextType {
  theme: Theme;
  themeOptions: Theme[];
  setTheme: (t: Theme) => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

function getCookie(name: string) {
  if (typeof document === "undefined") return "";
  const value = `; ${document.cookie}`;
  const parts = value.split(`; ${name}=`);
  if (parts.length === 2)
    return decodeURIComponent(parts.pop()?.split(";").shift() || "");
  return "";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLoginRoute = pathname === LOGIN_ROUTE;
  const [theme, setThemeState] = useState<Theme>("dark");
  const themeOptions: Theme[] = [
    "dim",
    "obsidian",
    "aurora",
    "dark",
    "dracula",
    "ivory",
    "cupcake",
    "retro",
  ];

  /** Aplica un tema al DOM sin tocar la cookie (uso interno). */
  const applyTheme = (t: Theme) => {
    setThemeState(t);
    document.documentElement.setAttribute("data-theme", t);
  };

  /** Aplica un tema Y lo persiste como preferencia del usuario. */
  const setTheme = (newTheme: Theme) => {
    applyTheme(newTheme);
    document.cookie = `app_theme=${newTheme}; path=/; max-age=31536000`;
  };

  useEffect(() => {
    // El login siempre se ve con el tema Wispi, sin importar la preferencia
    // guardada — no se toca la cookie, así que al volver al dashboard se
    // restaura el tema que el usuario había elegido.
    if (isLoginRoute) {
      applyTheme(FORCED_LOGIN_THEME);
      return;
    }
    const savedTheme = getCookie("app_theme") as Theme;
    if (savedTheme && themeOptions.includes(savedTheme)) {
      applyTheme(savedTheme);
    } else {
      applyTheme("dark");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoginRoute]);

  return (
    <ThemeContext.Provider value={{ theme, themeOptions, setTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useBrandTheme = () => {
  const context = useContext(ThemeContext);
  if (!context)
    throw new Error("useBrandTheme must be used within ThemeProvider");
  return context;
};
