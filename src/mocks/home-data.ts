/**
 * Mock Data - Portal Home MME
 * Valores exactos del dashboard ArcGIS
 */

export interface KpiData {
  label: string;
  value: string | number;
  prefix?: string;
  suffix?: string;
  icon?: string;
  highlight?: boolean;
  subLabel?: string;
}

export interface GaugeData {
  label: string;
  value: number;
  color: 'gold' | 'white' | 'muted';
  size?: 'sm' | 'md' | 'lg';
}

export interface SubSection {
  title: string;
  gauges?: GaugeData[];
  kpis?: KpiData[];
  details?: { label: string; value: string }[];
}

export interface DashboardCardData {
  id: string;
  title: string;
  icon?: string;
  alert?: boolean;
  kpis: KpiData[];
  gauges?: GaugeData[];
  subSections?: SubSection[];
  updateTime?: string;
  link: string;
}

// Datos exactos de la imagen ArcGIS
export const homeDashboardData: Record<string, DashboardCardData> = {
  gestionSector: {
    id: 'gestion-sector',
    title: 'GESTIÓN DEL SECTOR',
    icon: 'energia',
    alert: true,
    kpis: [
      { 
        label: 'Precio de bolsa (COP/kWh)', 
        value: '$332.2', 
        icon: 'chart',
        highlight: true 
      },
      { 
        label: 'Energía Generada GWh', 
        value: '245.5', 
        icon: 'bulb',
        highlight: true 
      },
    ],
    gauges: [
      { label: '% Embalses', value: 66, color: 'gold' },
    ],
    updateTime: '1/04/2026, 3:00 AM',
    link: '/energia',
  },

  presupuesto: {
    id: 'presupuesto',
    title: 'EJECUCIÓN PRESUPUESTAL 2026',
    kpis: [
      { 
        label: 'Apropiación Pptal DEE', 
        value: '$ 7.105.844.200.047',
        subLabel: 'Apropiación total'
      },
      { 
        label: 'Comprometido', 
        value: '$ 2.396.981.420.251,00',
        highlight: true 
      },
      { 
        label: 'Obligado', 
        value: '$ 6.028.108.212,00',
        highlight: true 
      },
    ],
    gauges: [
      { label: '% Comprometido', value: 33.7, color: 'gold' },
      { label: '% Obligado', value: 0.08, color: 'white' },
    ],
    updateTime: undefined, // Se actualiza dinámicamente desde la API
    link: '/presupuesto',
  },

  comunidades: {
    id: 'comunidades',
    title: 'IMPLEMENTADAS',
    kpis: [
      { 
        label: 'CE Implementadas', 
        value: 469, 
        icon: 'people',
        subLabel: 'Total comunidades'
      },
      { 
        label: 'Inversión Estimada', 
        value: '$ 290,379,880,159.74',
        highlight: true 
      },
      { 
        label: 'Capacidad de generación', 
        value: '12,837.12 kWp', 
        icon: 'bolt',
        subLabel: 'Potencia instalada'
      },
    ],
    updateTime: '1/04/2026, 3:00 AM',
    link: '/comunidades',
  },

  contratosOR: {
    id: 'contratos-or',
    title: 'CONTRATOS OR 2025',
    kpis: [
      { label: 'No Contratos', value: 17, icon: 'document' },
      // Nota: Usuarios y CEs no están disponibles en la base de datos actual
    ],
    gauges: [
      { label: 'Avance Financiero', value: 8.34, color: 'gold' },
      { label: 'Avance General', value: 16.1, color: 'white' },
    ],
    updateTime: '1/04/2026, 3:00 AM',
    link: '/contratos-or',
  },

  supervision: {
    id: 'supervision',
    title: 'SUPERVISIÓN',
    kpis: [
      { label: 'No. Contratos', value: 840, icon: 'document' },
      { label: 'No. Proyectos', value: '2,426', icon: 'folder' },
      { label: 'Contratos en ejecución', value: 319, icon: 'document' },
      { label: 'No. Contratos liquidados', value: 295, icon: 'document' },
    ],
    gauges: [
      { label: 'Avance Físico', value: 87, color: 'gold' },
      { label: 'Avance Financiero', value: 85, color: 'gold' },
    ],
    updateTime: '1/04/2026, 3:00 AM',
    link: '/supervision',
  },

  subsidios: {
    id: 'subsidios',
    title: 'SUBSIDIOS',
    kpis: [
      { 
        label: 'Déficit Acumulado — Corte 1 de abril', 
        value: '$ 3,675,576,085,093',
        highlight: true 
      },
    ],
    subSections: [
      {
        title: 'Resoluciones 2026 — Corte 1 de abril',
        kpis: [
          { label: 'Resoluciones Expedidas', value: 13, icon: 'mail' },
          { label: 'Asignado', value: '$ 1,486,892,089,245' },
          { label: 'Pendiente *', value: '$ 117,203,109,713', highlight: true },
          { label: 'Pagado', value: '$ 1,369,688,979,532' },
        ],
      },
    ],
    updateTime: '1/04/2026, 3:00 AM',
    link: '/subsidios',
  },
};
