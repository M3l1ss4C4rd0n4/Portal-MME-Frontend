"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import DashboardLayout from "@/components/DashboardLayout";

interface EstadoInforme {
  fecha: string;
  hayInformeDeHoy: boolean;
  html: string | null;
  pdf: string | null;
  ultimoDisponible: string | null;
  tableros: number;
  secciones: number;
}

/** Alto de arranque del marco antes de poder medir su contenido. */
const ALTO_INICIAL_PX = 900;
/** Margen para que la última línea no quede pegada al borde del marco. */
const HOLGURA_PX = 24;

/**
 * Entre semana no hay informe del día y eso es lo normal: se genera los
 * viernes. Avisar en ámbar de lunes a jueves entrenaría a ignorar el aviso,
 * así que solo se destaca cuando de verdad no hay ningún informe.
 */
function Aviso({ estado }: { estado: EstadoInforme }) {
  if (estado.hayInformeDeHoy) return null;
  const cuando = estado.ultimoDisponible;

  if (!cuando) {
    return (
      <div className="mb-4 rounded-lg border border-amber-500/40 bg-amber-500/10 px-4 py-3 text-sm text-theme-secondary">
        <strong className="text-gold">Todavía no hay ningún informe generado.</strong>{" "}
        El primero saldrá el viernes a las 7:00 a.m.
      </div>
    );
  }

  return (
    <div className="mb-4 rounded-lg border border-theme-primary bg-theme-secondary px-4 py-3 text-sm text-theme-secondary">
      Se muestra el informe del <strong className="text-theme-primary">{cuando}</strong>, el
      más reciente. El informe se genera los viernes a las 7:00 a.m. y se envía por correo
      y Telegram a las 8:00 a.m.
    </div>
  );
}

export default function InformeDireccionEnergiaPage() {
  const [estado, setEstado] = useState<EstadoInforme | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [alto, setAlto] = useState(ALTO_INICIAL_PX);
  const marcoRef = useRef<HTMLIFrameElement>(null);

  useEffect(() => {
    let vigente = true;
    fetch("/api/informe-direccion-energia/estado", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : Promise.reject(new Error(`HTTP ${r.status}`))))
      .then((d: EstadoInforme) => vigente && setEstado(d))
      .catch((e: unknown) =>
        vigente && setError(e instanceof Error ? e.message : "Error desconocido"),
      );
    return () => {
      vigente = false;
    };
  }, []);

  /**
   * Ajusta el marco al alto real del informe.
   *
   * El informe se sirve desde el mismo origen (`/api/...`), así que su documento
   * es accesible y se puede medir. Si alguna vez dejara de serlo, el bloque
   * falla en silencio y queda el alto inicial, que sigue siendo usable.
   */
  const ajustarAlto = useCallback(() => {
    try {
      const doc = marcoRef.current?.contentDocument;
      if (doc?.body) setAlto(doc.body.scrollHeight + HOLGURA_PX);
    } catch {
      /* origen distinto: se conserva el alto inicial */
    }
  }, []);

  useEffect(() => {
    const id = window.setInterval(ajustarAlto, 1000);
    return () => window.clearInterval(id);
  }, [ajustarAlto]);

  const acciones = (
    <a
      href="/api/informe-direccion-energia?formato=pdf"
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-2 rounded-lg border border-theme-primary bg-theme-secondary px-3 py-2 text-sm font-semibold text-theme-secondary transition-colors hover:border-gold hover:text-gold"
    >
      Descargar PDF
    </a>
  );

  return (
    <DashboardLayout
      title="Informe Semanal de Dirección de Energía"
      subtitle="Indicadores clave de Presupuesto, Supervisión, Subsidios y Comunidades Energéticas"
      headerActions={acciones}
    >
      {error && (
        <div className="mb-4 rounded-lg border border-red-500/40 bg-red-500/10 px-4 py-3 text-sm text-theme-secondary">
          <strong className="text-red-400">No se pudo consultar el estado del informe.</strong>{" "}
          El informe puede seguir disponible abajo. Detalle: {error}
        </div>
      )}
      {estado && <Aviso estado={estado} />}

      <iframe
        ref={marcoRef}
        src="/api/informe-direccion-energia"
        title="Informe Semanal de Dirección de Energía"
        onLoad={ajustarAlto}
        className="w-full rounded-xl border border-theme-primary bg-theme-secondary"
        style={{ height: `${alto}px` }}
      />
    </DashboardLayout>
  );
}
