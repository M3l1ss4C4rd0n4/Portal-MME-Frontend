"use client";

import { motion, useReducedMotion, type Variants } from "framer-motion";
import { useTheme } from "@/providers/ThemeProvider";

// Misma curva de easing que slideVariants.center (HomeSlider.tsx) — el título,
// las tarjetas KPI y el slide en sí comparten una sola firma de movimiento.
const EASE_SLIDE = [0.25, 0.46, 0.45, 0.94] as const;

/** Animación de entrada compartida por los grids de KPIs/gráficas de cada slide. */
export const containerVariants: Variants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.08, delayChildren: 0.15 } },
};

/** Item hijo de containerVariants — usado por KpiBlock/HydroKpiBlock. */
export const itemVariants: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.45, ease: EASE_SLIDE } },
};

export function TopAccent({ color }: { color: string }) {
  return (
    <div
      className="absolute top-0 inset-x-0 h-1"
      style={{
        background: `linear-gradient(90deg, transparent, ${color}99, transparent)`,
      }}
    />
  );
}

export function CategoryTag({
  category,
  size = "sm",
}: {
  category: "energia" | "hidrocarburos";
  size?: "sm" | "md";
}) {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme !== "light";
  const isEnergia = category === "energia";
  const bgClass = isEnergia
    ? (isDark ? "bg-blue-900/40 border-blue-600/40 text-blue-400" : "bg-blue-100 border-blue-300 text-blue-700")
    : (isDark ? "bg-amber-900/40 border-amber-600/40 text-gold" : "bg-amber-100 border-amber-300 text-amber-700");
  const sizeClass = size === "md"
    ? "px-3 py-1.5 text-sm xl:text-base"
    : "px-3 py-1 text-[11px] xl:text-xs";
  return (
    <span className={`inline-flex items-center ${sizeClass} ${bgClass} rounded-full font-bold tracking-wider uppercase`}>
      <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
        {isEnergia ? (
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
        ) : (
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
        )}
      </svg>
      {isEnergia ? "ENERGÍA" : "HIDROCARBUROS"}
    </span>
  );
}

export function SectionBadge({
  label,
  dot,
  titleColorClass = "text-gold",
  category,
}: {
  label: string;
  /** Color del punto indicador. Si se omite, no se muestra ningún punto. */
  dot?: string;
  titleColorClass?: string;
  category?: "energia" | "hidrocarburos";
}) {
  const reduceMotion = useReducedMotion();
  const glowColor = category === "hidrocarburos" ? "#F59E0B" : "#3B82F6";

  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: EASE_SLIDE }}
      className="flex items-center justify-center flex-wrap gap-3 mb-2"
    >
      {dot && (
        <span className="relative inline-block w-3.5 h-3.5 shrink-0">
          <span
            className="absolute -inset-2.5 rounded-full blur-md"
            style={{ background: `radial-gradient(circle, ${dot}55, transparent 70%)` }}
            aria-hidden="true"
          />
          <span
            className="relative inline-block w-3.5 h-3.5 rounded-full"
            style={{ backgroundColor: dot }}
          />
        </span>
      )}
      <span className="relative inline-block">
        <motion.span
          className={`${titleColorClass} font-black tracking-[0.22em] text-xl xl:text-2xl 2xl:text-3xl uppercase`}
          animate={
            reduceMotion
              ? undefined
              : {
                  textShadow: [
                    `0 0 6px ${glowColor}00`,
                    `0 0 22px ${glowColor}CC`,
                    `0 0 6px ${glowColor}00`,
                  ],
                }
          }
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        >
          {label}
        </motion.span>
        {/* Brillo que recorre el texto — superpuesto exacto sobre el título,
            visible incluso con el degradado base (a diferencia de solo animar
            la sombra, que quedaba casi imperceptible sobre el fondo oscuro). */}
        {!reduceMotion && (
          <motion.span
            aria-hidden="true"
            className="absolute inset-0 font-black tracking-[0.22em] text-xl xl:text-2xl 2xl:text-3xl uppercase pointer-events-none select-none"
            style={{
              backgroundImage:
                "linear-gradient(100deg, transparent 35%, rgba(255,255,255,0.95) 50%, transparent 65%)",
              backgroundSize: "260% 100%",
              WebkitBackgroundClip: "text",
              backgroundClip: "text",
              color: "transparent",
              WebkitTextFillColor: "transparent",
            }}
            animate={{ backgroundPosition: ["160% 0%", "-160% 0%"] }}
            transition={{ duration: 2.8, repeat: Infinity, repeatDelay: 1.6, ease: "easeInOut" }}
          >
            {label}
          </motion.span>
        )}
      </span>
      {category && <CategoryTag category={category} />}
    </motion.div>
  );
}

export function TooltipSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mt-1.5">
      <span className="text-[10px] font-semibold uppercase tracking-wider text-theme-muted">{label}</span>
      <div className="text-xs text-theme-secondary leading-relaxed">{children}</div>
    </div>
  );
}

export function TooltipField({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-baseline gap-1.5 mt-0.5">
      <span className="text-theme-muted text-[11px] flex-shrink-0">{label}:</span>
      <span className="text-theme-primary">{value}</span>
    </div>
  );
}

export function TooltipDivider() {
  return <div className="my-1.5 border-t border-theme-primary/30" />;
}

export function NavArrow({
  direction,
  onClick,
}: {
  direction: "prev" | "next";
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      aria-label={direction === "prev" ? "Diapositiva anterior" : "Diapositiva siguiente"}
      className="absolute top-1/2 -translate-y-1/2 z-30 w-14 h-14 xl:w-16 xl:h-16 flex items-center justify-center rounded-full bg-black/30 border border-white/10 text-white/50 hover:bg-black/60 hover:border-white/20 hover:text-white transition-all duration-200 backdrop-blur-sm"
      style={{ [direction === "prev" ? "left" : "right"]: "1.5rem" }}
    >
      {direction === "prev" ? (
        <svg className="w-7 h-7 xl:w-8 xl:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
        </svg>
      ) : (
        <svg className="w-7 h-7 xl:w-8 xl:h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
      )}
    </button>
  );
}
