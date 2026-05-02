import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Modo servidor — permite API routes con acceso a PostgreSQL
  // output: 'export' eliminado intencionalmente (era modo estático)
  distDir: '.next',
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
    ];
  },
};

export default nextConfig;
