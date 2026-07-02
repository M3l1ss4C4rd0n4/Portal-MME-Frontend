"use client";

import { motion } from "framer-motion";
import { useState } from "react";

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  downloadTablero?: string;
  downloadParams?: Record<string, string>;
  downloadQueryString?: string;
  headerActions?: React.ReactNode;
}

export default function DashboardLayout({
  title,
  subtitle,
  children,
  downloadTablero,
  downloadParams,
  downloadQueryString,
  headerActions,
}: DashboardLayoutProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (!downloadTablero || downloading) return;

    setDownloading(true);
    try {
      let qs = "";
      if (downloadQueryString) {
        qs = "?" + downloadQueryString;
      } else if (downloadParams && Object.keys(downloadParams).length > 0) {
        qs = "?" + new URLSearchParams(
            Object.fromEntries(
              Object.entries(downloadParams).filter(([, v]) => v && v !== "TODOS" && v !== "all")
            )
          ).toString();
      }
      const res = await fetch(`/api/informes/${downloadTablero}/${qs}`, {
        cache: "no-store",
        signal: AbortSignal.timeout(60000),
      });

      if (!res.ok) {
        const err = await res.text();
        throw new Error(err || "Error al generar informe");
      }

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `Informe_${downloadTablero}_${new Date().toISOString().split("T")[0]}.pdf`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Error descargando informe:", err);
      alert("Error al descargar el informe. Por favor intente nuevamente.");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-2 flex items-start justify-between gap-4">
            <h1 className="text-3xl font-bold text-theme-primary">
              {title}
            </h1>
            {headerActions && (
              <div className="flex items-center gap-2 shrink-0">
                {headerActions}
              </div>
            )}
            {downloadTablero && (
              <button
                onClick={handleDownload}
                disabled={downloading}
                className="flex items-center gap-2 px-4 py-2 text-xs font-semibold rounded-xl
                  bg-amber-500/15 border border-amber-500/40 text-gold
                  hover:bg-amber-500/25 transition-colors disabled:opacity-40 disabled:cursor-wait
                  shrink-0"
                title="Descargar informe PDF"
              >
                {downloading ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    <span>Generando...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                    <span>PDF</span>
                  </>
                )}
              </button>
            )}
          </div>
          {subtitle && (
            <p className="text-theme-secondary mb-8">
              {subtitle}
            </p>
          )}

          {children}
        </motion.div>
      </div>
    </div>
  );
}
