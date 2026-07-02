"use client";

import { motion } from "framer-motion";
import { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

interface KPICardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: number;
    label: string;
    positive?: boolean;
  };
  color?: "blue" | "purple" | "emerald" | "amber" | "rose" | "cyan";
  className?: string;
  delay?: number;
  onClick?: () => void;
  selected?: boolean;
}

const colorVariants = {
  blue: {
    bg: "bg-blue-500/10 dark:bg-blue-500/20",
    border: "border-blue-200 dark:border-blue-500/30",
    icon: "text-blue-600 dark:text-blue-400",
    glow: "group-hover:shadow-blue-500/20",
  },
  purple: {
    bg: "bg-purple-500/10 dark:bg-purple-500/20",
    border: "border-purple-200 dark:border-purple-500/30",
    icon: "text-purple-600 dark:text-purple-400",
    glow: "group-hover:shadow-purple-500/20",
  },
  emerald: {
    bg: "bg-emerald-500/10 dark:bg-emerald-500/20",
    border: "border-emerald-200 dark:border-emerald-500/30",
    icon: "text-emerald-600 dark:text-emerald-400",
    glow: "group-hover:shadow-emerald-500/20",
  },
  amber: {
    bg: "bg-amber-500/10 dark:bg-amber-500/20",
    border: "border-amber-200 dark:border-amber-500/30",
    icon: "text-amber-600 dark:text-gold",
    glow: "group-hover:shadow-amber-500/20",
  },
  rose: {
    bg: "bg-rose-500/10 dark:bg-rose-500/20",
    border: "border-rose-200 dark:border-rose-500/30",
    icon: "text-rose-600 dark:text-rose-400",
    glow: "group-hover:shadow-rose-500/20",
  },
  cyan: {
    bg: "bg-cyan-500/10 dark:bg-cyan-500/20",
    border: "border-cyan-200 dark:border-cyan-500/30",
    icon: "text-cyan-600 dark:text-cyan-400",
    glow: "group-hover:shadow-cyan-500/20",
  },
};

export default function KPICard({
  title,
  value,
  subtitle,
  icon: Icon,
  trend,
  color = "blue",
  className,
  delay = 0,
  onClick,
  selected = false,
}: KPICardProps) {
  const colors = colorVariants[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      onClick={onClick}
      className={cn(
        "group relative overflow-hidden rounded-2xl bg-white dark:bg-[#1A1A2E] border-2 transition-all duration-300 cursor-pointer",
        colors.border,
        colors.glow,
        "hover:shadow-xl",
        selected && "ring-2 ring-offset-2 ring-offset-white dark:ring-offset-[#0A0A0A] ring-blue-500",
        className
      )}
    >
      {/* Background gradient */}
      <div className={cn("absolute inset-0 opacity-50 transition-opacity", colors.bg)} />
      
      {/* Content */}
      <div className="relative p-5">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
              {title}
            </p>
            <p className={cn(
              "font-bold text-gray-900 dark:text-white tracking-tight break-all",
              String(value).length <= 8
                ? "text-2xl md:text-3xl"
                : String(value).length <= 12
                ? "text-xl md:text-2xl"
                : String(value).length <= 16
                ? "text-lg md:text-xl"
                : "text-base md:text-lg"
            )}>
              {value}
            </p>
            {subtitle && (
              <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                {subtitle}
              </p>
            )}
            {trend && (
              <div className="flex items-center gap-2 mt-2">
                <span
                  className={cn(
                    "inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium",
                    trend.positive
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-500/20 dark:text-emerald-400"
                      : "bg-rose-100 text-rose-700 dark:bg-rose-500/20 dark:text-rose-400"
                  )}
                >
                  {trend.positive ? "+" : ""}{trend.value}%
                </span>
                <span className="text-xs text-gray-500 dark:text-gray-500">
                  {trend.label}
                </span>
              </div>
            )}
          </div>
          
          {/* Icon */}
          <div
            className={cn(
              "flex-shrink-0 w-12 h-12 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110",
              colors.bg
            )}
          >
            <Icon className={cn("w-6 h-6", colors.icon)} />
          </div>
        </div>
      </div>

      {/* Hover effect */}
      <div className="absolute inset-0 rounded-2xl ring-1 ring-inset ring-white/10 dark:ring-white/5 pointer-events-none" />
    </motion.div>
  );
}
