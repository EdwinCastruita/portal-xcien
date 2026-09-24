"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname } from "next/navigation";

interface MobileSidebarContextType {
  isOpen: boolean;
  open: () => void;
  close: () => void;
  toggle: () => void;
}

const MobileSidebarContext = createContext<MobileSidebarContextType | undefined>(
  undefined,
);

/**
 * Estado global (solo cliente) de si el menú de navegación móvil está
 * abierto. Lo consumen `MobileMenuButton` (botón hamburguesa en el topbar)
 * y `Sidebar` (el panel que se desliza + su overlay).
 */
export function MobileSidebarProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  // Cierra el menú automáticamente al navegar a otra página — de lo
  // contrario, tras tocar un link, el overlay seguía tapando la página de
  // destino porque nada lo cerraba.
  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  // Bloquea el scroll del body detrás del overlay mientras el menú está abierto.
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [isOpen]);

  return (
    <MobileSidebarContext.Provider
      value={{
        isOpen,
        open: () => setIsOpen(true),
        close: () => setIsOpen(false),
        toggle: () => setIsOpen((v) => !v),
      }}
    >
      {children}
    </MobileSidebarContext.Provider>
  );
}

export function useMobileSidebar() {
  const ctx = useContext(MobileSidebarContext);
  if (!ctx) {
    throw new Error(
      "useMobileSidebar debe usarse dentro de <MobileSidebarProvider>",
    );
  }
  return ctx;
}
