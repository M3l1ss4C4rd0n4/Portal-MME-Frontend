"use client";

import { motion } from "framer-motion";
import { ReactNode } from "react";
import { cn } from "@/lib/utils";

interface ChartCardProps {
  title: string;
  subtitle?: string;
  children: ReactNode;
  className?: string;
  delay?: number;
  accent?: boolean;
}

export default function ChartCard({
  title,
  subtitle,
  children,
  className,
  delay = 0,
  accent = false,
}: ChartCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "rounded-2xl overflow-hidden transition-all duration-300",
        accent
          ? "bg-gradient-to-br from-blue-600 to-purple-700 text-white"
          : "bg-white dark:bg-[#1A1A2E] border border-gray-200 dark:border-gray-800",
        "hover:shadow-xl",
        className
      )}
    >
      <div className="p-5">
        <div className="mb-4">
          <h3
            className={cn(
              "text-sm font-semibold",
              accent ? "text-white" : "text-gray-900 dark:text-white"
            )}
          >
            {title}
          </h3>
          {subtitle && (
            <p
              className={cn(
                "text-xs mt-1",
                accent ? "text-blue-100" : "text-gray-500 dark:text-gray-400"
              )}
            >
              {subtitle}
            </p>
          )}
        </div>
        <div className="h-[200px] md:h-[220px]">{children}</div>
      </div>
    </motion.div>
  );
}
