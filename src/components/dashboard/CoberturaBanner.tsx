"use client";

import { motion } from "framer-motion";
import { fmtNum } from "@/lib/format";
import type { CoberturaSicom } from "@/lib/sicom";

/**
 * Franja de cobertura y conciliación de una base SICOM.
 *
 * Existe porque dos de las cuatro bases llegan incompletas y el Power BI
 * original no lo advierte:
 *   · Compras EDS está cortado en el límite de filas de Excel (1.048.576).
 *   · Compras no cuadra con la fila "Total general" de su propio export.
 *
 * El Informe de Metodología §17 pide explícitamente "validación de totales
 * antes y después de la transformación" y §19 distinguir la fecha del dato de
 * la fecha de actualización del tablero. Esta franja materializa ambas cosas:
 * las cifras las calcula el ETL en cada carga y las guarda en
 * hidrocarburos.sicom_carga_control.
 */

interface Props {
  cobertura: CoberturaSicom | null;
  /** Nombre legible de la medida, para el texto del desvío. */
  unidadMedida?: string;
  delay?: number;
}

function fmtFecha(iso: string | null): string {
  if (!iso) return "—";
  return new Date(iso).toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default function CoberturaBanner({ cobertura, unidadMedida, delay = 0 }: Props) {
  if (!cobertura) return null;

  const { truncado, concilia, gapPct, gapAbs, totalCubo, filasCargadas, identidades } = cobertura;
  const esCubo = cobertura.fuente === "cubo";
  const hayProblema = truncado || concilia === false;

  const tono = hayProblema
    ? "bg-amber-500/10 border-amber-500/40"
    : "bg-emerald-500/5 border-emerald-500/25";

  const titulo = truncado
    ? "Cobertura parcial de los datos"
    : concilia === false
      ? "El detalle no concilia con la fuente"
      : esCubo
        ? "Datos tomados directamente del cubo y conciliados"
        : "Datos conciliados con la fuente";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay }}
      className={`border rounded-xl px-4 py-3 mb-5 ${tono}`}
    >
      <div className="flex items-start gap-3">
        <span className="text-base leading-none mt-0.5 shrink-0" aria-hidden="true">
          {hayProblema ? "⚠️" : "✓"}
        </span>

        <div className="min-w-0 flex-1">
          <div
            className={`text-[11px] font-bold uppercase tracking-widest mb-1 ${
              hayProblema ? "text-amber-400" : "text-emerald-400"
            }`}
          >
            {titulo}
          </div>

          {truncado && (
            <p className="text-[11px] text-theme-secondary leading-relaxed">
              El archivo que publica la Dirección de Hidrocarburos llegó al límite
              físico de filas de Excel ({fmtNum(filasCargadas)}) y quedó cortado
              alfabéticamente por comprador: cubre de{" "}
              <strong className="text-theme-primary">{cobertura.primeraClave}</strong> a{" "}
              <strong className="text-theme-primary">{cobertura.ultimaClave}</strong>.
              Las cifras de este tablero <strong className="text-amber-400">no
              representan el total nacional</strong>.
            </p>
          )}

          {!truncado && concilia === false && (
            <p className="text-[11px] text-theme-secondary leading-relaxed">
              La suma del detalle cargado es{" "}
              <strong className="text-theme-primary">{fmtNum(cobertura.sumaDetalle ?? 0)}</strong>,
              pero la fuente declara{" "}
              <strong className="text-theme-primary">{fmtNum(totalCubo ?? 0)}</strong>.
              Faltan <strong className="text-amber-400">{fmtNum(Math.abs(gapAbs ?? 0))}</strong>
              {unidadMedida ? ` ${unidadMedida}` : ""} (
              {Math.abs(gapPct ?? 0).toFixed(2)}%).
            </p>
          )}

          {!hayProblema && esCubo && (
            <p className="text-[11px] text-theme-secondary leading-relaxed">
              {fmtNum(filasCargadas)} registros extraídos del cubo OLAP de SICOM, sin pasar
              por exportación manual a Excel.{" "}
              {identidades != null ? (
                <>
                  El conteo de{" "}
                  <strong className="text-theme-primary">{fmtNum(identidades)}</strong>{" "}
                  coincide exactamente con el total que declara el cubo.
                </>
              ) : (
                <>La suma del detalle coincide exactamente con el total que declara el cubo.</>
              )}
            </p>
          )}

          {!hayProblema && !esCubo && (
            <p className="text-[11px] text-theme-secondary leading-relaxed">
              {fmtNum(filasCargadas)} registros cargados. La suma del detalle cuadra con
              el total declarado por el cubo
              {gapPct != null ? ` (desvío ${Math.abs(gapPct).toFixed(2)}%)` : ""}.
            </p>
          )}

          <div className="text-[10px] text-theme-muted mt-1.5 flex flex-wrap gap-x-4 gap-y-0.5">
            <span>Fuente: SICOM · cubo «{cobertura.hoja}»</span>
            <span>
              {esCubo ? "Catálogo: " : "Archivo: "}
              {cobertura.archivoFuente}
            </span>
            {!esCubo && <span>Corte del dato: {fmtFecha(cobertura.fechaDato)}</span>}
            <span>Actualizado: {fmtFecha(cobertura.fechaCarga)}</span>
            <span className={esCubo ? "text-emerald-400/80" : "text-amber-400/80"}>
              {esCubo ? "conexión directa al cubo" : "exportación manual a Excel"}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}
