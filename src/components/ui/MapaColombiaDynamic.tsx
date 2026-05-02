"use client";

import dynamic from "next/dynamic";
import { DepartamentoData } from "@/mocks/colombia-data";

// Importar el mapa dinámicamente para evitar problemas de SSR
const MapaColombia = dynamic(() => import("./MapaColombia"), {
  ssr: false,
  loading: () => (
    <div className="h-[400px] md:h-[500px] rounded-2xl bg-gray-100 dark:bg-[#1A1A2E] animate-pulse flex items-center justify-center">
      <p className="text-gray-500 dark:text-gray-400">Cargando mapa...</p>
    </div>
  ),
});

interface MapaColombiaDynamicProps {
  departamentos: DepartamentoData[];
  departamentoSeleccionado: string | null;
  onSelectDepartamento: (id: string | null) => void;
  className?: string;
}

export default function MapaColombiaDynamic(props: MapaColombiaDynamicProps) {
  return <MapaColombia {...props} />;
}
