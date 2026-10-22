'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useRef } from 'react';
import { Bars3Icon, XMarkIcon, BellIcon, UserCircleIcon, SparklesIcon } from '@heroicons/react/24/outline';
import Image from 'next/image';
import { motion, AnimatePresence } from 'framer-motion';
import ThemeToggle from './ui/ThemeToggle';
import { useTheme } from '@/providers/ThemeProvider';
import { HIDROCARBUROS_VISIBLE } from '@/lib/featureFlags';

interface NavGrandchild {
  label: string;
  href: string;
}

interface NavChild {
  label: string;
  href: string;
  children?: NavGrandchild[];
}

interface NavItem {
  label: string;
  href: string;
  children?: NavChild[];
  highlight?: boolean;
  /** Solo se muestra si HIDROCARBUROS_VISIBLE está activo. */
  requiresHidrocarburos?: boolean;
}

const navItems: NavItem[] = [
  { label: 'Inicio', href: '/' },
  {
    label: 'Sector energetico',
    href: '/energia',
    children: [
      { label: 'Gestión del sector', href: '/energia' },
      { label: 'Balance Oferta-Demanda', href: '/balance-oferta-demanda' },
      { label: 'Predicciones SIN', href: '/energia/predicciones' },
      { label: 'Informes energéticos', href: '/energia/informes' },
      { label: 'Portal Energético', href: 'https://portalenergetico.minenergia.gov.co/' },
    ],
  },
  {
    label: 'Dirección energía',
    href: '/presupuesto',
    children: [
      { label: 'Presupuesto', href: '/presupuesto' },
      { label: 'Supervisión', href: '/supervision' },
      {
        label: 'Subsidios',
        href: '/subsidios',
        children: [
          { label: 'Déficit histórico', href: '/subsidios' },
          { label: 'Detalle de pagos', href: '/pagos' },
          { label: 'Tablero de validaciones', href: '/validaciones' },
          { label: 'Detalle Empresas', href: '/detalle-empresas' },
        ],
      },
    ],
  },
  {
    label: 'Comunidades Energéticas',
    href: '/colombia-solar',
    children: [
      { label: 'Resumen', href: '/colombia-solar' },
      { label: 'CE_Implementadas', href: '/comunidades' },
      { label: 'CE_Contratos OR', href: '/contratos-or' },
      { label: 'CE_Fenoge 1.0, 1.1', href: '/fenoge' },
    ],
  },
  {
    label: 'Dirección de Hidrocarburos',
    href: '/hidrocarburos/presupuesto',
    // Oculto mientras HIDROCARBUROS_VISIBLE sea false (ver src/lib/featureFlags.ts).
    requiresHidrocarburos: true,
    children: [
      { label: 'Presupuesto', href: '/hidrocarburos/presupuesto' },
      { label: 'Exploración', href: '/hidrocarburos/exploracion' },
      { label: 'Agentes SICOM', href: '/hidrocarburos/agentes' },
      { label: 'Compras', href: '/hidrocarburos/compras' },
      { label: 'Compras EDS', href: '/hidrocarburos/compras-eds' },
      { label: 'Capacidad', href: '/hidrocarburos/capacidad' },
    ],
  },
  { label: 'Asistente IA', href: '/asistente', highlight: true },
];

// Lo que realmente se pinta: igual a navItems salvo las secciones apagadas por
// bandera. No se borra nada de navItems, solo se filtra.
const visibleNavItems: NavItem[] = navItems.filter(
  (item) => !item.requiresHidrocarburos || HIDROCARBUROS_VISIBLE
);

export default function Header() {
  const headerRef = useRef<HTMLElement>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const [currentTime, setCurrentTime] = useState('');
  const [openDropdown, setOpenDropdown] = useState<string | null>(null);
  const [openSubDropdown, setOpenSubDropdown] = useState<string | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState<string | null>(null);
  const [mobileSubExpanded, setMobileSubExpanded] = useState<string | null>(null);
  const { resolvedTheme, mounted } = useTheme();
  const rawPathname = usePathname();
  // next.config.ts usa trailingSlash: true, así que el pathname del request (SSR)
  // puede llegar como "/subsidios/" mientras navItems usa hrefs sin slash final.
  const pathname = rawPathname.length > 1 && rawPathname.endsWith('/') ? rawPathname.slice(0, -1) : rawPathname;

  function childMatches(child: NavChild): boolean {
    return child.href === pathname || (child.children?.some((gc) => gc.href === pathname) ?? false);
  }
  function itemIsActive(item: NavItem): boolean {
    return item.href === pathname || (item.children?.some(childMatches) ?? false);
  }

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

  // Publica la altura REAL del header (fixed) como variable CSS en vez de que
  // cada consumidor (HomeSlider, páginas de dashboard) asuma un valor fijo
  // (5rem). ResizeObserver capta cualquier causa de cambio de altura: el menú
  // móvil al abrirse, el nav envolviéndose en anchos intermedios, texto que
  // crece por zoom/accesibilidad, etc. — así ningún cambio futuro del header
  // puede volver a tapar el contenido de abajo.
  useEffect(() => {
    const el = headerRef.current;
    if (!el) return;
    const setVar = () => {
      document.documentElement.style.setProperty('--header-height', `${el.offsetHeight}px`);
    };
    setVar();
    const observer = new ResizeObserver(setVar);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <motion.header
      ref={headerRef}
      initial={{ y: -100, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
      className={`fixed top-0 left-0 right-0 z-50 transition-all duration-500 ${
        scrolled 
          ? 'bg-theme-secondary border-b border-gold-20' 
          : 'bg-gradient-to-b from-[var(--bg-primary)] to-transparent'
      }`}

    >
      <div className="max-w-[1920px] mx-auto px-3 min-[1760px]:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-2 min-[1760px]:gap-4 min-h-16 min-[1760px]:min-h-20 py-2.5 min-[1760px]:py-3">
          {/* Logo */}
          <Link href="/" className="flex items-center gap-2.5 min-[1760px]:gap-4 group shrink-0">
            <motion.div
              className="relative w-10 h-10 min-[1760px]:w-14 min-[1760px]:h-14 shrink-0"
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
            <div className="hidden sm:block min-w-0">
              <h1 className="text-theme-primary font-bold text-sm min-[1760px]:text-xl tracking-tight whitespace-nowrap">
                Portal Dirección de Energía
              </h1>
              <div className="hidden min-[1760px]:flex items-center gap-2">
                <span className="text-xs font-medium text-gradient-gold">
                  MinMinas
                </span>
                <span className="text-[10px] text-theme-muted">|</span>
                <span className="text-[10px] text-theme-secondary font-mono">{currentTime}</span>
              </div>
            </div>
          </Link>

          {/* Desktop nav */}
          <nav className="hidden min-[1280px]:flex flex-wrap min-w-0 items-center justify-center gap-0.5 min-[1760px]:gap-1.5 bg-theme-hover backdrop-blur-sm rounded-2xl px-1.5 min-[1760px]:px-3 py-1 min-[1760px]:py-1.5 border border-theme-primary">
            {visibleNavItems.map((item, index) => (
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
                      className={`relative px-1.5 min-[1760px]:px-3 py-1.5 min-[1760px]:py-2 text-xs min-[1760px]:text-sm font-medium transition-all duration-300 rounded-full hover:bg-theme-hover group flex items-center gap-0.5 min-[1760px]:gap-1 whitespace-nowrap ${
                        itemIsActive(item) ? 'text-gold bg-gold/10' : 'text-theme-secondary hover:text-theme-primary'
                      }`}
                    >
                      {item.label}
                      <svg className={`w-2.5 h-2.5 min-[1760px]:w-3 min-[1760px]:h-3 shrink-0 transition-transform duration-200 ${openDropdown === item.label ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
                            child.children ? (
                              <div
                                key={child.href}
                                className="relative"
                                onMouseEnter={() => setOpenSubDropdown(child.label)}
                                onMouseLeave={() => setOpenSubDropdown(null)}
                              >
                                <button className={`w-full flex items-center justify-between gap-3 px-4 py-2 text-sm hover:text-gold hover:bg-theme-hover transition-all duration-200 ${childMatches(child) ? 'text-gold' : 'text-theme-secondary'}`}>
                                  {child.label}
                                  <svg className="w-3 h-3 -rotate-90" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                  </svg>
                                </button>
                                <AnimatePresence>
                                  {openSubDropdown === child.label && (
                                    <motion.div
                                      initial={{ opacity: 0, x: 4 }}
                                      animate={{ opacity: 1, x: 0 }}
                                      exit={{ opacity: 0, x: 4 }}
                                      transition={{ duration: 0.15 }}
                                      className="absolute top-0 left-full ml-1 py-1.5 bg-theme-secondary border border-theme-card rounded-xl shadow-xl min-w-[200px] z-50"
                                    >
                                      {child.children.map((grandchild) => (
                                        <Link
                                          key={grandchild.href}
                                          href={grandchild.href}
                                          className={`block px-4 py-2 text-sm hover:text-gold hover:bg-theme-hover transition-all duration-200 ${grandchild.href === pathname ? 'text-gold' : 'text-theme-secondary'}`}
                                        >
                                          {grandchild.label}
                                        </Link>
                                      ))}
                                    </motion.div>
                                  )}
                                </AnimatePresence>
                              </div>
                            ) : child.href.startsWith('http') ? (
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
                                className={`block px-4 py-2 text-sm hover:text-gold hover:bg-theme-hover transition-all duration-200 ${child.href === pathname ? 'text-gold' : 'text-theme-secondary'}`}
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
                    className={`relative px-1.5 min-[1760px]:px-3 py-1.5 min-[1760px]:py-2 text-xs min-[1760px]:text-sm font-medium transition-all duration-300 rounded-full group flex items-center gap-1 min-[1760px]:gap-1.5 whitespace-nowrap ${
                      item.highlight
                        ? item.href === pathname
                          ? 'bg-gradient-to-r from-amber-500/20 to-amber-400/20 text-amber-400 border border-amber-500/50'
                          : 'bg-gradient-to-r from-amber-500/10 to-amber-400/10 text-amber-400 border border-amber-500/30 hover:bg-amber-500/20'
                        : item.href === pathname
                          ? 'text-gold bg-gold/10 hover:bg-theme-hover'
                          : 'text-theme-secondary hover:text-theme-primary hover:bg-theme-hover'
                    }`}
                  >
                    {item.highlight && <SparklesIcon className="w-3.5 h-3.5" />}
                    {item.label}
                    <span className="absolute bottom-1 left-1/2 -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-gold to-gold-light rounded-full group-hover:w-1/2 transition-all duration-300" />
                  </Link>
                )}
              </motion.div>
            ))}
          </nav>

          {/* Actions */}
          <div className="flex items-center gap-1.5 min-[1760px]:gap-3 shrink-0">
            {/* Status indicator */}
            <div className="hidden min-[1760px]:flex items-center gap-2 px-3 py-1.5 bg-success-10 rounded-full border border-success-20">
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
              className="relative p-1.5 min-[1760px]:p-2.5 text-theme-muted hover:text-gold transition-all duration-300 rounded-full hover:bg-theme-hover"
            >
              <BellIcon className="w-4 h-4 min-[1760px]:w-5 min-[1760px]:h-5" />
              <span className="absolute top-1 right-1 min-[1760px]:top-1.5 min-[1760px]:right-1.5 w-2 h-2 bg-danger rounded-full animate-pulse" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              className="p-1.5 min-[1760px]:p-2.5 text-theme-muted hover:text-gold transition-all duration-300 rounded-full hover:bg-theme-hover hidden sm:block"
            >
              <UserCircleIcon className="w-4 h-4 min-[1760px]:w-5 min-[1760px]:h-5" />
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="min-[1280px]:hidden p-2 min-[1760px]:p-2.5 text-theme-muted hover:text-theme-primary rounded-full hover:bg-theme-hover"
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

      {/* Backdrop del menú móvil — el header es "fixed", así que sin esto el
          menú desplegado se ve "flotando" sobre el contenido en vez de leerse
          como una capa modal intencional. */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="min-[1280px]:hidden fixed inset-0 z-40 bg-black/60 backdrop-blur-[2px]"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
        )}
      </AnimatePresence>

      {/* Mobile menu */}
      <AnimatePresence>
        {mobileMenuOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
            className="min-[1280px]:hidden overflow-hidden glass border-t border-gold-20"
          >
            <nav className="px-4 py-4 space-y-1">
              {visibleNavItems.map((item, index) => (
                <motion.div
                  key={item.href}
                  initial={{ x: -20, opacity: 0 }}
                  animate={{ x: 0, opacity: 1 }}
                  transition={{ delay: index * 0.05 }}
                >
                  {item.children ? (
                    <div className="space-y-1">
                      <button
                        className={`flex items-center justify-between w-full gap-3 px-4 py-3 hover:text-gold hover:bg-theme-hover rounded-xl transition-all duration-300 ${
                          itemIsActive(item) ? 'text-gold' : 'text-theme-secondary'
                        }`}
                        onClick={() => setMobileExpanded(mobileExpanded === item.label ? null : item.label)}
                      >
                        <div className="flex items-center gap-3">
                          <span className={`w-1.5 h-1.5 rounded-full ${itemIsActive(item) ? 'bg-gold' : 'bg-gold/50'}`} />
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
                              child.children ? (
                                <div key={child.href}>
                                  <button
                                    className={`flex items-center justify-between w-full gap-3 px-4 py-2.5 text-sm hover:text-gold hover:bg-theme-hover rounded-xl transition-all duration-200 ${
                                      childMatches(child) ? 'text-gold' : 'text-theme-muted'
                                    }`}
                                    onClick={() => setMobileSubExpanded(mobileSubExpanded === child.label ? null : child.label)}
                                  >
                                    {child.label}
                                    <svg className={`w-3.5 h-3.5 transition-transform duration-200 ${mobileSubExpanded === child.label ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                                      <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </button>
                                  <AnimatePresence>
                                    {mobileSubExpanded === child.label && (
                                      <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden ml-4"
                                      >
                                        {child.children.map((grandchild) => (
                                          <Link
                                            key={grandchild.href}
                                            href={grandchild.href}
                                            className={`block px-4 py-2 text-sm hover:text-gold hover:bg-theme-hover rounded-xl transition-all duration-200 ${
                                              grandchild.href === pathname ? 'text-gold' : 'text-theme-muted/80'
                                            }`}
                                            onClick={() => setMobileMenuOpen(false)}
                                          >
                                            {grandchild.label}
                                          </Link>
                                        ))}
                                      </motion.div>
                                    )}
                                  </AnimatePresence>
                                </div>
                              ) : child.href.startsWith('http') ? (
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
                                  className={`block px-4 py-2.5 text-sm hover:text-gold hover:bg-theme-hover rounded-xl transition-all duration-200 ${
                                    child.href === pathname ? 'text-gold' : 'text-theme-muted'
                                  }`}
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
                      className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-300 ${
                        item.highlight
                          ? 'text-amber-400 bg-amber-500/10 border border-amber-500/30 hover:bg-amber-500/20'
                          : `hover:text-gold hover:bg-theme-hover ${item.href === pathname ? 'text-gold' : 'text-theme-secondary'}`
                      }`}
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      {item.highlight ? (
                        <SparklesIcon className="w-4 h-4" />
                      ) : (
                        <span className={`w-1.5 h-1.5 rounded-full ${item.href === pathname ? 'bg-gold' : 'bg-gold/50'}`} />
                      )}
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
