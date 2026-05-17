"use client";

import { useEffect } from "react";

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[Dashboard Error]", error);
  }, [error]);

  return (
    <div className="min-h-screen bg-theme-primary flex items-center justify-center px-4">
      <div className="max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-red-500/10 flex items-center justify-center">
          <svg
            className="w-8 h-8 text-red-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={2}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
            />
          </svg>
        </div>

        <h2 className="text-xl font-bold text-theme-primary mb-2">
          Error al cargar el dashboard
        </h2>
        <p className="text-sm text-theme-secondary mb-6">
          Ocurrió un problema al renderizar esta página. Intente recargar o
          regrese al inicio.
        </p>

        {error.digest && (
          <p className="text-[10px] text-theme-muted font-mono mb-6 bg-theme-secondary rounded px-3 py-2 break-all">
            Error ID: {error.digest}
          </p>
        )}

        <div className="flex items-center justify-center gap-3">
          <button
            onClick={reset}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors"
          >
            Reintentar
          </button>
          <a
            href="/"
            className="px-4 py-2 border border-theme-card hover:border-amber-500/50 text-theme-secondary text-sm font-medium rounded-lg transition-colors"
          >
            Ir al inicio
          </a>
        </div>
      </div>
    </div>
  );
}
