import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // El proyecto es una app independiente: la raíz es esta carpeta.
  turbopack: {
    root: __dirname,
  },
};

export default nextConfig;
