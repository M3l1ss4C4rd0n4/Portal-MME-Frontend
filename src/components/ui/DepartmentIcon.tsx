"use client";

import { DEPARTMENT_SHAPES } from "@/lib/departmentShapes";
import { MapPin } from "lucide-react";

export default function DepartmentIcon({
  departamento,
  size = 18,
}: {
  departamento: string;
  size?: number;
}) {
  const shape = DEPARTMENT_SHAPES[departamento];

  if (!shape) {
    // Departamento sin silueta precomputada (fuera de los 10 cubiertos hoy por
    // Contratos OR) — fallback a un pin genérico en vez de dejar un hueco.
    return <MapPin size={size} className="text-theme-muted flex-shrink-0" />;
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      className="flex-shrink-0"
      aria-label={departamento}
    >
      <path d={shape.path} fill={shape.color} />
    </svg>
  );
}
