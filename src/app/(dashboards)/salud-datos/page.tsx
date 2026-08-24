"use client";

import { useState, useEffect } from "react";
import DashboardLayout from "@/components/DashboardLayout";
import Card from "@/components/dashboard/Card";
import { fetchSaludDatos } from "@/services/apiService";
import type { SaludDatos, LineageRow } from "@/types/ontologia";

const ESTADO_BADGE: Record<LineageRow["estado"], string> = {
  exito: "text-emerald-500",
  error: "text-red-400",
  en_progreso: "text-amber-500",
};

function fmtFecha(iso: string): string {
  return new Date(iso).toLocaleString("es-CO", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export default function SaludDatosPage() {
  const [salud, setSalud] = useState<SaludDatos | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchSaludDatos()
      .then(setSalud)
      .catch(() => setError("No se pudo cargar la salud de la ontología"))
      .finally(() => setLoading(false));
  }, []);

  return (
    <DashboardLayout
      title="Salud de Datos"
      subtitle="Deuda de curación y linaje del pipeline de ontología — gobierno de datos (Ontología unificada)"
    >
      <div className="space-y-6">
        {loading && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="animate-pulse h-24 rounded-2xl bg-theme-secondary border border-theme-card" />
            ))}
          </div>
        )}

        {error && (
          <Card className="border-red-500/30">
            <p className="text-sm text-red-400">{error}</p>
          </Card>
        )}

        {salud && (
          <>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card delay={0.05}>
                <div className="text-[10px] text-theme-muted uppercase tracking-wide mb-2">
                  Geografía sin resolver
                </div>
                <div className="text-2xl font-bold text-gold">
                  {salud.deuda_ontologia.geografia_sin_resolver.toLocaleString("es-CO")}
                </div>
              </Card>
              <Card delay={0.1}>
                <div className="text-[10px] text-theme-muted uppercase tracking-wide mb-2">
                  Empresas sin verificar
                </div>
                <div className="text-2xl font-bold text-gold">
                  {salud.deuda_ontologia.empresas_sin_resolver.toLocaleString("es-CO")}
                </div>
              </Card>
              <Card delay={0.15} className={salud.corridas_con_error_recientes > 0 ? "border-red-500/30" : ""}>
                <div className="text-[10px] text-theme-muted uppercase tracking-wide mb-2">
                  Corridas con error (últimas 30)
                </div>
                <div className={`text-2xl font-bold ${salud.corridas_con_error_recientes > 0 ? "text-red-400" : "text-emerald-500"}`}>
                  {salud.corridas_con_error_recientes}
                </div>
              </Card>
            </div>

            <Card delay={0.2}>
              <p className="text-xs text-theme-muted leading-relaxed">
                La &quot;deuda de ontología&quot; crece cuando llegan valores nuevos de
                departamento/municipio/ejecutor que aún no se han curado — es normal que
                suba cuando un ETL externo recarga datos, y baja con la curación manual
                (ver <code className="text-gold">/v1/ontologia/alias/pendientes</code>).
                Las corridas con error indican fallos reales del pipeline (ej. una vista
                materializada eliminada por un `DROP TABLE ... CASCADE` de otro proceso) —
                el pipeline se auto-repara en el siguiente refresco diario.
              </p>
            </Card>

            <Card delay={0.25}>
              <div className="text-[10px] text-theme-muted uppercase tracking-wide mb-3">
                Linaje reciente del pipeline de ontología
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="text-left text-theme-muted border-b border-theme-card">
                      <th className="pb-2 pr-4">Pipeline</th>
                      <th className="pb-2 pr-4">Paso</th>
                      <th className="pb-2 pr-4">Estado</th>
                      <th className="pb-2 pr-4">Filas</th>
                      <th className="pb-2 pr-4">Iniciado</th>
                      <th className="pb-2">Detalle</th>
                    </tr>
                  </thead>
                  <tbody>
                    {salud.lineage_reciente.map((row, idx) => (
                      <tr key={idx} className="border-b border-theme-card/50">
                        <td className="py-1.5 pr-4 text-theme-primary">{row.pipeline}</td>
                        <td className="py-1.5 pr-4 text-theme-muted">{row.paso}</td>
                        <td className={`py-1.5 pr-4 font-medium ${ESTADO_BADGE[row.estado]}`}>
                          {row.estado}
                        </td>
                        <td className="py-1.5 pr-4 text-theme-muted">
                          {row.filas_afectadas ?? "—"}
                        </td>
                        <td className="py-1.5 pr-4 text-theme-muted">{fmtFecha(row.iniciado_en)}</td>
                        <td className="py-1.5 text-red-400">{row.detalle ?? ""}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {salud.lineage_reciente.length === 0 && (
                  <p className="text-xs text-theme-muted text-center py-4">
                    Aún no hay corridas registradas.
                  </p>
                )}
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
