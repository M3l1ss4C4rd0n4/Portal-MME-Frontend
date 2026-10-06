import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Modo servidor — permite API routes con acceso a PostgreSQL
  // output: 'export' eliminado intencionalmente (era modo estático)
  // Directorio de build. deploy.sh compila a '.next.staging' y hace swap atómico
  // al final, para que el proceso vivo nunca se quede sin su build mientras compila.
  // En runtime (`next start` bajo PM2) la variable NO está definida → '.next'.
  distDir: process.env.NEXT_DIST_DIR || '.next',
  images: {
    unoptimized: true,
  },
  trailingSlash: true,
  
  // Redirecciones para compatibilidad con rutas antiguas
  async redirects() {
    return [
      {
        source: '/dashboards/:path*',
        destination: '/:path*',
        permanent: true,
      },
    ];
  },
  
  // Headers de seguridad
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin',
          },
        ],
      },
      {
        source: '/energia',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
      {
        source: '/energia/:path*',
        headers: [
          {
            key: 'Cache-Control',
            value: 'no-cache, no-store, must-revalidate',
          },
        ],
      },
    ];
  },
};

export default nextConfig;
