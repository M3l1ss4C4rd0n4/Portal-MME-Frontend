"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { HIDROCARBUROS_VISIBLE } from "@/lib/featureFlags";

interface NewsItem {
  titulo?: string;
  title?: string;
  resumen?: string;
  fuente?: string;
  url?: string;
  imagen?: string;
  image?: string;
  fecha?: string;
}

export const SLIDE_INTERVAL_MS = 50000; // 50 segundos por slide

export interface UseHomeSliderReturn {
  current: number;
  direction: number;
  news: NewsItem[];
  hydroNews: NewsItem[];
  fetchedAt: string | null;
  paused: boolean;
  totalSlides: number;
  goTo: (idx: number, dir: number) => void;
  next: () => void;
  prev: () => void;
  handlePrev: () => void;
  handleNext: () => void;
  setPaused: (paused: boolean) => void;
}

function formatFetchedAt(iso: string): string {
  const d = new Date(iso);
  const pad = (n: number) => n.toString().padStart(2, "0");
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()}, ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function useHomeSlider(extraSlidesCount: number = 0): UseHomeSliderReturn {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [hydroNews, setHydroNews] = useState<NewsItem[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch news — refresca 3 veces al día (cada 8 h) para coincidir con
  // los ciclos de noticias de mañana / tarde / noche.
  //
  // Con reintentos: el orquestador tarda hasta 20 s y alguna vez se pasa. Sin
  // reintento, UNA caída puntual dejaba el slider sin noticias las 8 horas
  // siguientes, porque la única otra oportunidad era el intervalo. Ocurrió el
  // 2026-10-30 y desde el portal no se veía ninguna diferencia con "hoy no hay
  // noticias".
  useEffect(() => {
    let vigente = true;
    const reintentos: ReturnType<typeof setTimeout>[] = [];

    /** Espera creciente entre intentos: 5 s, 20 s, 60 s. */
    const ESPERAS_MS = [5_000, 20_000, 60_000];

    const pedir = async (ruta: string): Promise<NewsItem[] | null> => {
      // Con barra final: `trailingSlash: true` hace que la ruta sin barra
      // devuelva 308 y gaste un viaje de más en cada carga.
      const res = await fetch(`${ruta}/`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      if (!Array.isArray(data.noticias) || data.noticias.length === 0) {
        if (data.motivo) console.error(`[slider] ${ruta} sin noticias: ${data.motivo}`);
        return null;
      }
      if (data.fetchedAt) setFetchedAt(formatFetchedAt(data.fetchedAt));
      return data.noticias.slice(0, 3) as NewsItem[];
    };

    const pedirConReintentos = (
      ruta: string,
      aplicar: (n: NewsItem[]) => void,
      intento = 0
    ): void => {
      pedir(ruta)
        .then((noticias) => {
          if (!vigente) return;
          if (noticias) {
            aplicar(noticias);
            return;
          }
          if (intento < ESPERAS_MS.length) {
            reintentos.push(
              setTimeout(
                () => pedirConReintentos(ruta, aplicar, intento + 1),
                ESPERAS_MS[intento]
              )
            );
          }
        })
        .catch((e: unknown) => {
          if (!vigente) return;
          console.error(`[slider] ${ruta} falló: ${e instanceof Error ? e.message : e}`);
          if (intento < ESPERAS_MS.length) {
            reintentos.push(
              setTimeout(
                () => pedirConReintentos(ruta, aplicar, intento + 1),
                ESPERAS_MS[intento]
              )
            );
          }
        });
    };

    const fetchNews = () => {
      pedirConReintentos("/api/noticias", setNews);

      // Noticias de hidrocarburos (paralelo). Con la sección oculta, hydroNews
      // se queda vacío: no suma slides ni puntos, y se evita la petición.
      if (!HIDROCARBUROS_VISIBLE) return;
      pedirConReintentos("/api/noticias/hidrocarburos", setHydroNews);
    };

    fetchNews();
    const timer = setInterval(fetchNews, 8 * 60 * 60 * 1000); // 8 h
    return () => {
      vigente = false;
      clearInterval(timer);
      reintentos.forEach(clearTimeout);
    };
  }, []);

  // Total slides: 8 KPI + news + hydrocarbon news + extra sections
  const totalSlides = 8 + news.length + hydroNews.length + extraSlidesCount;

  const goTo = useCallback(
    (idx: number, dir: number) => {
      setDirection(dir);
      setCurrent(((idx % totalSlides) + totalSlides) % totalSlides);
    },
    [totalSlides]
  );

  const next = useCallback(() => {
    setDirection(1);
    setCurrent((c) => (c + 1) % totalSlides);
  }, [totalSlides]);

  const prev = useCallback(() => {
    setDirection(-1);
    setCurrent((c) => (c - 1 + totalSlides) % totalSlides);
  }, [totalSlides]);

  // Autoplay
  useEffect(() => {
    if (paused) return;
    timerRef.current = setInterval(next, SLIDE_INTERVAL_MS);
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [next, paused, totalSlides]);

  // Reset timer on manual nav
  const handlePrev = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    prev();
    if (!paused) {
      timerRef.current = setInterval(next, SLIDE_INTERVAL_MS);
    }
  }, [prev, next, paused]);

  const handleNext = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    next();
    if (!paused) {
      timerRef.current = setInterval(next, SLIDE_INTERVAL_MS);
    }
  }, [next, paused]);

  return {
    current,
    direction,
    news,
    hydroNews,
    fetchedAt,
    paused,
    totalSlides,
    goTo,
    next,
    prev,
    handlePrev,
    handleNext,
    setPaused,
  };
}
