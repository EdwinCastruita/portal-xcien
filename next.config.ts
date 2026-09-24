import type { NextConfig } from "next";

// Base completa del backend Odoo (host + prefijo /api/portal).
// Se lee del mismo env que usa el cliente (`NEXT_PUBLIC_ODOO_API_BASE`).
const API_BASE =
  process.env.NEXT_PUBLIC_ODOO_API_BASE ?? "https://qa.wispi.cloud/api/portal";

const nextConfig: NextConfig = {
  // El proyecto es una app independiente: la raíz es esta carpeta.
  turbopack: {
    root: __dirname,
  },
  async rewrites() {
    // Proxy same-origin: el navegador solo ve /api/portal/* en ESTE origen
    // (sin CORS ni preflight), y Next reenvía server-side al backend Odoo.
    return [
      {
        source: "/api/portal/:path*",
        destination: `${API_BASE}/:path*`,
      },
    ];
  },
};

export default nextConfig;
