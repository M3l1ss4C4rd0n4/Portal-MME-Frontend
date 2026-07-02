"use client";

import { useState, useRef } from "react";

interface InfoTooltipProps {
  content: React.ReactNode;
  /** Aumenta el ancho máximo para tooltips con mucho texto */
  wide?: boolean;
}

/**
 * Tooltip con ícono ℹ️ que muestra contenido enriquecido al hacer hover.
 * Usado para explicar KPIs y métricas en los slides del portal.
 */
export function InfoTooltip({ content, wide }: InfoTooltipProps) {
  const [show, setShow] = useState(false);
  const ref = useRef<HTMLSpanElement>(null);

  return (
    <span
      ref={ref}
      className="relative inline-flex items-center cursor-help"
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
      onFocus={() => setShow(true)}
      onBlur={() => setShow(false)}
    >
      <span className="text-slate-600 hover:text-slate-400 transition-colors text-[10px] leading-none ml-0.5 select-none">
        ⓘ
      </span>
      {show && (
        <div
          className={`absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2.5 bg-theme-secondary border border-theme-primary rounded-lg shadow-2xl pointer-events-none ${
            wide ? "w-[360px] max-w-[90vw]" : "w-[280px] max-w-[90vw]"
          }`}
        >
          {/* Flechita */}
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-r-[6px] border-t-[6px] border-l-transparent border-r-transparent border-t-theme-primary" />
          <div className="absolute top-full left-1/2 -translate-x-1/2 w-0 h-0 mt-[-2px] border-l-[5px] border-r-[5px] border-t-[5px] border-l-transparent border-r-transparent border-t-theme-secondary" />
          {/* Contenido */}
          <div className="text-xs text-slate-300 leading-relaxed">{content}</div>
        </div>
      )}
    </span>
  );
}
