"use client";

import { useState, useEffect, useCallback, useRef } from "react";

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

const SLIDE_INTERVAL_MS = 90000; // 1.5 minutos (90 segundos) por slide

export interface UseHomeSliderReturn {
  current: number;
  direction: number;
  news: NewsItem[];
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

export function useHomeSlider(newsSlideCount: number = 0): UseHomeSliderReturn {
  const [current, setCurrent] = useState(0);
  const [direction, setDirection] = useState(1);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch news — refresca 3 veces al día (cada 8 h) para coincidir con
  // los ciclos de noticias de mañana / tarde / noche
  useEffect(() => {
    const fetchNews = () =>
      fetch("/api/noticias")
        .then((r) => r.json())
        .then((data) => {
          if (Array.isArray(data.noticias) && data.noticias.length > 0)
            setNews(data.noticias.slice(0, 3));
          if (data.fetchedAt) setFetchedAt(formatFetchedAt(data.fetchedAt));
        })
        .catch(() => undefined);

    fetchNews();
    const timer = setInterval(fetchNews, 8 * 60 * 60 * 1000); // 8 h
    return () => clearInterval(timer);
  }, []);

  // Total slides: 6 KPI + news
  const totalSlides = 6 + news.length;

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
