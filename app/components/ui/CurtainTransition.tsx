"use client";

import { motion } from "framer-motion";
import Image from "next/image";
import { createContext, useCallback, useContext, useState } from "react";

/**
 * Transición de "cortinas" (clip-path wipe) inspirada en
 * https://motion.dev/examples/react-curtains-clip-wipe — dos paneles
 * diagonales que cierran cubriendo toda la pantalla (ocultando el salto de
 * ruta) y luego se abren revelando la página destino.
 *
 * Vive montada UNA sola vez en el layout raíz (`app/layout.tsx`), que no se
 * vuelve a montar entre navegaciones de Next — por eso el mismo overlay
 * puede "cerrar" en la página de login y "abrir" ya en el dashboard sin
 * ningún truco de sessionStorage ni estado compartido entre rutas.
 */

interface CurtainContextType {
  /** Cierra las cortinas, ejecuta `navigate` mientras la pantalla está
   *  cubierta, y luego las abre revelando el destino. */
  runTransition: (navigate: () => void) => void;
}

const CurtainContext = createContext<CurtainContextType | undefined>(undefined);

// Cada panel es un cuadrilátero con un borde diagonal (no un simple medio
// rectángulo) — es lo que le da el look de "cortina" en vez de una simple
// persiana. `OPEN_*` tiene ancho cero (invisible); `CLOSED_*` cubre su mitad
// de la pantalla con ~8% de solape diagonal para que no quede una rendija.
const OPEN_LEFT = "polygon(0% 0%, 0% 0%, 0% 100%, 0% 100%)";
const CLOSED_LEFT = "polygon(0% 0%, 54% 0%, 46% 100%, 0% 100%)";
const OPEN_RIGHT = "polygon(100% 0%, 100% 0%, 100% 100%, 100% 100%)";
const CLOSED_RIGHT = "polygon(46% 0%, 100% 0%, 100% 100%, 54% 100%)";

// Curva "expo" — mismo sabor que el resto del proyecto
// (`cubic-bezier(0.16,1,0.3,1)` ya se usa en `.card-premium`/`chip-selected`).
const EASE = [0.16, 1, 0.3, 1] as const;

const CLOSE_MS = 650;
const NAVIGATE_BUFFER_MS = 220; // deja pintar la página destino detrás de la cortina
const OPEN_MS = 750;

export function CurtainProvider({ children }: { children: React.ReactNode }) {
  const [phase, setPhase] = useState<"open" | "closed">("open");
  const [active, setActive] = useState(false);

  const runTransition = useCallback((navigate: () => void) => {
    setActive(true);
    setPhase("closed");
    setTimeout(() => {
      navigate();
      setTimeout(() => {
        setPhase("open");
        setTimeout(() => setActive(false), OPEN_MS);
      }, NAVIGATE_BUFFER_MS);
    }, CLOSE_MS);
  }, []);

  const isClosed = phase === "closed";

  return (
    <CurtainContext.Provider value={{ runTransition }}>
      {children}

      <div
        className={`fixed inset-0 z-[9999] ${active ? "pointer-events-auto" : "pointer-events-none"}`}
        aria-hidden="true"
      >
        <motion.div
          className="absolute inset-0 bg-gradient-to-br from-base-300 via-base-200 to-base-300"
          initial={false}
          animate={{ clipPath: isClosed ? CLOSED_LEFT : OPEN_LEFT }}
          transition={{
            duration: (isClosed ? CLOSE_MS : OPEN_MS) / 1000,
            ease: EASE,
          }}
        />
        <motion.div
          className="absolute inset-0 bg-gradient-to-bl from-base-300 via-base-200 to-base-300"
          initial={false}
          animate={{ clipPath: isClosed ? CLOSED_RIGHT : OPEN_RIGHT }}
          transition={{
            duration: (isClosed ? CLOSE_MS : OPEN_MS) / 1000,
            ease: EASE,
          }}
        />

        {/* Marca centrada — solo visible mientras la cortina está cerrada */}
        <motion.div
          className="absolute inset-0 flex items-center justify-center"
          initial={false}
          animate={{ opacity: isClosed ? 1 : 0, scale: isClosed ? 1 : 0.85 }}
          transition={{
            duration: 0.4,
            delay: isClosed ? 0.3 : 0,
            ease: EASE,
          }}
        >
          <div className="relative">
            <div className="absolute inset-0 bg-primary/30 blur-3xl rounded-full scale-150" />
            <Image
              src="/wispi-logo.png"
              alt=""
              width={64}
              height={64}
              className="relative z-10"
            />
          </div>
        </motion.div>
      </div>
    </CurtainContext.Provider>
  );
}

export function useCurtainTransition() {
  const ctx = useContext(CurtainContext);
  if (!ctx) {
    throw new Error(
      "useCurtainTransition debe usarse dentro de <CurtainProvider>",
    );
  }
  return ctx;
}
