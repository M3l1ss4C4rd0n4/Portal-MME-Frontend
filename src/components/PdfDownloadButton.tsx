"use client";

import { useState } from "react";

interface PdfDownloadButtonProps {
  tablero: string;
  params?: Record<string, string>;
}

export default function PdfDownloadButton({ tablero, params }: PdfDownloadButtonProps) {
  const [downloading, setDownloading] = useState(false);

  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      const qs = params && Object.keys(params).length > 0
        ? "?" + new URLSearchParams(
            Object.fromEntries(
              Object.entries(params).filter(([, v]) => v && v !== "TODOS" && v !== "all")
            )
          ).toString()
        : "";
      const res = await fetch(`/api/informes/${tablero}/${qs}`, {
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
      a.download = `Informe_${tablero}_${new Date().toISOString().split("T")[0]}.pdf`;
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
  );
}
