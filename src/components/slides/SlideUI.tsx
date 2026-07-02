"use client";

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

export function SectionBadge({
  label,
  pulse = false,
  dot = "#F59E0B",
}: {
  label: string;
  pulse?: boolean;
  dot?: string;
}) {
  return (
    <div className="flex items-center justify-center gap-3 mb-2">
      <span
        className={`w-3.5 h-3.5 rounded-full ${pulse ? "animate-pulse" : ""}`}
        style={{ backgroundColor: dot }}
      />
      <span className="text-gold font-black tracking-[0.3em] text-xl xl:text-2xl 2xl:text-3xl uppercase">
        {label}
      </span>
    </div>
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
