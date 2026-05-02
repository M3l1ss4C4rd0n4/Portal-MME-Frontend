'use client';

import { useTheme } from '@/providers/ThemeProvider';
import { motion, AnimatePresence } from 'framer-motion';
import { SunIcon, MoonIcon, ComputerDesktopIcon } from '@heroicons/react/24/outline';

export default function ThemeToggle() {
  const { theme, setTheme, mounted } = useTheme();

  // Prevent hydration mismatch - render placeholder until mounted
  if (!mounted) {
    return (
      <div className="flex items-center gap-1 bg-white/5 backdrop-blur-sm rounded-full p-1 border border-white/10 opacity-50">
        <div className="p-2 rounded-full">
          <MoonIcon className="w-4 h-4 text-gray-400" />
        </div>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 bg-white/5 backdrop-blur-sm rounded-full p-1 border border-white/10">
      {/* Dark mode button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setTheme('dark')}
        className={`relative p-2 rounded-full transition-all duration-300 ${
          theme === 'dark'
            ? 'bg-gold text-white shadow-lg shadow-gold/30'
            : 'text-gray-400 hover:text-white hover:bg-white/10'
        }`}
        title="Modo oscuro"
      >
        <MoonIcon className="w-4 h-4" />
      </motion.button>

      {/* System/Auto button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setTheme('system')}
        className={`relative p-2 rounded-full transition-all duration-300 ${
          theme === 'system'
            ? 'bg-gold text-white shadow-lg shadow-gold/30'
            : 'text-gray-400 hover:text-white hover:bg-white/10'
        }`}
        title="Automático (sistema)"
      >
        <ComputerDesktopIcon className="w-4 h-4" />
      </motion.button>

      {/* Light mode button */}
      <motion.button
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
        onClick={() => setTheme('light')}
        className={`relative p-2 rounded-full transition-all duration-300 ${
          theme === 'light'
            ? 'bg-gold text-white shadow-lg shadow-gold/30'
            : 'text-gray-400 hover:text-white hover:bg-white/10'
        }`}
        title="Modo claro"
      >
        <SunIcon className="w-4 h-4" />
      </motion.button>
    </div>
  );
}

// Simple toggle version
export function SimpleThemeToggle() {
  const { resolvedTheme, toggleTheme, mounted } = useTheme();

  if (!mounted) {
    return (
      <div className="p-2.5 rounded-full">
        <MoonIcon className="w-5 h-5 text-gray-400" />
      </div>
    );
  }

  return (
    <motion.button
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.95 }}
      onClick={toggleTheme}
      className="relative p-2.5 text-theme-muted hover:text-gold transition-all duration-300 rounded-full hover:bg-theme-hover"
      title={resolvedTheme === 'dark' ? 'Cambiar a modo claro' : 'Cambiar a modo oscuro'}
    >
      <AnimatePresence mode="wait">
        {resolvedTheme === 'dark' ? (
          <motion.div
            key="moon"
            initial={{ rotate: -90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: 90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <MoonIcon className="w-5 h-5" />
          </motion.div>
        ) : (
          <motion.div
            key="sun"
            initial={{ rotate: 90, opacity: 0 }}
            animate={{ rotate: 0, opacity: 1 }}
            exit={{ rotate: -90, opacity: 0 }}
            transition={{ duration: 0.2 }}
          >
            <SunIcon className="w-5 h-5" />
          </motion.div>
        )}
      </AnimatePresence>
    </motion.button>
  );
}
