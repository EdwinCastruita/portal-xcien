"use client";

import { Menu } from "lucide-react";
import { useMobileSidebar } from "./MobileSidebarContext";

/** Botón hamburguesa del topbar — solo visible por debajo del breakpoint `lg` (992px). */
export default function MobileMenuButton() {
  const { toggle } = useMobileSidebar();

  return (
    <button
      onClick={toggle}
      aria-label="Abrir menú de navegación"
      className="lg:hidden w-10 h-10 rounded-full flex items-center justify-center text-base-content/70 hover:text-base-content hover:bg-base-content/10 active:scale-95 transition-all shrink-0"
    >
      <Menu className="w-5 h-5" />
    </button>
  );
}
