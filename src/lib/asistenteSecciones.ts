import type { ComponentType, SVGProps } from "react";
import {
  ChartBarIcon, BuildingOffice2Icon, BanknotesIcon,
  MagnifyingGlassIcon, ChartPieIcon, DocumentTextIcon, ArrowTrendingUpIcon,
} from "@heroicons/react/24/outline";

export interface SeccionPrompt {
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
  description: string;
  prompt: string;
}

/**
 * Accesos rápidos a las secciones del portal — usados tanto en el drawer
 * (ChatbotWidget) como en la barra lateral permanente de /asistente. Cada uno
 * envía una pregunta real al motor de IA (/api/asistente), no un árbol de menús.
 */
export const SECTION_PROMPTS: SeccionPrompt[] = [
  {
    icon: ChartBarIcon,
    label: "Gestión del sector",
    description: "Generación, precio de bolsa y embalses",
    prompt: "¿Cuál es el estado actual del sector energético: generación, precio de bolsa y embalses?",
  },
  {
    icon: BuildingOffice2Icon,
    label: "Comunidades energéticas",
    description: "Implementadas, Contratos OR, Fenoge y Colombia Solar",
    prompt: "Dame un resumen de las comunidades energéticas: implementadas, Contratos OR, Fenoge y Colombia Solar.",
  },
  {
    icon: BanknotesIcon,
    label: "Subsidios",
    description: "Déficit histórico, pagos y validaciones",
    prompt: "¿Cómo está el déficit histórico de subsidios, los pagos y las validaciones?",
  },
  {
    icon: MagnifyingGlassIcon,
    label: "Supervisión",
    description: "Contratos de supervisión de MinMinas",
    prompt: "¿Cuál es el estado de la supervisión de contratos de MinMinas?",
  },
  {
    icon: ChartPieIcon,
    label: "Ejecución presupuestal",
    description: "Ejecución presupuestal de la Dirección de Energía Eléctrica",
    prompt: "¿Cómo va la ejecución presupuestal de la Dirección de Energía Eléctrica (DEE)?",
  },
  {
    icon: DocumentTextIcon,
    label: "Informe ejecutivo",
    description: "Resumen ejecutivo integrado del portal",
    prompt: "Dame el informe ejecutivo integrado del portal.",
  },
  {
    icon: ArrowTrendingUpIcon,
    label: "Predicciones del portal y simulaciones de XM",
    description: "Compara las predicciones de embalses del portal con la última simulación de XM",
    prompt:
      "XM publica su simulación determinística con política estocástica de embalses en el " +
      "Análisis Energético de Corto Plazo (semanal) y en el Boletín Energético (mediano plazo) " +
      "— no existe una simulación de embalses separada para 'largo plazo', XM no la publica. " +
      "Busca en corto plazo y en mediano plazo las reservas/embalse agregado del SIN esperado " +
      "más reciente que encuentres, y compáralo con las predicciones/simulaciones de embalses " +
      "del tablero de predicciones del portal. Cita explícitamente de qué informe y horizonte " +
      "(corto/mediano plazo) sacaste cada cifra de XM. " +
      "Si no encuentras una cifra exacta en alguno de los dos, dilo explícitamente en vez de inventarla.",
  },
];
