"use client";

import { ResponsiveLine } from "@nivo/line";
import { ResponsivePie } from "@nivo/pie";
import { KpiBlock, HydroKpiBlock } from "@/components/kpi";
import { InfoTooltip } from "@/components/ui/InfoTooltip";
import { estadoReservas, estadoAportes, estadoPrecio, estadoGeneracion, diagnosticoSIN } from "@/lib/kpi-logic";
import { getNivoTheme } from "@/lib/nivo-theme";
import { useTheme } from "@/providers/ThemeProvider";
import type { HomeSliderProps } from "@/types/home-slider";
import { TopAccent, SectionBadge, TooltipSection, TooltipField, TooltipDivider } from "./SlideUI";
import {
  clasificarIndiceNE,
  obtenerSendaReferencia,
  HSIN_UMBRAL_NORMAL,
  HSIN_UMBRAL_DEFICIT_SEVERO,
  HSIN_UMBRAL_CRITICO_HISTORICO,
  NE_UMBRAL_SUPERIOR_ABSOLUTO_PCT,
  OBJETIVO_XM_EMBALSE_ANTE_NINO_PCT,
} from "@/lib/umbralesOficiales";

export function SlideGestionSector({
  d,
  detalle,
}: {
  d: HomeSliderProps["sectorData"];
  detalle?: HomeSliderProps["sectorDetalle"];
}) {
  const hasDetalle = !!detalle && detalle.generacionPorFuente.length > 0;
  const hasPrecioSeries = !!detalle && detalle.precioBolsaSeries.length > 0 && detalle.precioBolsaSeries[0].data.length > 0;
  const aportes = d.aportesHidricos;
  const preciosReg = d.umbralesRegulatorios;
  const aportesPct = aportes?.hsinPct ?? aportes?.pct ?? (
    aportes && aportes.historicoGwh > 0 ? (aportes.actualGwh / aportes.historicoGwh) * 100 : null
  );

  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const stRes = estadoReservas(d.pctEmbalses);
  const stAp = aportesPct !== null ? estadoAportes(aportesPct) : null;
  const stPr = estadoPrecio(d.precioBolsa, preciosReg ?? undefined);
  const stGen = estadoGeneracion(
    detalle?.generacionPorFuente,
    d.generacionGwh,
    aportes?.dailyActualGwh,
    d.precioBolsa,
    preciosReg ?? undefined,
  );
  const diagnostico = diagnosticoSIN(d.pctEmbalses, aportesPct, d.precioBolsa);

  const aportesColor = aportesPct === null
    ? "text-slate-400"
    : aportesPct >= 90
    ? "text-emerald-400"
    : aportesPct >= 70
    ? "text-gold"
    : "text-red-400";

  // ─── Tooltips para cada KPI ───────────────────────────────────────────────
  const pei = preciosReg?.pei ?? 327.67;
  const pe = preciosReg?.pe ?? 590.56;
  const pes = preciosReg?.pes ?? 830.34;

  const tooltipPrecio = (
    <div>
      <p className="text-sm font-semibold text-theme-primary">Precio de Bolsa Nacional (PPP)</p>
      <TooltipSection label="Definicion">
        Precio ponderado al que se transa la energia en el mercado mayorista colombiano (COP/kWh).
      </TooltipSection>
      <TooltipSection label="Fuente">
        XM publica <span className="text-slate-400 font-mono text-[11px]">PrecBolsNaci</span> diariamente desde SIMEM.
      </TooltipSection>
      <TooltipDivider />
      <TooltipSection label="Umbrales Regulatorios">
        <TooltipField label="PEI" value={`${pei.toFixed(0)} COP/kWh — Precio de Escasez Inferior`} />
        <TooltipField label="PE" value={`${pe.toFixed(0)} COP/kWh — Precio de Escasez`} />
        <TooltipField label="PES" value={`${pes.toFixed(0)} COP/kWh — Precio de Escasez Superior`} />
      </TooltipSection>
      <TooltipField label="Norma" value="CREG 101 066/2024 — Tres niveles de precio de escasez." />
      <TooltipDivider />
      <TooltipField label="Estado" value={stPr.label} />
      <TooltipField label="Tendencia" value="Variacion vs promedio 7 dias. Flecha descendente = favorable (baja el precio). Flecha ascendente = presion (sube el precio)." />
      <TooltipDivider />
      <TooltipField label="Indice PBP" value="Alto si el precio supera el PE en 4 o mas de los ultimos 7 dias (CREG 026/2014 Art. 3)." />
    </div>
  );

  const tooltipGeneracion = (
    <div>
      <p className="text-sm font-semibold text-theme-primary">Energia Generada — SIN</p>
      <TooltipSection label="Definicion">
        Suma de generacion diaria de todas las plantas del Sistema Interconectado Nacional (GWh/dia).
      </TooltipSection>
      <TooltipSection label="Fuente">
        XM publica generacion por tecnologia (hidraulica, termica, solar, eolica) con rezago de 1 a 3 dias.
      </TooltipSection>
      <TooltipDivider />
      <TooltipField label="Capacidad instalada" value="21.029 MW efectivos netos (XM, diciembre 2025)." />
      <TooltipField label="Demanda tipica" value="200–250 GWh/dia. Picos mayores a 253 GWh/dia disparan alerta (percentil 99 del historico XM)." />
      <TooltipDivider />
      <TooltipField label="Estado" value={stGen.label} />
      <TooltipField label="Tendencia" value="Comparacion vs promedio 7 dias. El semaforo combina I2 (sostenibilidad hidraulica), I3 (estres termico) y precio de bolsa." />
      <TooltipDivider />
      <TooltipField label="Diagnostico SIN" value="Integra los indices NE + HSIN + PBP (Art. 3, CREG 026/2014)." />
    </div>
  );

  const sendaPct = obtenerSendaReferencia();
  const ne = clasificarIndiceNE(d.pctEmbalses);

  const tooltipReservas = (
    <div>
      <p className="text-sm font-semibold text-theme-primary">Reservas Hidricas — Embalses del SIN</p>
      <TooltipSection label="Definicion">
        Porcentaje del volumen util de agua almacenada en el conjunto de embalses del SIN respecto a su capacidad util total (~17.000 GWh de energia potencial).
      </TooltipSection>
      <TooltipSection label="Fuente">
        XM publica <span className="text-slate-400 font-mono text-[11px]">PorcVoluUtilDiar</span> a nivel Sistema. Si el dato del dia tiene cobertura menor al 20% de la capacidad, se descarta y se usa el dia anterior (maximo 7 dias atras).
      </TooltipSection>
      <TooltipDivider />
      <TooltipSection label="Marco Regulatorio — Indice NE">
        <TooltipField label="Clasificacion" value={ne.nivel + " — " + ne.descripcion} />
        <TooltipField label="Senda CREG" value={`${sendaPct.toFixed(1)}% para el mes actual (Res. CREG 209/2020).`} />
        <TooltipField label="Regla absoluta" value={`Por encima de ${NE_UMBRAL_SUPERIOR_ABSOLUTO_PCT}% siempre es nivel SUPERIOR, sin importar la senda (Art. 2.8.2.1.3, CREG 209/2020).`} />
        <TooltipField label="Objetivo XM" value={`Mayor o igual a ${OBJETIVO_XM_EMBALSE_ANTE_NINO_PCT}% ante fenomeno de El Nino (Boletin XM, abril 2026).`} />
      </TooltipSection>
      <TooltipDivider />
      <TooltipField label="Estado" value={stRes.label} />
      <TooltipField label="Tendencia" value="Flecha ascendente = embalses subiendo (favorable). Flecha descendente = embalses bajando. Compara valor actual vs hace 7 dias." />
    </div>
  );

  const hsinNivel = aportesPct !== null
    ? aportesPct >= 120 ? "Muy favorable (>120%)"
    : aportesPct >= 100 ? "Normal (100-119%)"
    : aportesPct >= HSIN_UMBRAL_NORMAL ? `Vigilancia CREG (${HSIN_UMBRAL_NORMAL}-99%)`
    : aportesPct >= HSIN_UMBRAL_DEFICIT_SEVERO ? `Deficit hidrico (${HSIN_UMBRAL_DEFICIT_SEVERO}-${HSIN_UMBRAL_NORMAL - 1}%)`
    : aportesPct >= HSIN_UMBRAL_CRITICO_HISTORICO ? `Deficit severo (${HSIN_UMBRAL_CRITICO_HISTORICO}-${HSIN_UMBRAL_DEFICIT_SEVERO - 1}%)`
    : `Critico historico (menor o igual a ${HSIN_UMBRAL_CRITICO_HISTORICO}%)`
    : "Sin datos";

  const tooltipAportes = (
    <div>
      <p className="text-sm font-semibold text-theme-primary">Aportes Hidricos — Indice HSIN</p>
      <TooltipSection label="Definicion">
        Que tan abundantes son los aportes de los rios al SIN en el mes en curso, comparado con la media historica oficial del mismo periodo.
      </TooltipSection>
      <TooltipSection label="Formula de calculo">
        Acumulado de energia aportada por todos los rios desde el dia 1 del mes hasta hoy, dividido entre la media historica acumulada del mismo periodo, multiplicado por 100.
      </TooltipSection>
      <TooltipSection label="Fuente">
        Series XM <span className="text-slate-400 font-mono text-[11px]">AporEner</span> (energia aportada por rio en GWh/dia) y <span className="text-slate-400 font-mono text-[11px]">AporEnerMediHist</span> (media historica del mismo rio en esa epoca del ano).
      </TooltipSection>
      <TooltipDivider />
      <TooltipSection label="Marco Regulatorio — HSIN">
        <TooltipField label="Norma" value={`CREG 026/2014, Articulo 2. Ventana de calculo: ${HSIN_UMBRAL_NORMAL} semanas (28 dias).`} />
        <TooltipField label="Umbral normal" value={`HSIN mayor o igual a ${HSIN_UMBRAL_NORMAL}%.`} />
        <TooltipField label="Deficit severo" value={`HSIN menor a ${HSIN_UMBRAL_DEFICIT_SEVERO}%.`} />
        <TooltipField label="Critico historico" value={`HSIN menor o igual a ${HSIN_UMBRAL_CRITICO_HISTORICO}% (referencia: abril 2020).`} />
      </TooltipSection>
      <TooltipDivider />
      <TooltipField label="Estado" value={stAp ? stAp.label : "Sin datos"} />
      <TooltipField label="Nivel HSIN" value={hsinNivel} />
      <TooltipField label="Tendencia" value="Flecha ascendente = mejorando. Flecha descendente = empeorando. Compara valor actual vs hace 7 dias." />
      <TooltipDivider />
      <TooltipSection label="Nota metodologica">
        Se acumula todo el mes para suavizar la variabilidad de lluvias puntuales. Un solo dia de sequia o tormenta distorsionaria la lectura. Este criterio es coherente con el usado por XM en sus boletines mensuales de hidrologia.
      </TooltipSection>
    </div>
  );

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center bg-theme-primary overflow-hidden">
      <TopAccent color="#3B82F6" />
      <div className="absolute inset-0 bg-gradient-to-br from-blue-900/20 via-transparent to-amber-900/15 pointer-events-none" />
      <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-[60%] h-[30%] bg-blue-500/5 rounded-full blur-3xl pointer-events-none" />

      <div className="relative z-10 flex flex-col items-center w-full h-full max-w-7xl px-6 xl:px-8 py-4 justify-evenly">
        <div className="text-center">
          <SectionBadge label="Gestión del Sector" pulse dot="#EF4444" />
          <p className="text-slate-300 text-sm xl:text-base font-medium">{diagnostico}</p>
          <p className="text-slate-600 text-xs xl:text-sm mt-0.5">
            {d.ultimaEjecucionETL
              ? `ETL sector energético · última ejecución: ${d.ultimaEjecucionETL}`
              : d.ultimaActualizacion
              ? `Datos en tiempo real de XM · últimos datos: ${d.ultimaActualizacion}`
              : "Datos en tiempo real de XM"}
          </p>
        </div>

        <div className="grid grid-cols-4 w-full divide-x divide-theme-primary/20">
          <KpiBlock
            label="Precio de Bolsa (PPP)"
            value={`$${d.precioBolsa.toFixed(2)}`}
            unit="COP/kWh"
            date={d.fechaPrecio}
            valueClass="text-gold"
            chipLabel={stPr.label}
            chipColor={stPr.color}
            tendencia={d.tendencias?.precio}
            metrica="precio"
            tooltip={tooltipPrecio}
          />
          <KpiBlock
            label="Energía Generada"
            value={d.generacionGwh.toFixed(2)}
            unit="GWh"
            date={d.fechaGeneracion}
            valueClass="text-blue-400"
            chipLabel={stGen.label}
            chipColor={stGen.color}
            tendencia={d.tendencias?.generacion}
            metrica="generacion"
            tooltip={tooltipGeneracion}
          />
          <HydroKpiBlock
            label="Reservas Hídricas"
            pct={d.pctEmbalses}
            pctColor={stRes.tw}
            gwh={d.embalseGwh}
            gwhRef={d.capacidadEmbalseGwh}
            gwhRefLabel="cap."
            date={d.fechaEmbalse}
            chipLabel={stRes.label}
            chipColor={stRes.color}
            tendencia={d.tendencias?.embalses}
            metrica="embalses"
            tooltip={tooltipReservas}
          />
          {aportesPct !== null && stAp ? (
            <HydroKpiBlock
              label="Aportes Hídricos"
              pct={aportesPct}
              pctColor={aportesColor}
              gwh={aportes?.actualGwh}
              gwhRef={aportes?.historicoGwh}
              gwhRefLabel="hist."
              dailyGwh={aportes?.dailyActualGwh}
              dailyHistGwh={aportes?.dailyHistGwh}
              date={d.fechaAportes}
              chipLabel={stAp.label}
              chipColor={stAp.color}
              tendencia={d.tendencias?.aportes}
              metrica="aportes"
              tooltip={tooltipAportes}
            />
          ) : (
            <div className="flex items-center justify-center">
              <p className="text-slate-600 text-sm">Sin datos</p>
            </div>
          )}
        </div>

        {hasDetalle && (
          <div className="grid grid-cols-1 md:grid-cols-3 w-full gap-3 xl:gap-4">
            {hasPrecioSeries && (
              <div className="flex flex-col">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 inline-flex items-center gap-1">
                  Precio de Bolsa (PPP) · Tendencia
                  <InfoTooltip
                    content={
                      <div>
                        <p className="text-sm font-semibold text-theme-primary">Tendencia del Precio de Bolsa</p>
                        <TooltipSection label="Que muestra">
                          Evolucion diaria del precio ponderado de bolsa nacional (COP/kWh) en los ultimos 30 dias.
                        </TooltipSection>
                        <TooltipField label="Fuente" value="XM publica PrecBolsNaci diariamente." />
                        <TooltipDivider />
                        <TooltipField label="PEI" value={`${pei.toFixed(0)} COP/kWh`} />
                        <TooltipField label="PE" value={`${pe.toFixed(0)} COP/kWh`} />
                        <TooltipField label="PES" value={`${pes.toFixed(0)} COP/kWh`} />
                        <p className="text-[10px] text-slate-500 italic mt-1">Pase el cursor sobre un punto para ver detalles.</p>
                      </div>
                    }
                  />
                </p>
                <div className="h-[20vh] xl:h-[22vh]">
                  <ResponsiveLine
                    data={detalle!.precioBolsaSeries}
                    theme={getNivoTheme(isDark)}
                    margin={{ top: 6, right: 12, bottom: 28, left: 36 }}
                    xScale={{ type: "point" }}
                    yScale={{ type: "linear", min: "auto", max: "auto" }}
                    curve="catmullRom"
                    enablePoints={false}
                    enableGridX={false}
                    axisTop={null}
                    axisRight={null}
                    axisBottom={{
                      tickSize: 0,
                      tickPadding: 6,
                      tickRotation: 0,
                      tickValues: "every 4 days",
                      format: (value) => {
                        const dataPoint = detalle!.precioBolsaSeries[0]?.data.find((d) => d.x === value);
                        if (dataPoint?.fecha) {
                          return String(new Date(dataPoint.fecha).getDate());
                        }
                        return value;
                      },
                    }}
                    axisLeft={{ tickSize: 0, tickValues: 3, tickPadding: 6 }}
                    colors={["#F59E0B"]}
                    lineWidth={2}
                    enableArea
                    areaOpacity={0.15}
                    useMesh
                    tooltip={({ point }) => {
                      const dataPoint = detalle!.precioBolsaSeries[0]?.data.find((d) => d.x === point.data.x);
                      const fecha = dataPoint?.fecha
                        ? new Date(dataPoint.fecha).toLocaleDateString("es-CO", { day: "numeric", month: "short" })
                        : point.data.xFormatted;
                      const precioValor = Number(point.data.y);
                      return (
                        <div className="px-3 py-2 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary min-w-[160px]">
                          <p className="font-semibold text-theme-primary text-sm">{fecha}</p>
                          <p className="mt-0.5">PPP: <strong className="text-gold">${precioValor.toFixed(2)} COP/kWh</strong></p>
                          <div className="mt-1.5 pt-1.5 border-t border-theme-primary/30 space-y-0.5">
                            <p className="text-[10px] text-slate-400">Referencias regulatorias:</p>
                            <p className="text-[10px]"><span className="text-slate-500">PEI</span> <span className="text-slate-300">{pei.toFixed(0)} COP/kWh</span></p>
                            <p className="text-[10px]"><span className="text-slate-500">PE</span> <span className="text-slate-300">{pe.toFixed(0)} COP/kWh</span></p>
                            <p className="text-[10px]"><span className="text-slate-500">PES</span> <span className="text-slate-300">{pes.toFixed(0)} COP/kWh</span></p>
                          </div>
                        </div>
                      );
                    }}
                  />
                </div>
              </div>
            )}

            <div className="flex flex-col items-center">
              <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-1 self-start inline-flex items-center gap-1">
                Generación por Fuente
                <InfoTooltip
                  content={
                    <div>
                      <p className="text-sm font-semibold text-theme-primary">Generacion por Fuente</p>
                      <TooltipSection label="Que muestra">
                        Composicion porcentual de la generacion electrica del SIN por tipo de fuente (hidraulica, termica, solar, eolica).
                      </TooltipSection>
                      <TooltipField label="Fuente" value="XM publica generacion por tecnologia. Datos del ultimo dia completo disponible." />
                      <TooltipDivider />
                      <TooltipField label="Matriz tipica" value="~58% hidraulica, ~27% termica, ~15% solar (Colombia, abril 2026)." />
                      <TooltipField label="Alerta" value="Participacion termica mayor a 35% sostenida = riesgo estructural (criterio CND)." />
                      <p className="text-[10px] text-slate-500 italic mt-1">Pase el cursor sobre un sector para ver GWh generados.</p>
                    </div>
                  }
                />
              </p>
              <div className="relative h-[20vh] xl:h-[22vh] w-full">
                <ResponsivePie
                  data={detalle!.generacionPorFuente}
                  theme={getNivoTheme(isDark)}
                  margin={{ top: 4, right: 35, bottom: 4, left: 4 }}
                  innerRadius={0.65}
                  padAngle={2}
                  cornerRadius={3}
                  activeOuterRadiusOffset={5}
                  colors={{ datum: "data.color" }}
                  borderWidth={0}
                  enableArcLinkLabels={false}
                  arcLabelsSkipAngle={12}
                  arcLabelsTextColor="#fff"
                  arcLabelsRadiusOffset={0.75}
                  legends={[
                    {
                      anchor: "right" as const,
                      direction: "column" as const,
                      justify: false,
                      translateX: 30,
                      translateY: 0,
                      itemsSpacing: 3,
                      itemWidth: 60,
                      itemHeight: 12,
                      itemTextColor: "var(--text-secondary)",
                      itemDirection: "left-to-right" as const,
                      symbolSize: 7,
                      symbolShape: "circle" as const,
                    },
                  ]}
                  tooltip={({ datum }: { datum: { color: string; label: string | number; value: number; data?: { generacionGwh?: number } } }) => {
                    const gwh = datum.data?.generacionGwh;
                    return (
                      <div className="px-3 py-2 bg-theme-secondary border border-theme-primary rounded text-xs text-theme-primary min-w-[150px]">
                        <p className="font-semibold text-theme-primary text-sm">
                          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: datum.color }} />
                          {datum.label}
                        </p>
                        <p className="mt-0.5">Participación: <strong>{datum.value}%</strong></p>
                        {gwh !== undefined && (
                          <p className="text-[10px] text-theme-muted">Generación: <strong className="text-theme-primary">{gwh.toFixed(1)} GWh</strong></p>
                        )}
                        <p className="text-[10px] text-slate-500 mt-0.5">del total de {d.generacionGwh.toFixed(1)} GWh</p>
                      </div>
                    );
                  }}
                />
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none pr-12">
                  <span className="text-base xl:text-lg font-bold text-theme-primary leading-none">{d.generacionGwh.toFixed(1)}</span>
                  <span className="text-[9px] text-slate-400">GWh</span>
                </div>
              </div>
            </div>

            {detalle?.aportesRios && detalle.aportesRios.length > 0 && (
              <div className="flex flex-col h-[20vh] xl:h-[22vh]">
                <p className="text-[10px] text-slate-400 uppercase tracking-wider mb-0.5 inline-flex items-center gap-1">
                  Hidrología · Aportes y Embalses
                  <InfoTooltip
                    wide
                    content={
                      <div>
                        <p className="text-sm font-semibold text-theme-primary">Hidrologia del SIN</p>
                        <TooltipSection label="Aportes (columna izquierda)">
                          Barras comparativas de aporte actual (color) vs media historica (gris) por rio. El porcentaje indica que tan por encima o por debajo de la media historica se encuentra el aporte.
                        </TooltipSection>
                        <TooltipSection label="Embalses (columna derecha)">
                          Nivel actual de cada embalse como porcentaje de su capacidad util, ordenados de mayor a menor capacidad.
                        </TooltipSection>
                        <TooltipField label="Fuente" value="XM: AporEner, AporEnerMediHist, PorcVoluUtilDiar por embalse." />
                        <TooltipDivider />
                        <TooltipField label="Colores aportes" value="Verde = 100% o mas. Ambar = 80-99%. Rojo = menos de 80%." />
                        <TooltipField label="Colores embalses" value="Verde = 80% o mas. Cyan = 70-79%. Ambar = 60-69%. Naranja = 50-59%. Rojo = menos de 50%." />
                        <p className="text-[10px] text-slate-500 italic mt-1">Pase el cursor sobre cada elemento para ver valores exactos.</p>
                      </div>
                    }
                  />
                </p>
                <div className="flex-1 grid grid-cols-2 gap-2 overflow-hidden">
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Aportes · vs Hist.</p>
                    <div className="space-y-[1px]">
                      {detalle.aportesRios.slice(0, 15).map((rio) => {
                        const maxVal = Math.max(rio.actualGwh, rio.historicoGwh);
                        const pct = rio.porcentaje;
                        const pctColor = pct >= 100 ? "text-emerald-400" : pct >= 80 ? "text-gold" : "text-red-400";
                        const barColor = pct >= 100 ? "bg-emerald-500" : pct >= 80 ? "bg-amber-500" : "bg-red-500";
                        return (
                          <div
                            key={rio.codigo}
                            className="flex items-center gap-1 text-[9px] leading-none py-[1px] cursor-default"
                            title={`${rio.nombre}\nAporte actual: ${rio.actualGwh.toFixed(1)} GWh\nMedia histórica: ${rio.historicoGwh.toFixed(1)} GWh\n% vs histórica: ${pct.toFixed(0)}%`}
                          >
                            <span className="w-12 text-right text-slate-400 truncate">{rio.nombre}</span>
                            <div className="w-12 h-1.5 bg-theme-tertiary rounded-sm relative overflow-hidden">
                              <div className="absolute top-0 left-0 h-full bg-slate-600/30 rounded-sm" style={{ width: `${Math.min((rio.historicoGwh / maxVal) * 100, 100)}%` }} />
                              <div className={`absolute top-0 left-0 h-full ${barColor} rounded-sm`} style={{ width: `${Math.min((rio.actualGwh / maxVal) * 100, 100)}%` }} />
                            </div>
                            <span className={`w-5 text-right font-medium ${pctColor}`}>{pct.toFixed(0)}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                  <div>
                    <p className="text-[9px] text-slate-500 uppercase tracking-wider mb-0.5">Embalses · % Actual</p>
                    <div className="space-y-[1px]">
                      {detalle.embalses
                        ?.slice()
                        .sort((a, b) => b.capacidadGwh - a.capacidadGwh)
                        .slice(0, 15)
                        .map((emb) => {
                          const embColor =
                            emb.porcentaje < 50
                              ? "bg-red-500"
                              : emb.porcentaje < 60
                              ? "bg-orange-500"
                              : emb.porcentaje < 70
                              ? "bg-amber-500"
                              : emb.porcentaje < 80
                              ? "bg-cyan-500"
                              : "bg-emerald-500";
                          return (
                            <div
                              key={emb.codigo}
                              className="flex items-center gap-1 text-[9px] leading-none py-[1px] cursor-default"
                              title={`${emb.nombre}\nNivel actual: ${emb.porcentaje.toFixed(1)}%\nCapacidad útil: ${emb.capacidadGwh.toFixed(0)} GWh`}
                            >
                              <span className="w-12 text-right text-slate-400 truncate">{emb.nombre}</span>
                              <div className="w-12 h-1.5 bg-theme-tertiary rounded-sm relative overflow-hidden">
                                <div className={`absolute top-0 left-0 h-full ${embColor} rounded-sm`} style={{ width: `${Math.min(emb.porcentaje, 100)}%` }} />
                              </div>
                              <span className="w-5 text-right font-medium text-slate-300">{emb.porcentaje.toFixed(0)}%</span>
                            </div>
                          );
                        })}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
