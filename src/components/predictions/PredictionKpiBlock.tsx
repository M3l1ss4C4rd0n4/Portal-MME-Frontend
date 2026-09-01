"use client";

import { motion } from "framer-motion";
import { classifyOni } from "@/lib/oni";
import { fmtDate, fmtShortDate } from "@/types/predictions";
import type { PredictionPoint } from "@/types/predictions";
import { InfoTooltip } from "@/components/ui/InfoTooltip";

interface PredictionKpiBlockProps {
  pico: { valor: number; fecha: string } | null;
  metaFecha: string | null;
  mape: number;
  confianza: number;
  coberturaCi?: number | null;
  mapeEsRiguroso?: boolean;
  nDiasBacktest?: number | null;
  mapeRangoMin?: number | null;
  mapeRangoMax?: number | null;
  climaPico?: PredictionPoint;
  climaMeta?: PredictionPoint;
}

function fraseClimaPunto(etiqueta: string, fecha: string, p?: PredictionPoint): string | null {
  if (!p || (p.oni == null && p.pdo == null && p.soi == null && p.gmst == null)) return null;
  const partes: string[] = [];
  if (p.oni != null) {
    const clasificacion = classifyOni(p.oni);
    partes.push(`ONI ${p.oni > 0 ? "+" : ""}${p.oni.toFixed(2)}°C${clasificacion ? ` (${clasificacion.label})` : ""}`);
  }
  if (p.pdo != null) partes.push(`PDO ${p.pdo > 0 ? "+" : ""}${p.pdo.toFixed(2)}`);
  if (p.soi != null) partes.push(`SOI ${p.soi > 0 ? "+" : ""}${p.soi.toFixed(1)}`);
  if (p.gmst != null) partes.push(`una anomalía global de temperatura de +${p.gmst.toFixed(2)}°C`);
  return `En ${etiqueta} (${fmtShortDate(fecha)}): ${partes.join(", ")}.`;
}

/** Tarjeta KPI del pico/meta de predicción de embalses, con contexto climático (ONI/PDO/SOI/GMST). */
export default function PredictionKpiBlock({
  pico,
  metaFecha,
  mape,
  confianza,
  coberturaCi,
  mapeEsRiguroso,
  nDiasBacktest,
  mapeRangoMin,
  mapeRangoMax,
  climaPico,
  climaMeta,
}: PredictionKpiBlockProps) {
  // Fase 41 (2026-08-30): el error real varía según el año de corte usado
  // para entrenar — cuando hay más de un año evaluado, se muestra el rango
  // en vez de un solo número que sugeriría más certeza de la que hay.
  const hayRangoReal =
    mapeRangoMin != null && mapeRangoMax != null && mapeRangoMax > mapeRangoMin;
  const mapeTexto = hayRangoReal
    ? `${(mapeRangoMin * 100).toFixed(1)}%–${(mapeRangoMax * 100).toFixed(1)}%`
    : `${(mape * 100).toFixed(1)}%`;
  const picoTitle = pico
    ? `El modelo de predicción proyecta que los embalses alcanzarán su nivel más alto de los próximos meses el ${fmtDate(pico.fecha)}, con ${pico.valor.toFixed(2)}% de la capacidad total. Después de esa fecha, se espera que empiecen a bajar de nuevo.`
    : undefined;

  const metaTitle = metaFecha
    ? `El 80% es el umbral que XM y el Gobierno usan como referencia de un nivel saludable de reservas hídricas para el sistema eléctrico. Según el modelo, los embalses superarán ese umbral el ${fmtDate(metaFecha)} y se mantendrán por encima durante varios meses.`
    : `El modelo no proyecta que los embalses alcancen el umbral saludable del 80% en el horizonte calculado.`;

  const confianzaTitle = hayRangoReal
    ? `El error real varía según el año usado para entrenar el modelo — se corrió esta misma validación con distintos años de corte y el error observado fue entre ${mapeTexto}, no un valor fijo. Depende de qué tan parecidas fueron las condiciones climáticas del período validado a las del entrenamiento.`
    : mapeEsRiguroso
    ? `MAPE de una validación rigurosa: el modelo se entrenó solo con datos de un año de corte hacia atrás y se comparó contra ${nDiasBacktest ?? "cientos de"} días reales que vinieron después, sin haberlos visto — un MAPE de ${(mape * 100).toFixed(1)}% en esa prueba real. ` +
      (coberturaCi != null
        ? `De cada 100 de esos días reales, el valor real cayó dentro del rango sombreado del gráfico en ${(coberturaCi * 100).toFixed(0)} de ellos.`
        : "")
    : `MAPE es el error promedio que tuvo este modelo en una prueba interna con 180 días de historia: un MAPE de ${(mape * 100).toFixed(1)}% ahí. ` +
      (coberturaCi != null
        ? `De cada 100 días de esa prueba interna, el valor real cayó dentro del rango sombreado del gráfico en ${(coberturaCi * 100).toFixed(0)} de ellos.`
        : "");

  const climaIntro =
    "Estos son los indicadores climáticos que alimenta el modelo de predicción. " +
    "ONI mide la temperatura del océano Pacífico: cuando sube, estamos en El Niño (menos lluvia y embalses que bajan); cuando baja, en La Niña (más lluvia). " +
    "PDO y SOI son señales climáticas de más largo plazo que refuerzan esa misma tendencia, y GMST indica cuánto más caliente está el planeta que el promedio histórico, lo que intensifica las sequías.";

  const climaDetalle = [
    pico && fraseClimaPunto("el pico proyectado", pico.fecha, climaPico),
    metaFecha && fraseClimaPunto("la fecha en que se alcanza la meta del 80%", metaFecha, climaMeta),
  ].filter(Boolean);

  const climaContent = climaPico && (
    <div className="space-y-1.5">
      <p>{climaIntro}</p>
      <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 pt-0.5">
        {climaPico.oni != null && (
          <span style={{ color: classifyOni(climaPico.oni)?.color ?? "#94A3B8" }}>
            ONI {climaPico.oni > 0 ? "+" : ""}{climaPico.oni.toFixed(2)}
          </span>
        )}
        {climaPico.pdo != null && (
          <span style={{ color: "#94A3B8" }}>PDO {climaPico.pdo > 0 ? "+" : ""}{climaPico.pdo.toFixed(2)}</span>
        )}
        {climaPico.soi != null && (
          <span style={{ color: "#94A3B8" }}>SOI {climaPico.soi > 0 ? "+" : ""}{climaPico.soi.toFixed(1)}</span>
        )}
        {climaPico.gmst != null && (
          <span style={{ color: "#94A3B8" }}>GMST +{climaPico.gmst.toFixed(2)}</span>
        )}
      </div>
      {climaDetalle.length > 0 && <p className="pt-1 border-t border-theme-primary/10">{climaDetalle.join(" ")}</p>}
    </div>
  );

  return (
    <div className="h-full flex flex-col text-center gap-1.5 px-3 py-2.5 bg-card-glow-energia border border-card-energia border-t-2 border-t-[var(--color-title-energia)] rounded-xl">
      {/* Encabezado: título a la izquierda, estado de la meta como badge arriba a la derecha */}
      <div className="flex items-start justify-between gap-2">
        <p className="text-theme-muted text-xs xl:text-sm uppercase tracking-[0.14em] font-semibold text-left">
          Proyección Embalses
        </p>
        <div
          className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] xl:text-xs font-bold tracking-wider uppercase whitespace-nowrap"
          style={{
            background: metaFecha ? "#10B98122" : "#94A3B822",
            border: `1px solid ${metaFecha ? "#10B98155" : "#94A3B855"}`,
            color: metaFecha ? "#10B981" : "#94A3B8",
          }}
          title={metaTitle}
        >
          <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: metaFecha ? "#10B981" : "#94A3B8" }} />
          {metaFecha ? "Meta 80%" : "Sin meta 80%"}
        </div>
      </div>

      {/* Valor principal */}
      <div className="text-3xl xl:text-4xl 2xl:text-5xl font-extrabold leading-none tabular-nums text-theme-primary" title={picoTitle}>
        {pico ? `${pico.valor.toFixed(2)}%` : "—"}
      </div>

      {/* Secundario: fecha del pico + indicadores climáticos (ONI/PDO/SOI/GMST) al lado */}
      <p className="text-slate-300 text-xs xl:text-sm font-medium flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0" title={picoTitle}>
        <span>{pico ? `Pico el ${fmtShortDate(pico.fecha)}` : "Pico proyectado"}</span>
        {climaPico?.oni != null && (
          <span style={{ color: classifyOni(climaPico.oni)?.color ?? "#94A3B8" }}>
            · ONI {climaPico.oni > 0 ? "+" : ""}{climaPico.oni.toFixed(2)}
          </span>
        )}
        {climaPico?.pdo != null && (
          <span style={{ color: "#94A3B8" }}>PDO {climaPico.pdo > 0 ? "+" : ""}{climaPico.pdo.toFixed(2)}</span>
        )}
        {climaPico?.soi != null && (
          <span style={{ color: "#94A3B8" }}>SOI {climaPico.soi > 0 ? "+" : ""}{climaPico.soi.toFixed(1)}</span>
        )}
        {climaPico?.gmst != null && (
          <span style={{ color: "#94A3B8" }}>GMST +{climaPico.gmst.toFixed(2)}</span>
        )}
        {climaContent && <InfoTooltip content={climaContent} wide />}
      </p>

      {/* Barra de progreso con degradado — refuerzo visual del % (escala 0-100%), misma firma
          que las tarjetas vecinas; ya cumple la función de separador, sin línea divisoria aparte */}
      {pico && (
        <div>
          <div className="w-full h-1.5 rounded-full bg-theme-tertiary overflow-hidden">
            <motion.div
              className="h-full rounded-full"
              style={{ background: "linear-gradient(90deg, #60A5FA, #1D4ED8)" }}
              initial={{ width: 0 }}
              animate={{ width: `${Math.min(pico.valor, 100)}%` }}
              transition={{ duration: 1.2, ease: [0.22, 1, 0.36, 1], delay: 0.3 }}
            />
          </div>
          <div className="flex justify-between text-[9px] text-slate-600 leading-none mt-0.5">
            <span>0%</span>
            <span>100%</span>
          </div>
        </div>
      )}

      {/* Metadato al pie */}
      <div className="mt-auto">
        <p className="text-slate-500 text-[11px] xl:text-xs font-medium" title={confianzaTitle}>
          MAPE {mapeTexto}{" "}
          {hayRangoReal
            ? "(rango histórico validado)"
            : mapeEsRiguroso
              ? "(validación rigurosa)"
              : "(prueba interna)"}
          {!hayRangoReal && coberturaCi != null && ` · ${(coberturaCi * 100).toFixed(0)}% cobertura`}
        </p>
      </div>
    </div>
  );
}
