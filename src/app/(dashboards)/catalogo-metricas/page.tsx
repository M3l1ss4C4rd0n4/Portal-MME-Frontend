"use client";

import { useState, useEffect, useMemo } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/dashboard/Card";
import { fetchCatalogoMetricas } from "@/services/apiService";
import type { Metrica } from "@/types/ontologia";

const DOMINIO_LABEL: Record<string, string> = {
  sector_energetico: "Sector Energético (XM)",
};

export default function CatalogoMetricasPage() {
  const [metricas, setMetricas] = useState<Metrica[] | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busqueda, setBusqueda] = useState("");
  const [soloIndices, setSoloIndices] = useState(false);
  const [expandido, setExpandido] = useState<number | null>(null);

  useEffect(() => {
    fetchCatalogoMetricas()
      .then((r) => setMetricas(r.metricas))
      .catch(() => setError("No se pudo cargar el catálogo de métricas"));
  }, []);

  const filtradas = useMemo(() => {
    if (!metricas) return [];
    const q = busqueda.trim().toLowerCase();
    return metricas.filter((m) => {
      if (soloIndices && !m.es_indice_regulatorio) return false;
      if (!q) return true;
      return (
        m.nombre_display.toLowerCase().includes(q) ||
        m.codigo_tecnico.toLowerCase().includes(q) ||
        (m.descripcion ?? "").toLowerCase().includes(q)
      );
    });
  }, [metricas, busqueda, soloIndices]);

  const porDominio = useMemo(() => {
    const grupos = new Map<string, Metrica[]>();
    for (const m of filtradas) {
      const key = m.dominio;
      if (!grupos.has(key)) grupos.set(key, []);
      grupos.get(key)!.push(m);
    }
    return grupos;
  }, [filtradas]);

  const pendientes = metricas?.filter((m) => m.estado === "pendiente_curacion").length ?? 0;

  return (
    <DashboardLayout
      title="Catálogo de Métricas"
      subtitle="Ontología de variables del portal — qué es cada métrica, de dónde sale y cómo se relaciona con otras (Fase 12/13)"
    >
      <div className="space-y-6">
        {error && (
          <Card className="border-red-500/30">
            <p className="text-sm text-red-400">{error}</p>
          </Card>
        )}

        {!metricas && !error && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse h-24 rounded-2xl bg-theme-secondary border border-theme-card" />
            ))}
          </div>
        )}

        {metricas && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card delay={0.05}>
                <div className="text-[10px] text-theme-muted uppercase tracking-wide mb-2">
                  Métricas catalogadas
                </div>
                <div className="text-2xl font-bold text-gold">{metricas.length}</div>
              </Card>
              <Card delay={0.1}>
                <div className="text-[10px] text-theme-muted uppercase tracking-wide mb-2">
                  Índices regulatorios
                </div>
                <div className="text-2xl font-bold text-gold">
                  {metricas.filter((m) => m.es_indice_regulatorio).length}
                </div>
              </Card>
              <Card delay={0.15}>
                <div className="text-[10px] text-theme-muted uppercase tracking-wide mb-2">
                  Pendientes de curación
                </div>
                <div className="text-2xl font-bold text-theme-muted">{pendientes}</div>
              </Card>
            </div>

            <Card delay={0.2}>
              <div className="flex flex-col sm:flex-row gap-3">
                <input
                  type="text"
                  value={busqueda}
                  onChange={(e) => setBusqueda(e.target.value)}
                  placeholder="Buscar por nombre, código o descripción…"
                  className="flex-1 bg-theme-primary border border-theme-card rounded-lg px-3 py-2 text-sm text-theme-primary placeholder:text-theme-muted focus:outline-none focus:border-gold/50"
                />
                <label className="flex items-center gap-2 text-xs text-theme-muted whitespace-nowrap px-1">
                  <input
                    type="checkbox"
                    checked={soloIndices}
                    onChange={(e) => setSoloIndices(e.target.checked)}
                    className="accent-gold"
                  />
                  Solo índices regulatorios
                </label>
              </div>
            </Card>

            {[...porDominio.entries()].map(([dominio, items], gi) => (
              <Card key={dominio} delay={0.25 + gi * 0.05}>
                <div className="text-[10px] text-theme-muted uppercase tracking-wide mb-3">
                  {DOMINIO_LABEL[dominio] ?? dominio} · {items.length}
                </div>
                <div className="space-y-2">
                  {items.map((m) => (
                    <div key={m.metrica_id} className="border-b border-theme-card/50 last:border-0 pb-2 last:pb-0">
                      <button
                        onClick={() => setExpandido(expandido === m.metrica_id ? null : m.metrica_id)}
                        className="w-full text-left flex items-start justify-between gap-3 py-1"
                      >
                        <div>
                          <span className="text-sm font-medium text-theme-primary">{m.nombre_display}</span>
                          <span className="ml-2 text-[10px] text-theme-muted font-mono">{m.codigo_tecnico}</span>
                          {m.es_indice_regulatorio && (
                            <span className="ml-2 text-[10px] px-1.5 py-0.5 rounded-full bg-gold/15 text-gold border border-gold/30">
                              índice regulatorio
                            </span>
                          )}
                        </div>
                        <span className="text-xs text-theme-muted shrink-0">{m.unidad ?? ""}</span>
                      </button>
                      {expandido === m.metrica_id && (
                        <div className="mt-1.5 text-xs text-theme-muted leading-relaxed space-y-1.5">
                          {m.descripcion && <p>{m.descripcion}</p>}
                          <p className="text-theme-muted/70">
                            Fuente: {m.fuente}
                            {m.referencia_normativa ? ` · ${m.referencia_normativa}` : ""}
                          </p>
                          {m.relaciones && m.relaciones.length > 0 && (
                            <ul className="pl-4 list-disc space-y-1">
                              {m.relaciones.map((r) => (
                                <li key={r.relacion_id}>{r.descripcion}</li>
                              ))}
                            </ul>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </Card>
            ))}

            {filtradas.length === 0 && (
              <Card>
                <p className="text-xs text-theme-muted text-center py-4">
                  Ninguna métrica coincide con la búsqueda.
                </p>
              </Card>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
