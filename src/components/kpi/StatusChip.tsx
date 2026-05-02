"use client";

interface StatusChipProps {
  label: string;
  color: string;
}

export function StatusChip({ label, color }: StatusChipProps) {
  return (
    <div
      className="mt-1.5 inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] xl:text-xs font-bold tracking-wider uppercase"
      style={{ background: `${color}22`, border: `1px solid ${color}55`, color }}
    >
      <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ background: color }} />
      {label}
    </div>
  );
}
