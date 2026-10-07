import type { NextConfig } from "next";

// Base completa del backend Odoo (host + prefijo /api/portal).
// Se lee del mismo env que usa el cliente (`NEXT_PUBLIC_ODOO_API_BASE`).
const API_BASE =
  process.env.NEXT_PUBLIC_ODOO_API_BASE ?? "https://qa.wispi.cloud/api/portal";

// Host pelón de Odoo (sin el sufijo /api/portal), para rutas nativas del
// core que no viven bajo ese prefijo — p. ej. `/logo.png?company=<id>`
// (sirve `res.company.logo`, ruta pública auth='none' del propio Odoo).
const ODOO_HOST = API_BASE.replace(/\/api\/portal\/?$/, "");

const nextConfig: NextConfig = {
  experimental: {
    proxyClientMaxBodySize: 60 * 1024 * 1024,
  },
  // El proyecto es una app independiente: la raíz es esta carpeta.
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    // Proxy same-origin: el navegador solo ve estas rutas en ESTE origen
    // (sin CORS ni preflight), y Next reenvía server-side al backend Odoo.
    return [
      {
        source: "/api/portal/:path*",
        destination: `${API_BASE}/:path*`,
      },
      {
        // Logo de la compañía activa (Sidebar) — ruta nativa de Odoo.
        source: "/logo.png",
        destination: `${ODOO_HOST}/logo.png`,
      },
    ];
  },
};

export default nextConfig;
