'use client';

import { motion } from 'framer-motion';

interface DashboardLayoutProps {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
}

export default function DashboardLayout({ title, subtitle, children }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-theme-primary">
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8 py-8 pt-28">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <div className="mb-2">
            <h1 className="text-3xl font-bold text-theme-primary">
              {title}
            </h1>
          </div>
          {subtitle && (
            <p className="text-theme-secondary mb-8">
              {subtitle}
            </p>
          )}

          {children}
        </motion.div>
      </div>
    </div>
  );
}
