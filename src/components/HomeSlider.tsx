"use client";

import { motion, AnimatePresence } from "framer-motion";
import Link from "next/link";
import { useHomeSlider } from "@/hooks/useHomeSlider";
import type { HomeSliderProps } from "@/types/home-slider";
import {
  NavArrow,
  SlideContratosOR,
  SlidePresupuesto,
  SlideComunidades,
  SlideGestionSector,
  SlideSupervision,
  SlideSubsidios,
  SlideNoticia,
} from "@/components/slides";

const SLIDE_INTERVAL_MS = 8000;

const slideVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: { duration: 0.65, ease: [0.25, 0.46, 0.45, 0.94] as const },
  },
  exit: (dir: number) => ({
    x: dir > 0 ? "-100%" : "100%",
    opacity: 0,
    transition: { duration: 0.5, ease: [0.55, 0.04, 0.9, 0.3] as const },
  }),
};

const SLIDE_META = [
  { id: "sector",      label: "Sector",      color: "#3B82F6", href: "/energia"      },
  { id: "presupuesto", label: "Presupuesto", color: "#F59E0B", href: "/presupuesto"  },
  { id: "comunidades", label: "Comunidades", color: "#10B981", href: "/comunidades"  },
  { id: "contratos",   label: "Contratos OR",color: "#8B5CF6", href: "/contratos-or" },
  { id: "supervision", label: "Supervisión", color: "#06B6D4", href: "/supervision"  },
  { id: "subsidios",   label: "Subsidios",   color: "#EF4444", href: "/subsidios"    },
];

export default function HomeSlider(props: HomeSliderProps) {
  const { sectorData, sectorDetalle, presuData, cemData, cemDepts, orData, supData, subData, deficitFssri, deficitSeries, subBarData } = props;

  const {
    current,
    direction,
    news,
    paused,
    totalSlides,
    goTo,
    handlePrev,
    handleNext,
    setPaused,
  } = useHomeSlider();

  function renderSlide(idx: number) {
    if (idx === 0) return <SlideGestionSector d={sectorData} detalle={sectorDetalle} />;
    if (idx === 1) return <SlidePresupuesto d={presuData} />;
    if (idx === 2) return <SlideComunidades d={cemData} depts={cemDepts} />;
    if (idx === 3) return <SlideContratosOR d={orData} />;
    if (idx === 4) return <SlideSupervision d={supData} />;
    if (idx === 5) return <SlideSubsidios d={subData} deficitFssri={deficitFssri} deficitSeries={deficitSeries} subBarData={subBarData} />;
    const newsIdx = idx - 6;
    if (news[newsIdx]) {
      return (
        <SlideNoticia
          news={news[newsIdx]}
          index={newsIdx}
          total={news.length}
        />
      );
    }
    return null;
  }

  const dots = [
    ...SLIDE_META,
    ...news.map((_, i) => ({
      id: `news-${i}`,
      label: `Noticia ${i + 1}`,
      color: "#94A3B8",
    })),
  ];

  return (
    <section
      className="relative w-full overflow-hidden"
      style={{ height: "calc(100vh - 5rem)" }}
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-label="Carrusel de indicadores clave del sector energético"
    >
      <AnimatePresence initial={false} custom={direction} mode="wait">
        <motion.div
          key={`slide-${current}`}
          custom={direction}
          variants={slideVariants}
          initial="enter"
          animate="center"
          exit="exit"
          className="absolute inset-0"
        >
          {renderSlide(current)}
        </motion.div>
      </AnimatePresence>

      <NavArrow direction="prev" onClick={handlePrev} />
      <NavArrow direction="next" onClick={handleNext} />

      <div className="absolute bottom-0 inset-x-0 z-20 pb-5">
        <div className="w-full h-0.5 bg-white/5 mb-4">
          {!paused && (
            <motion.div
              key={`progress-${current}-${paused}`}
              initial={{ width: "0%" }}
              animate={{ width: "100%" }}
              transition={{ duration: SLIDE_INTERVAL_MS / 1000, ease: "linear" }}
              className="h-full bg-amber-500/60"
            />
          )}
        </div>

        <div className="flex items-center justify-center gap-2 xl:gap-3">
          {dots.map((dot, i) => (
            <button
              key={dot.id}
              onClick={() => goTo(i, i > current ? 1 : -1)}
              aria-label={`Ir a: ${dot.label}`}
              className="group relative transition-all duration-300"
            >
              {i === current ? (
                <span
                  className="block h-2.5 xl:h-3 rounded-full transition-all duration-300"
                  style={{
                    width: "2.5rem",
                    backgroundColor: dot.color,
                    boxShadow: `0 0 8px ${dot.color}80`,
                  }}
                />
              ) : (
                <span
                  className="block w-2.5 xl:w-3 h-2.5 xl:h-3 rounded-full opacity-30 group-hover:opacity-60 transition-opacity duration-200"
                  style={{ backgroundColor: dot.color }}
                />
              )}
              <span className="absolute bottom-full mb-2 left-1/2 -translate-x-1/2 px-2 py-1 bg-black/70 text-white text-xs rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none">
                {dot.label}
              </span>
            </button>
          ))}
        </div>

        {paused && (
          <p className="text-center text-slate-600 text-xs mt-2 tracking-widest">
            ⏸ PAUSADO
          </p>
        )}
      </div>

      <div className="absolute top-4 right-20 z-20 text-slate-600 text-sm xl:text-base font-mono">
        {String(current + 1).padStart(2, "0")} / {String(totalSlides).padStart(2, "0")}
      </div>

      {current < SLIDE_META.length && (
        <Link
          href={SLIDE_META[current].href}
          className="absolute top-3 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-slate-500 hover:text-amber-400 hover:bg-white/5 transition-all duration-200 text-sm xl:text-base"
          style={{ right: "calc(5rem + 6rem)" }}
        >
          Ver dashboard completo
          <svg className="w-3.5 h-3.5 xl:w-4 xl:h-4 opacity-70" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
          </svg>
        </Link>
      )}
    </section>
  );
}
