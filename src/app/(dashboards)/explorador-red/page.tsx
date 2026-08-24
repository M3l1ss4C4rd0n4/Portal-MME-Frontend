"use client";

import { useState, useCallback } from "react";
import dynamic from "next/dynamic";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/dashboard/Card";
import { buscarEmpresas, fetchVecindarioEmpresa } from "@/services/apiService";
import { useTheme } from "@/providers/ThemeProvider";
import type { Empresa, VecindarioEmpresa } from "@/types/ontologia";

const RelationshipGraph = dynamic(() => import("./RelationshipGraph"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full flex items-center justify-center">
      <span className="text-theme-muted text-xs">Cargando grafo…</span>
    </div>
  ),
});

export default function ExploradorRedPage() {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const [query, setQuery] = useState("");
  const [resultados, setResultados] = useState<Empresa[]>([]);
  const [empresaSeleccionada, setEmpresaSeleccionada] = useState<Empresa | null>(null);
  const [vecindario, setVecindario] = useState<VecindarioEmpresa | null>(null);
  const [buscando, setBuscando] = useState(false);
  const [cargandoVecindario, setCargandoVecindario] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nodoInfo, setNodoInfo] = useState<VecindarioEmpresa["nodos"][number] | null>(null);

  const buscar = useCallback(async () => {
    if (query.trim().length < 3) {
      setError("Escribe al menos 3 caracteres para buscar");
      return;
    }
    setError(null);
    setBuscando(true);
    setEmpresaSeleccionada(null);
    setVecindario(null);
    try {
      const data = await buscarEmpresas({ nombre: query.trim() });
      setResultados(data.empresas);
      if (data.empresas.length === 0) {
        setError("No se encontraron empresas con ese nombre");
      }
    } catch {
      setError("Error al buscar empresas");
    } finally {
      setBuscando(false);
    }
  }, [query]);

  const seleccionarEmpresa = useCallback(async (empresa: Empresa) => {
    setEmpresaSeleccionada(empresa);
    setCargandoVecindario(true);
    setVecindario(null);
    setNodoInfo(null);
    try {
      const data = await fetchVecindarioEmpresa(empresa.empresa_id, 50);
      setVecindario(data);
    } catch {
      setError("Error al cargar la red de esta empresa");
    } finally {
      setCargandoVecindario(false);
    }
  }, []);

  return (
    <DashboardLayout
      title="Explorador de Red"
      subtitle="Empresa → contratos/proyectos → geografía → otras empresas — grafo multi-hop de solo lectura (Ontología unificada)"
    >
      <div className="space-y-6">
        <Card>
          <label className="text-[10px] text-theme-muted uppercase tracking-wide block mb-2">
            Buscar empresa/prestador por nombre
          </label>
          <div className="flex gap-2">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && buscar()}
              placeholder="Ej. GENSA, CEDENAR, Electrificadora..."
              className="flex-1 bg-dash-chip border border-theme-card rounded-lg px-3 py-2 text-sm text-theme-primary focus:outline-none focus:border-amber-500/50"
            />
            <button
              onClick={buscar}
              disabled={buscando}
              className="px-4 py-2 rounded-lg text-xs font-bold bg-amber-500/10 text-gold hover:bg-amber-500/20 border border-amber-500/20 disabled:opacity-50"
            >
              {buscando ? "Buscando..." : "Buscar"}
            </button>
          </div>
          {error && <p className="text-xs text-red-400 mt-2">{error}</p>}
        </Card>

        {resultados.length > 0 && !empresaSeleccionada && (
          <Card delay={0.05}>
            <div className="text-[10px] text-theme-muted uppercase tracking-wide mb-3">
              {resultados.length} resultado{resultados.length !== 1 ? "s" : ""}
            </div>
            <div className="space-y-2">
              {resultados.map((emp) => (
                <button
                  key={emp.empresa_id}
                  onClick={() => seleccionarEmpresa(emp)}
                  className="w-full text-left px-3 py-2 rounded-lg bg-dash-chip border border-theme-card hover:border-amber-500/40 transition-colors"
                >
                  <div className="text-sm text-theme-primary font-medium">{emp.nombre_oficial}</div>
                  <div className="text-[10px] text-theme-muted mt-0.5">
                    {emp.sigla && <span className="mr-2">{emp.sigla}</span>}
                    {emp.nit && emp.nit !== "NaN" && <span>NIT {emp.nit}</span>}
                  </div>
                </button>
              ))}
            </div>
          </Card>
        )}

        {empresaSeleccionada && (
          <>
            <Card delay={0.05}>
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="text-lg font-bold text-theme-primary">
                    {empresaSeleccionada.nombre_oficial}
                  </div>
                  <div className="text-xs text-theme-muted mt-1">
                    {empresaSeleccionada.sigla && <span className="mr-3">{empresaSeleccionada.sigla}</span>}
                    {empresaSeleccionada.nit && empresaSeleccionada.nit !== "NaN" && (
                      <span className="mr-3">NIT {empresaSeleccionada.nit}</span>
                    )}
                    {empresaSeleccionada.codigo_sui && <span>SUI {empresaSeleccionada.codigo_sui}</span>}
                  </div>
                </div>
                <button
                  onClick={() => {
                    setEmpresaSeleccionada(null);
                    setVecindario(null);
                  }}
                  className="text-[10px] text-theme-muted hover:text-red-400"
                >
                  ✕ Cerrar
                </button>
              </div>
            </Card>

            {cargandoVecindario && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="animate-pulse h-20 rounded-2xl bg-theme-secondary border border-theme-card" />
                ))}
              </div>
            )}

            {vecindario && !cargandoVecindario && (
              <>
                <Card delay={0.1}>
                  <div className="text-[10px] text-theme-muted uppercase tracking-wide mb-1">
                    Contratos verificados (match por NIT)
                  </div>
                  <div className="text-sm text-theme-primary">
                    Mostrando <strong className="text-gold">{vecindario.contratos_verificados}</strong> de{" "}
                    <strong>{vecindario.total_contratos_verificados}</strong> contratos totales — grafo con{" "}
                    <strong>{vecindario.nodos.length}</strong> nodos y{" "}
                    <strong>{vecindario.aristas.length}</strong> relaciones
                  </div>
                </Card>

                <Card delay={0.12} className="p-2 sm:p-3">
                  <RelationshipGraph
                    nodos={vecindario.nodos}
                    aristas={vecindario.aristas}
                    isDark={isDark}
                    height={480}
                    onNodeClick={setNodoInfo}
                  />
                </Card>

                {nodoInfo && (
                  <Card delay={0} className="border-amber-500/30">
                    <div className="flex items-start justify-between gap-4">
                      <div className="text-[11px] text-theme-muted whitespace-pre-wrap break-words">
                        <div className="text-[10px] text-gold uppercase tracking-wide mb-1">
                          {nodoInfo.tipo}
                        </div>
                        {JSON.stringify(nodoInfo.datos, null, 2)}
                      </div>
                      <button
                        onClick={() => setNodoInfo(null)}
                        className="text-[10px] text-theme-muted hover:text-red-400 shrink-0"
                      >
                        ✕
                      </button>
                    </div>
                  </Card>
                )}

                {vecindario.menciones_no_verificadas.length > 0 && (
                  <Card delay={0.2} className="border-amber-500/30">
                    <div className="text-[10px] text-amber-500 uppercase tracking-wide mb-2">
                      ⚠ Menciones no verificadas ({vecindario.menciones_no_verificadas.length})
                    </div>
                    <p className="text-[11px] text-theme-muted mb-3">
                      Coincidencias de nombre por similitud de texto en otros esquemas — no confirmadas
                      por NIT. Requieren revisión humana antes de asumirse como el mismo ejecutor. No
                      aparecen en el grafo porque no son relaciones verificadas.
                    </p>
                    <div className="space-y-1">
                      {vecindario.menciones_no_verificadas.map((m, idx) => (
                        <div key={idx} className="text-[11px] text-theme-muted">
                          <span className="text-theme-primary">{m.valor_original}</span> — {m.esquema}.{m.tabla}
                        </div>
                      ))}
                    </div>
                  </Card>
                )}
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
