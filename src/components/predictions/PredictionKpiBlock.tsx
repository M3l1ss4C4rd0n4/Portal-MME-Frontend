"use client";

import { classifyOni } from "@/lib/oni";
import { fmtDate, fmtShortDate } from "@/types/predictions";
import type { PredictionPoint } from "@/types/predictions";

interface PredictionKpiBlockProps {
  pico: { valor: number; fecha: string } | null;
  metaFecha: string | null;
  mape: number;
  confianza: number;
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
  climaPico,
  climaMeta,
}: PredictionKpiBlockProps) {
  const picoTitle = pico
    ? `El modelo de predicción proyecta que los embalses alcanzarán su nivel más alto de los próximos meses el ${fmtDate(pico.fecha)}, con ${pico.valor.toFixed(2)}% de la capacidad total. Después de esa fecha, se espera que empiecen a bajar de nuevo.`
    : undefined;

  const metaTitle = metaFecha
    ? `El 80% es el umbral que XM y el Gobierno usan como referencia de un nivel saludable de reservas hídricas para el sistema eléctrico. Según el modelo, los embalses superarán ese umbral el ${fmtDate(metaFecha)} y se mantendrán por encima durante varios meses.`
    : undefined;

  const confianzaTitle =
    `MAPE es el error promedio que ha tenido este modelo al predecir el pasado: un MAPE de ${(mape * 100).toFixed(1)}% significa que, en promedio, sus proyecciones se desvían solo eso del valor real, es decir que es bastante preciso. ` +
    `La confianza del ${(confianza * 100).toFixed(0)}% indica qué tan seguro está el modelo de este pronóstico, considerando la variabilidad histórica de las lluvias y otros factores climáticos.`;

  const climaIntro =
    "Estos son los indicadores climáticos que alimenta el modelo de predicción. " +
    "ONI mide la temperatura del océano Pacífico: cuando sube, estamos en El Niño (menos lluvia y embalses que bajan); cuando baja, en La Niña (más lluvia). " +
    "PDO y SOI son señales climáticas de más largo plazo que refuerzan esa misma tendencia, y GMST indica cuánto más caliente está el planeta que el promedio histórico, lo que intensifica las sequías.";

  const climaTitle = [
    climaIntro,
    pico && fraseClimaPunto("el pico proyectado", pico.fecha, climaPico),
    metaFecha && fraseClimaPunto("la fecha en que se alcanza la meta del 80%", metaFecha, climaMeta),
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <div className="flex flex-col items-center justify-center text-center gap-0.5 px-2 py-2 bg-theme-secondary border border-theme-secondary rounded-xl">
      <p className="text-slate-400 text-base xl:text-lg 2xl:text-xl uppercase tracking-[0.18em] font-medium">
        Proyección Embalses
      </p>
      <p className="text-slate-300 text-sm xl:text-base font-semibold" title={picoTitle}>
        {pico ? `Pico el ${fmtShortDate(pico.fecha)}` : "Pico proyectado"}
      </p>
      <div className="inline-flex items-center gap-2 text-3xl xl:text-4xl 2xl:text-5xl font-black leading-none text-gold" title={picoTitle}>
        {pico ? `${pico.valor.toFixed(2)}%` : "—"}
      </div>
      <p className="text-slate-300 text-sm xl:text-base font-semibold mt-0.5" title={metaTitle}>
        {metaFecha ? `meta 80% el ${fmtShortDate(metaFecha)}` : "Sin meta 80% proyectada"}
      </p>
      <p className="text-slate-500 text-xs xl:text-sm" title={confianzaTitle}>
        MAPE {(mape * 100).toFixed(1)}% · confianza {(confianza * 100).toFixed(0)}%
      </p>
      {climaPico && (
        <p className="text-[11px] xl:text-xs flex flex-wrap items-center justify-center gap-x-1.5 gap-y-0" title={climaTitle || undefined}>
          {climaPico.oni != null && (
            <span style={{ color: classifyOni(climaPico.oni)?.color ?? "#94A3B8" }}>
              ONI {climaPico.oni > 0 ? "+" : ""}{climaPico.oni.toFixed(2)}
            </span>
          )}
          {climaPico.pdo != null && (
            <span style={{ color: "#A855F7" }}>PDO {climaPico.pdo > 0 ? "+" : ""}{climaPico.pdo.toFixed(2)}</span>
          )}
          {climaPico.soi != null && (
            <span style={{ color: "#14B8A6" }}>SOI {climaPico.soi > 0 ? "+" : ""}{climaPico.soi.toFixed(1)}</span>
          )}
          {climaPico.gmst != null && (
            <span style={{ color: "#FB7185" }}>GMST +{climaPico.gmst.toFixed(2)}</span>
          )}
        </p>
      )}
    </div>
  );
}
