"use client";

import { createContext, useContext, useEffect, useState } from "react";

type Theme =
  | "dim"
  | "dark"
  | "cupcake"
  | "retro"
  | "dracula"
  | "obsidian"
  | "aurora"
  | "ivory";

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
  const [theme, setThemeState] = useState<Theme>("dim");
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

  const setTheme = (newTheme: Theme) => {
    setThemeState(newTheme);
    document.documentElement.setAttribute("data-theme", newTheme);
    document.cookie = `app_theme=${newTheme}; path=/; max-age=31536000`;
  };

  useEffect(() => {
    const savedTheme = getCookie("app_theme") as Theme;
    if (savedTheme && themeOptions.includes(savedTheme)) {
      setTheme(savedTheme);
    } else {
      setTheme("dim");
    }
  }, []);

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
