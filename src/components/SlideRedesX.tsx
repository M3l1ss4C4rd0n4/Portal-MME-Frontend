/**
 * ⚠️  COMPONENTE SUSPENDIDO TEMPORALMENTE  ⚠️
 *
 * Motivo de suspensión:
 * X (Twitter) bloquea los embeds oficiales de timeline con HTTP 429
 * (Too Many Requests). No existe tier gratuito de API para lectura.
 *
 * Para reactivar:
 * 1. Obtener presupuesto para API paga (TwitterAPI.io ~$10-20/mes,
 *    o X API Basic ~$100/mes)
 * 2. Descomentar los slides de redes en HomeSlider.tsx
 * 3. Cambiar useHomeSlider(0) → useHomeSlider(3)
 * 4. Este componente seguirá funcionando sin modificaciones
 *
 * Fecha de suspensión: 2026-05-16
 */
"use client";

import { useEffect, useRef } from "react";
import { TopAccent } from "@/components/slides/SlideUI";

export interface XAccount {
  handle: string;
  name: string;
  role: string;
}

export const ALL_X_ACCOUNTS: XAccount[] = [
  {
    handle: "SergioCabrales",
    name: "Sergio Cabrales",
    role: "Consultor Sector Minero-Energético",
  },
  {
    handle: "petrogustavo",
    name: "Gustavo Petro",
    role: "Presidente de Colombia",
  },
  {
    handle: "MinEnergiaCo",
    name: "MinEnergía",
    role: "Ministerio de Minas y Energía",
  },
  {
    handle: "BruceMacMaster",
    name: "Bruce Mac Master",
    role: "Desarrollo Social / ANDI",
  },
  {
    handle: "NGutierrezJ",
    name: "Natalia Gutierrez",
    role: "Presidenta ACOLGEN",
  },
  {
    handle: "Acolgen",
    name: "ACOLGEN",
    role: "Asociación Colombiana de Generadores",
  },
  {
    handle: "andrescamachon_",
    name: "Andrés Camacho M.",
    role: "Ex Ministro de Minas y Energía",
  },
  {
    handle: "Superservicios",
    name: "Superservicios",
    role: "Superintendencia de Servicios Públicos",
  },
  {
    handle: "UPMEOficial",
    name: "UPME",
    role: "Unidad de Planeación Minero Energética",
  },
];

function XLogo({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  );
}

/** Carga el widgets.js de X usando el loader oficial con twttr.ready() */
function loadXWidgets(): Promise<void> {
  return new Promise((resolve) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const w = window as any;

    if (w.twttr && w.twttr.widgets && w.twttr.widgets.load) {
      w.twttr.ready(() => {
        w.twttr.widgets.load();
        resolve();
      });
      return;
    }

    // Loader oficial de X (modificado para no re-crear si ya existe)
    if (!w.twttr) {
      w.twttr = {
        _e: [],
        ready: function (f: () => void) {
          w.twttr._e.push(f);
        },
      };
    }

    const d = document;
    const s = "script";
    const id = "twitter-wjs";
    let js: HTMLScriptElement | null = d.getElementById(id) as HTMLScriptElement;
    const fjs = d.getElementsByTagName(s)[0];

    if (!js) {
      js = d.createElement(s) as HTMLScriptElement;
      js.id = id;
      js.src = "https://platform.twitter.com/widgets.js";
      js.async = true;
      if (fjs && fjs.parentNode) {
        fjs.parentNode.insertBefore(js, fjs);
      } else {
        d.head.appendChild(js);
      }
    }

    w.twttr.ready(() => {
      w.twttr.widgets.load();
      resolve();
    });
  });
}

export default function SlideRedesX({ accounts }: { accounts: XAccount[] }) {
  const hasLoaded = useRef(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (hasLoaded.current) {
      // Re-procesar widgets si el componente se vuelve a montar
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const w = window as any;
      if (w.twttr && w.twttr.widgets && w.twttr.widgets.load) {
        w.twttr.ready(() => w.twttr.widgets.load(containerRef.current));
      }
      return;
    }
    hasLoaded.current = true;

    // Pequeño delay para asegurar que AnimatePresence terminó de montar el DOM
    const timer = setTimeout(() => {
      loadXWidgets().catch(() => {
        // Silenciar errores de carga de X (ad-blockers, offline, etc.)
      });
    }, 300);

    return () => clearTimeout(timer);
  }, []);

  return (
    <div className="relative w-full h-full flex flex-col bg-[#060B14] overflow-hidden">
      <TopAccent color="#1DA1F2" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-transparent to-slate-800/20 pointer-events-none" />

      <div className="relative z-10 flex flex-col h-full px-8 xl:px-16 py-6 xl:py-8">
        {/* Header */}
        <div className="flex items-center gap-3 mb-5 xl:mb-6">
          <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-sky-500/10 border border-sky-500/30 rounded-full text-sky-400 text-sm xl:text-base font-semibold tracking-widest uppercase">
            <XLogo className="w-4 h-4" />
            Redes Sociales
          </span>
          <span className="text-slate-500 text-sm xl:text-base">
            Sector Energético
          </span>
        </div>

        {/* Grid de 3 cuentas con más espacio */}
        <div
          ref={containerRef}
          className="grid grid-cols-1 md:grid-cols-3 gap-4 xl:gap-6 flex-1 min-h-0"
        >
          {accounts.map((account) => (
            <div
              key={account.handle}
              className="relative bg-slate-900/50 border border-white/5 rounded-xl overflow-hidden flex flex-col min-h-0"
            >
              {/* Barra de info de la cuenta */}
              <div className="px-4 py-2.5 border-b border-white/5 flex items-center gap-3 flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-sky-500/20 flex items-center justify-center flex-shrink-0">
                  <XLogo className="w-3.5 h-3.5 text-sky-400" />
                </div>
                <div className="min-w-0">
                  <p className="text-white text-sm font-semibold truncate leading-tight">
                    {account.name}
                  </p>
                  <p className="text-slate-500 text-xs truncate leading-tight">
                    @{account.handle} · {account.role}
                  </p>
                </div>
              </div>

              {/* Embed de X — más alto para que el tweet se vea completo */}
              <div className="flex-1 min-h-0 overflow-hidden flex items-start justify-center p-2">
                <a
                  className="twitter-timeline"
                  data-tweet-limit="1"
                  data-chrome="noheader nofooter noborders noscrollbar transparent"
                  data-theme="dark"
                  data-height="380"
                  href={`https://twitter.com/${account.handle}`}
                >
                  <div className="text-slate-500 text-sm text-center px-4 py-8">
                    <div className="inline-block w-5 h-5 border-2 border-slate-600 border-t-sky-500 rounded-full animate-spin mb-2" />
                    <p>Cargando último post de @{account.handle}...</p>
                    <p className="text-xs mt-1 text-slate-600">
                      Si no carga, puede deberse a un bloqueador de contenido
                    </p>
                  </div>
                </a>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
