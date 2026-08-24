"use client";

import { useRef, useEffect, useState, useMemo, useCallback } from "react";
import ForceGraph2D, { type NodeObject, type LinkObject } from "react-force-graph-2d";
import type { VecindarioEmpresa } from "@/types/ontologia";

type NodoVecindario = VecindarioEmpresa["nodos"][number];
type AristaVecindario = VecindarioEmpresa["aristas"][number];

interface GraphNode extends NodeObject {
  id: string;
  tipo: string;
  label: string;
  tooltip: string;
  datos: Record<string, unknown>;
}

interface Props {
  nodos: NodoVecindario[];
  aristas: AristaVecindario[];
  isDark: boolean;
  onNodeClick?: (nodo: NodoVecindario) => void;
  /** Alto en px del contenedor. En el chat del asistente se usa uno más chico que en la página completa. */
  height?: number;
}

const TIPO_COLOR: Record<string, string> = {
  empresa: "#F59E0B",
  empresa_relacionada: "#22D3EE",
  contrato: "#34D399",
  proyecto: "#A78BFA",
  geografia: "#64748B",
};

const TIPO_LABEL: Record<string, string> = {
  empresa: "Empresa",
  empresa_relacionada: "Empresa relacionada",
  contrato: "Contrato",
  proyecto: "Proyecto",
  geografia: "Geografía",
};

function labelDeNodo(nodo: NodoVecindario): string {
  const d = nodo.datos as Record<string, unknown>;
  switch (nodo.tipo) {
    case "empresa":
    case "empresa_relacionada":
      return (d.sigla as string) || (d.nombre_oficial as string) || nodo.id;
    case "contrato":
      return (d.codcontrato as string) || `Contrato #${d.id}`;
    case "proyecto":
      return (d.nombre_proyecto_id as string) || nodo.id;
    case "geografia":
      return (d.departamento as string) || nodo.id;
    default:
      return nodo.id;
  }
}

function tooltipDeNodo(nodo: NodoVecindario): string {
  const d = nodo.datos as Record<string, unknown>;
  const lineas = [`<strong>${TIPO_LABEL[nodo.tipo] ?? nodo.tipo}</strong>: ${labelDeNodo(nodo)}`];
  if (nodo.tipo === "contrato") {
    if (d.estado_del_contrato) lineas.push(`Estado: ${d.estado_del_contrato}`);
    if (d.municipio) lineas.push(`${d.municipio}, ${d.departamento}`);
  } else if (nodo.tipo === "proyecto") {
    if (d.avance != null) lineas.push(`Avance: ${Math.round((d.avance as number) * 100)}%`);
    if (d.municipio) lineas.push(`${d.municipio}, ${d.departamento}`);
  } else if (nodo.tipo === "empresa_relacionada") {
    if (d.n_contratos_en_zona != null) lineas.push(`${d.n_contratos_en_zona} contrato(s) en la zona`);
  }
  return lineas.join("<br/>");
}

export default function RelationshipGraph({ nodos, aristas, isDark, onNodeClick, height = 420 }: Props) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const observer = new ResizeObserver((entries) => {
      const w = entries[0]?.contentRect.width;
      if (w) setWidth(w);
    });
    observer.observe(el);
    setWidth(el.clientWidth);
    return () => observer.disconnect();
  }, []);

  const graphData = useMemo(() => {
    const nodes: GraphNode[] = nodos.map((n) => ({
      id: n.id,
      tipo: n.tipo,
      label: labelDeNodo(n),
      tooltip: tooltipDeNodo(n),
      datos: n.datos as Record<string, unknown>,
    }));
    const links: LinkObject[] = aristas.map((a) => ({
      source: a.origen,
      target: a.destino,
      tipo: a.tipo,
      confianza: a.confianza,
    }));
    return { nodes, links };
  }, [nodos, aristas]);

  const handleNodeClick = useCallback(
    (node: NodeObject) => {
      const original = nodos.find((n) => n.id === node.id);
      if (original) onNodeClick?.(original);
    },
    [nodos, onNodeClick]
  );

  const linkColor = isDark ? "rgba(148, 163, 184, 0.35)" : "rgba(100, 116, 139, 0.35)";
  const bgColor = isDark ? "#0D1B2E" : "#F1F5F9";

  return (
    <div ref={containerRef} style={{ position: "relative", width: "100%", height, borderRadius: "0.5rem", overflow: "hidden" }}>
      {width > 0 && (
        <ForceGraph2D
          graphData={graphData}
          width={width}
          height={height}
          backgroundColor={bgColor}
          nodeId="id"
          nodeLabel={(node) => (node as GraphNode).tooltip}
          nodeColor={(node) => TIPO_COLOR[(node as GraphNode).tipo] ?? "#94A3B8"}
          nodeRelSize={5}
          nodeVal={(node) => ((node as GraphNode).tipo === "empresa" ? 3 : 1.4)}
          linkColor={() => linkColor}
          linkWidth={1}
          linkDirectionalArrowLength={3}
          linkDirectionalArrowRelPos={1}
          onNodeClick={handleNodeClick}
          cooldownTicks={100}
          nodeCanvasObject={(node, ctx, globalScale) => {
            const n = node as GraphNode;
            const fontSize = 11 / globalScale;
            const label = n.label;
            const x = n.x ?? 0;
            const y = n.y ?? 0;
            const radius = n.tipo === "empresa" ? 7 : 4.5;

            ctx.beginPath();
            ctx.arc(x, y, radius, 0, 2 * Math.PI, false);
            ctx.fillStyle = TIPO_COLOR[n.tipo] ?? "#94A3B8";
            ctx.fill();
            ctx.lineWidth = 1 / globalScale;
            ctx.strokeStyle = isDark ? "#0D1B2E" : "#F1F5F9";
            ctx.stroke();

            if (globalScale > 1.2) {
              ctx.font = `${fontSize}px sans-serif`;
              ctx.textAlign = "center";
              ctx.textBaseline = "top";
              ctx.fillStyle = isDark ? "#E2E8F0" : "#0F172A";
              ctx.fillText(label.length > 24 ? `${label.slice(0, 24)}…` : label, x, y + radius + 2);
            }
          }}
          nodePointerAreaPaint={(node, color, ctx) => {
            const n = node as GraphNode;
            const radius = n.tipo === "empresa" ? 7 : 4.5;
            ctx.beginPath();
            ctx.arc(n.x ?? 0, n.y ?? 0, radius + 2, 0, 2 * Math.PI, false);
            ctx.fillStyle = color;
            ctx.fill();
          }}
        />
      )}
      <div
        style={{
          position: "absolute",
          bottom: 10,
          left: 10,
          zIndex: 10,
          display: "flex",
          gap: 10,
          flexWrap: "wrap",
          background: isDark ? "rgba(15, 23, 42, 0.85)" : "rgba(255, 255, 255, 0.85)",
          backdropFilter: "blur(4px)",
          borderRadius: 8,
          padding: "5px 10px",
          border: `1px solid ${isDark ? "rgba(71, 85, 105, 0.4)" : "rgba(203, 213, 225, 0.6)"}`,
          pointerEvents: "none",
          fontSize: 10,
        }}
      >
        {Object.entries(TIPO_LABEL).map(([tipo, label]) => (
          <div key={tipo} style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <span
              style={{
                width: 8,
                height: 8,
                borderRadius: "50%",
                background: TIPO_COLOR[tipo],
                display: "inline-block",
              }}
            />
            <span style={{ color: isDark ? "#CBD5E1" : "#334155" }}>{label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
