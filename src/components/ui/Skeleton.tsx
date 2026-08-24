"use client";

/** Bloque atómico pulsante — mismo patrón que ya usa InformesDiariosSlider.tsx. */
export function SkeletonBlock({ className = "" }: { className?: string }) {
  return <div className={`bg-theme-hover rounded animate-pulse ${className}`} />;
}

/** Placeholder del tamaño de una tarjeta KPI real (HydroKpiBlock/KpiBlock), para que no salte el layout al llegar el dato. */
export function SkeletonKpiCard() {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-2 py-2.5 bg-theme-secondary border border-card-energia border-t-2 border-t-[var(--color-title-energia)] rounded-xl">
      <SkeletonBlock className="h-3 w-28" />
      <SkeletonBlock className="h-9 w-24" />
      <SkeletonBlock className="h-2.5 w-32" />
    </div>
  );
}

/** Placeholder del alto de una gráfica real, con una barra de título pulsante encima. */
export function SkeletonChart({ heightClass = "h-[20vh]" }: { heightClass?: string }) {
  return (
    <div className="flex flex-col gap-2 w-full">
      <SkeletonBlock className="h-2.5 w-32" />
      <SkeletonBlock className={`w-full ${heightClass}`} />
    </div>
  );
}
