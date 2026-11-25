import type { MetadataRoute } from "next";

// Permite instalar el portal en la pantalla de inicio del celular. Abre
// directo en la sección de asistencia, la única que funciona sin señal
// (ver `public/sw.js`).
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Wispi Portal",
    short_name: "Wispi",
    description: "Portal Wispi · XCIEN: solicitudes y control de asistencia.",
    start_url: "/asistencia",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#131418",
    theme_color: "#131418",
    lang: "es-MX",
    icons: [
      {
        src: "/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
    ],
  };
}
