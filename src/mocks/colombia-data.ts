// Datos de prueba para Colombia - Dashboard Energía

export interface DepartamentoData {
  id: string;
  nombre: string;
  capital: string;
  coordenadas: [number, number];
  energia: {
    generacionGWh: number;
    consumoGWh: number;
    cobertura: number;
    perdidas: number;
    usuarios: number;
    capacidadInstalada: number;
  };
  comunidadesEnergeticas: number;
  inversiones: number;
  proyectosActivos: number;
}

export interface EnergiaData {
  generacionGWh: number;
  consumoGWh: number;
  cobertura: number;
  perdidas: number;
  usuarios: number;
  capacidadInstalada: number;
}

export interface NacionalData {
  energia: EnergiaData;
  comunidadesEnergeticas: number;
  inversionTotal: number;
  proyectosNacionales: number;
  precioBolsa: number;
  emisionesCO2: number;
}

// Datos a nivel nacional
export const dataNacional: NacionalData = {
  energia: {
    generacionGWh: 65920,
    consumoGWh: 58940,
    cobertura: 97.8,
    perdidas: 12.4,
    usuarios: 15234500,
    capacidadInstalada: 18500,
  },
  comunidadesEnergeticas: 469,
  inversionTotal: 290379880159,
  proyectosNacionales: 842,
  precioBolsa: 332.2,
  emisionesCO2: 24500000,
};

// Datos por departamento
export const dataDepartamentos: DepartamentoData[] = [
  {
    id: "BOG",
    nombre: "Bogotá D.C.",
    capital: "Bogotá",
    coordenadas: [4.711, -74.0721],
    energia: {
      generacionGWh: 2450,
      consumoGWh: 12890,
      cobertura: 99.9,
      perdidas: 8.2,
      usuarios: 2850000,
      capacidadInstalada: 450,
    },
    comunidadesEnergeticas: 12,
    inversiones: 45000000000,
    proyectosActivos: 45,
  },
  {
    id: "ANT",
    nombre: "Antioquia",
    capital: "Medellín",
    coordenadas: [6.2476, -75.5658],
    energia: {
      generacionGWh: 18920,
      consumoGWh: 10230,
      cobertura: 98.5,
      perdidas: 10.5,
      usuarios: 2850000,
      capacidadInstalada: 6500,
    },
    comunidadesEnergeticas: 78,
    inversiones: 52300000000,
    proyectosActivos: 128,
  },
  {
    id: "VAL",
    nombre: "Valle del Cauca",
    capital: "Cali",
    coordenadas: [3.4516, -76.532],
    energia: {
      generacionGWh: 4250,
      consumoGWh: 7890,
      cobertura: 97.2,
      perdidas: 11.8,
      usuarios: 2100000,
      capacidadInstalada: 1200,
    },
    comunidadesEnergeticas: 54,
    inversiones: 38900000000,
    proyectosActivos: 89,
  },
  {
    id: "ATL",
    nombre: "Atlántico",
    capital: "Barranquilla",
    coordenadas: [10.9639, -74.7964],
    energia: {
      generacionGWh: 1850,
      consumoGWh: 4520,
      cobertura: 98.1,
      perdidas: 13.2,
      usuarios: 1200000,
      capacidadInstalada: 380,
    },
    comunidadesEnergeticas: 28,
    inversiones: 21400000000,
    proyectosActivos: 52,
  },
  {
    id: "BOL",
    nombre: "Bolívar",
    capital: "Cartagena",
    coordenadas: [10.391, -75.4794],
    energia: {
      generacionGWh: 15820,
      consumoGWh: 3240,
      cobertura: 92.5,
      perdidas: 18.5,
      usuarios: 890000,
      capacidadInstalada: 5200,
    },
    comunidadesEnergeticas: 23,
    inversiones: 18200000000,
    proyectosActivos: 38,
  },
  {
    id: "SANT",
    nombre: "Santander",
    capital: "Bucaramanga",
    coordenadas: [7.1193, -73.1227],
    energia: {
      generacionGWh: 2450,
      consumoGWh: 3450,
      cobertura: 96.8,
      perdidas: 14.2,
      usuarios: 950000,
      capacidadInstalada: 850,
    },
    comunidadesEnergeticas: 31,
    inversiones: 19800000000,
    proyectosActivos: 44,
  },
  {
    id: "CUN",
    nombre: "Cundinamarca",
    capital: "Bogotá",
    coordenadas: [4.711, -74.0721],
    energia: {
      generacionGWh: 3850,
      consumoGWh: 4120,
      cobertura: 95.4,
      perdidas: 15.8,
      usuarios: 1100000,
      capacidadInstalada: 1100,
    },
    comunidadesEnergeticas: 42,
    inversiones: 23600000000,
    proyectosActivos: 61,
  },
  {
    id: "COR",
    nombre: "Córdoba",
    capital: "Montería",
    coordenadas: [8.7479, -75.887],
    energia: {
      generacionGWh: 420,
      consumoGWh: 1890,
      cobertura: 89.2,
      perdidas: 22.5,
      usuarios: 520000,
      capacidadInstalada: 85,
    },
    comunidadesEnergeticas: 18,
    inversiones: 9800000000,
    proyectosActivos: 28,
  },
  {
    id: "NAR",
    nombre: "Nariño",
    capital: "Pasto",
    coordenadas: [1.2136, -77.2811],
    energia: {
      generacionGWh: 1250,
      consumoGWh: 1420,
      cobertura: 88.5,
      perdidas: 19.8,
      usuarios: 480000,
      capacidadInstalada: 420,
    },
    comunidadesEnergeticas: 35,
    inversiones: 12500000000,
    proyectosActivos: 42,
  },
  {
    id: "TOL",
    nombre: "Tolima",
    capital: "Ibagué",
    coordenadas: [4.4447, -75.2424],
    energia: {
      generacionGWh: 2150,
      consumoGWh: 2150,
      cobertura: 94.2,
      perdidas: 16.5,
      usuarios: 720000,
      capacidadInstalada: 780,
    },
    comunidadesEnergeticas: 29,
    inversiones: 15600000000,
    proyectosActivos: 38,
  },
];

// Datos históricos para gráficas
export const historicoGeneracion = [
  { mes: "Ene", generacion: 5450, consumo: 5200 },
  { mes: "Feb", generacion: 5280, consumo: 4980 },
  { mes: "Mar", generacion: 5490, consumo: 5100 },
  { mes: "Abr", generacion: 5620, consumo: 4950 },
  { mes: "May", generacion: 5890, consumo: 5120 },
  { mes: "Jun", generacion: 6230, consumo: 5480 },
  { mes: "Jul", generacion: 6450, consumo: 5780 },
  { mes: "Ago", generacion: 6120, consumo: 5620 },
  { mes: "Sep", generacion: 5980, consumo: 5380 },
  { mes: "Oct", generacion: 5720, consumo: 5150 },
  { mes: "Nov", generacion: 5490, consumo: 4980 },
  { mes: "Dic", generacion: 5620, consumo: 5100 },
];

// Datos por fuente de generación
export const generacionPorFuente = [
  { id: "Hidráulica", label: "Hidráulica", value: 68, color: "#3B82F6" },
  { id: "Térmica", label: "Térmica", value: 24, color: "#EF4444" },
  { id: "Solar", label: "Solar", value: 5, color: "#F59E0B" },
  { id: "Eólica", label: "Eólica", value: 2, color: "#10B981" },
  { id: "Biomasa", label: "Biomasa", value: 1, color: "#8B5CF6" },
];

// Datos de consumo por sector
export const consumoPorSector = [
  { sector: "Residencial", consumo: 42, color: "#3B82F6" },
  { sector: "Comercial", consumo: 28, color: "#8B5CF6" },
  { sector: "Industrial", consumo: 22, color: "#F59E0B" },
  { sector: "Oficial", consumo: 5, color: "#10B981" },
  { sector: "Otros", consumo: 3, color: "#6B7280" },
];

// Top departamentos por generación
export const topDepartamentosGeneracion = [
  { departamento: "Antioquia", generacion: 18920, color: "#3B82F6" },
  { departamento: "Bolívar", generacion: 15820, color: "#8B5CF6" },
  { departamento: "Valle", generacion: 4250, color: "#F59E0B" },
  { departamento: "Cundinamarca", generacion: 3850, color: "#10B981" },
  { departamento: "Tolima", generacion: 2150, color: "#EF4444" },
];

// Tipos de proyectos
export const proyectosPorTipo = [
  { tipo: "Generación", cantidad: 245, porcentaje: 29 },
  { tipo: "Transmisión", cantidad: 128, porcentaje: 15 },
  { tipo: "Distribución", cantidad: 342, porcentaje: 41 },
  { tipo: "Comercialización", cantidad: 127, porcentaje: 15 },
];

// ─── Nuevos datos para el dashboard home enriquecido ───────────────────────

// Serie diaria de precio de bolsa – Marzo 2026 (formato Nivo Line)
export const precioBolsaSeries = [
  {
    id: "COP/kWh",
    color: "#F59E0B",
    data: [
      { x: "1", y: 310.5 }, { x: "2", y: 315.2 }, { x: "3", y: 318.8 },
      { x: "4", y: 316.3 }, { x: "5", y: 320.1 }, { x: "6", y: 322.7 },
      { x: "7", y: 319.4 }, { x: "8", y: 325.6 }, { x: "9", y: 328.2 },
      { x: "10", y: 324.9 }, { x: "11", y: 327.3 }, { x: "12", y: 330.8 },
      { x: "13", y: 328.5 }, { x: "14", y: 332.1 }, { x: "15", y: 329.7 },
      { x: "16", y: 331.4 }, { x: "17", y: 334.2 }, { x: "18", y: 338.5 },
      { x: "19", y: 335.8 }, { x: "20", y: 333.1 }, { x: "21", y: 336.4 },
      { x: "22", y: 339.7 }, { x: "23", y: 337.2 }, { x: "24", y: 334.8 },
      { x: "25", y: 332.2 },
    ],
  },
];

// Porcentaje de embalse por departamento (% de llenado)
// Claves = nombres exactos del stateCode de @react-map/colombia
export const embalsesPorDepto: Record<string, number> = {
  "Antioquia": 72, "Boyacá": 71, "Cundinamarca": 61, "Huila": 78,
  "Bolívar": 48, "Valle del Cauca": 65, "Caldas": 68, "Nariño": 55,
  "Córdoba": 30, "La Guajira": 22, "Santander": 63, "Tolima": 58,
  "Meta": 44, "Magdalena": 52, "Cauca": 60, "Chocó": 82,
  "Risaralda": 70, "Quindío": 67, "Norte de Santander": 45,
  "Cesar": 38, "Sucre": 35, "Atlántico": 40, "Casanare": 50,
  "Arauca": 42, "Caquetá": 75, "Putumayo": 70, "Guainía": 85,
  "Amazonas": 88, "Vichada": 60, "Distrito Capital de Bogotá": 45,
};

// Comunidades Energéticas por departamento
export const comunidadesEnergeticasPorDepto: Record<string, number> = {
  "Antioquia": 78, "Valle del Cauca": 54, "Atlántico": 28, "Bolívar": 23,
  "Cundinamarca": 42, "Santander": 31, "Nariño": 35, "Córdoba": 18,
  "Tolima": 29, "Meta": 22, "Huila": 25, "Cauca": 19,
  "Caldas": 15, "Boyacá": 16, "Magdalena": 14, "Cesar": 12,
  "Norte de Santander": 11, "La Guajira": 8, "Chocó": 9,
  "Sucre": 7, "Risaralda": 10, "Quindío": 6, "Caquetá": 5,
  "Arauca": 4, "Casanare": 6, "Putumayo": 4,
};

// Color por nivel de embalse — metodología oficial XM/UPME/Superservicios
// >80% Normal (verde), 70-80% Estable (cyan), 60-70% Alerta (ámbar), 50-60% Delicada (naranja), <50% Crítico (rojo)
export function getEmbalseColor(pct: number): string {
  if (pct > 80) return "#22C55E";
  if (pct >= 70) return "#06B6D4";
  if (pct >= 60) return "#F59E0B";
  if (pct >= 50) return "#F97316";
  return "#EF4444";
}

export function getEmbalseEstado(pct: number): string {
  if (pct > 80) return "Normal";
  if (pct >= 70) return "Estable";
  if (pct >= 60) return "Alerta temprana";
  if (pct >= 50) return "Situación delicada";
  return "Crítico";
}

// cityColors calculados para @react-map/colombia
export const embalsesCityColors: Record<string, string> = Object.fromEntries(
  Object.entries(embalsesPorDepto).map(([dept, pct]) => [dept, getEmbalseColor(pct)])
);

const _maxCE = Math.max(...Object.values(comunidadesEnergeticasPorDepto));
export const comunidadesCityColors: Record<string, string> = Object.fromEntries(
  Object.entries(comunidadesEnergeticasPorDepto).map(([dept, count]) => {
    const ratio = count / _maxCE;
    let color: string;
    if (ratio >= 0.75) color = "#F59E0B";
    else if (ratio >= 0.5) color = "#D97706";
    else if (ratio >= 0.3) color = "#B45309";
    else if (ratio >= 0.1) color = "#78350F";
    else color = "#451A03";
    return [dept, color];
  })
);

// Evolución histórica del déficit acumulado de subsidios (mM COP)
export const deficitHistoricoSeries = [
  {
    id: "Déficit",
    color: "#EF4444",
    data: [
      { x: "2020", y: 850 }, { x: "2021", y: 1240 }, { x: "2022", y: 1820 },
      { x: "2023", y: 2450 }, { x: "2024", y: 3120 }, { x: "2025", y: 3470 },
    ],
  },
];

// Distribución de contratos de supervisión (para donut)
export const contratosSupervisionDonut = [
  { id: "En Ejecución", label: "En Ejecución", value: 319, color: "#22C55E" },
  { id: "Liquidados", label: "Liquidados", value: 295, color: "#3B82F6" },
  { id: "Otros", label: "Otros", value: 226, color: "#475569" },
];

