'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Bars3Icon, XMarkIcon, BellIcon, UserCircleIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from './ui/ThemeToggle';
import { useTheme } from '@/providers/ThemeProvider';

interface NavItem {
  label: string;
  href: string;
  children?: { label: string; href: string }[];
}

const navItems: NavItem[] = [
  { label: 'Inicio', href: '/' },
  {
    label: 'Energía (SIN)',
    href: '/energia',
    children: [
      { label: 'Gestión del sector', href: '/energia' },
      { label: 'Portal Energético', href: 'https://portalenergetico.minenergia.gov.co/' },
    ],
  },
  { label: 'Presupuesto', href: '/presupuesto' },
  {
    label: 'Comunidades',
    href: '/comunidades',
    children: [
      { label: 'Implementadas', href: '/comunidades' },
      { label: 'Contratos OR', href: '/contratos-or' },
      { label: 'Fenoge 1.0, 1.1', href: '/fenoge' },
    ],
  },
  { label: 'Supervisión', href: '/supervision' },
  {
    label: 'Subsidios',
    href: '/subsidios',
    children: [
      { label: 'Déficit histórico', href: '/subsidios' },
      { label: 'Detalle de pagos', href: '/pagos' },
      { label: 'Tablero de validaciones', href: '/validaciones' },
    ],
  },
  { label: 'Colombia Solar', href: '/colombia-solar' },
];

export default function Header() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const { resolvedTheme, mounted } = useTheme();
  
  // Logo según tema: blanco para oscuro, negro para claro
  const logoSrc = mounted && resolvedTheme === 'light' 
    ? '/images/logos/logo-energia-negro.svg' 
    : '/images/logos/logo-energia-blanco.svg';

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', handleScroll);
    
    const updateTime = () => {
      setCurrentTime(new Date().toLocaleTimeString('es-CO', { 
        hour: '2-digit', 
        minute: '2-digit',
        hour12: true 
      }));
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
      clearInterval(interval);
    };
  }, []);

  return (
    <motion.header
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-theme-secondary border-b border-gold-20' 
          : 'bg-gradient-to-b from-[var(--bg-primary)] to-transparent'
      }`}

    >
      <div className="max-w-[1920px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-4 group">
            <motion.div 
              className="relative w-14 h-14"
              whileHover={{ scale: 1.05 }}
              transition={{ type: 'spring', stiffness: 400 }}
            >
              <div className="absolute inset-0 bg-gold/20 rounded-full blur-xl group-hover:bg-gold/40 transition-all duration-500" />
              {/* Logo SVG adaptativo: blanco en oscuro, negro en claro */}
              <img
                src={logoSrc}
                alt="MinMinas"
                className="relative z-10 w-full h-full p-1 object-contain drop-shadow-lg transition-opacity duration-300"
              />
            </motion.div>
            <div className="hidden sm:block">
              <h1 className="text-theme-primary font-bold text-xl tracking-tight">
                Portal de Dirección
              </h1>
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-gradient-gold">
                  MinMinas
                </span>
                <span className="text-[10px] text-theme-muted">|</span>
                <span className="text-[10px] text-theme-secondary font-mono">{currentTime}</span>
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden xl:flex items-center gap-1 bg-theme-hover backdrop-blur-sm rounded-full px-2 py-1 border border-theme-primary">
            {navItems.map((item, index) => (
              <motion.div
                key={item.href}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="relative"
                onMouseEnter={() => item.children && setOpenDropdown(item.label)}
                onMouseLeave={() => setOpenDropdown(null)}
              >
                {item.children ? (
                  <>
                    <button
                      className="relative px-4 py-2 text-sm font-medium text-theme-secondary hover:text-theme-primary transition-all duration-300 rounded-full hover:bg-theme-hover group flex items-center gap-1"
                    >
                      {item.label}
                      <svg className={`w-3 h-3 transition-transform duration-200 ${openDropdown === item.label ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                      </svg>
                      <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-gold to-gold-light rounded-full group-hover:w-1/2 transition-all duration-300" />
                    </button>
                    <AnimatePresence>
                      {openDropdown === item.label && (
                        <motion.div
                          initial={{ opacity: 0, y: 4 }}
                          animate={{ opacity: 1, y: 0 }}
                          exit={{ opacity: 0, y: 4 }}
                          transition={{ duration: 0.15 }}
                          className="absolute top-full left-0 mt-1 py-1.5 bg-theme-secondary border border-theme-card rounded-xl shadow-xl min-w-[180px] z-50"
                        >
                          {item.children.map((child) => (
                            child.href.startsWith('http') ? (
                              <a
                                key={child.href}
                                href={child.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="block px-4 py-2 text-sm text-theme-secondary hover:text-gold hover:bg-theme-hover transition-all duration-200"
                              >
                                {child.label}
                                <svg className="inline-block w-3 h-3 ml-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                </svg>
                              </a>
                            ) : (
                              <Link
                                key={child.href}
                                href={child.href}
                                className="block px-4 py-2 text-sm text-theme-secondary hover:text-gold hover:bg-theme-hover transition-all duration-200"
                              >
                                {child.label}
                              </Link>
                            )
                          ))}
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </>
                ) : (
                  <Link
                    href={item.href}
                    className="relative px-4 py-2 text-sm font-medium text-theme-secondary hover:text-theme-primary transition-all duration-300 rounded-full hover:bg-theme-hover group block"
                  >
                    {item.label}
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-gold to-gold-light rounded-full group-hover:w-1/2 transition-all duration-300" />
                  </Link>
                )}
              </motion.div>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-3">
            {/* Status indicator */}
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 bg-success-10 rounded-full border border-success-20">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-success"></span>
              </span>
              <span className="text-xs text-success font-medium">En línea</span>
            </div>

            {/* Theme Toggle */}
            <ThemeToggle />

            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="relative p-2.5 text-theme-muted hover:text-gold transition-all duration-300 rounded-full hover:bg-theme-hover"
            >
              <BellIcon className="w-5 h-5" />
              <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-danger rounded-full animate-pulse" />
            </motion.button>
            
            <motion.button 
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-2.5 text-theme-muted hover:text-gold transition-all duration-300 rounded-full hover:bg-theme-hover hidden sm:block"
            >
              <UserCircleIcon className="w-5 h-5" />
            </motion.button>
            
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="xl:hidden p-2.5 text-theme-muted hover:text-theme-primary rounded-full hover:bg-theme-hover"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              <AnimatePresence mode="wait">
                {mobileMenuOpen ? (
                  <motion.div
                    key="close"
                    initial={{ rotate: -90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: 90, opacity: 0 }}
                  >
                    <XMarkIcon className="w-6 h-6" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="menu"
                    initial={{ rotate: 90, opacity: 0 }}
                    animate={{ rotate: 0, opacity: 1 }}
                    exit={{ rotate: -90, opacity: 0 }}
                  >
                    <Bars3Icon className="w-6 h-6" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.button>
          </div>
        </div>
      </div>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="xl:hidden overflow-hidden glass border-t border-gold-20"
          >
            <nav className="px-4 py-4 space-y-1">
              {navItems.map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {item.children ? (
                    <div className="space-y-1">
                      <button
                        className="flex items-center justify-between w-full gap-3 px-4 py-3 text-theme-secondary hover:text-gold hover:bg-theme-hover rounded-xl transition-all duration-300"
                        onClick={() => setMobileExpanded(mobileExpanded === item.label ? null : item.label)}
                      >
                        <div className="flex items-center gap-3">
                          <span className="w-1.5 h-1.5 rounded-full bg-gold/50" />
                          {item.label}
                        </div>
                        <svg className={`w-4 h-4 transition-transform duration-200 ${mobileExpanded === item.label ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <AnimatePresence>
                        {mobileExpanded === item.label && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2 }}
                            className="overflow-hidden ml-6"
                          >
                            {item.children.map((child) => (
                              child.href.startsWith('http') ? (
                                <a
                                  key={child.href}
                                  href={child.href}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="block px-4 py-2.5 text-sm text-theme-muted hover:text-gold hover:bg-theme-hover rounded-xl transition-all duration-200"
                                  onClick={() => setMobileMenuOpen(false)}
                                >
                                  {child.label}
                                  <svg className="inline-block w-3 h-3 ml-1 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                  </svg>
                                </a>
                              ) : (
                                <Link
                                  key={child.href}
                                  href={child.href}
                                  className="block px-4 py-2.5 text-sm text-theme-muted hover:text-gold hover:bg-theme-hover rounded-xl transition-all duration-200"
                                  onClick={() => setMobileMenuOpen(false)}
                                >
                                  {child.label}
                                </Link>
                              )
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>
                  ) : (
                    <Link
                      href={item.href}
                      className="flex items-center gap-3 px-4 py-3 text-theme-secondary hover:text-gold hover:bg-theme-hover rounded-xl transition-all duration-300"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <span className="w-1.5 h-1.5 rounded-full bg-gold/50" />
                      {item.label}
                    </Link>
                  )}
                </motion.div>
              ))}
            </nav>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.header>
  );
}
