"use client";

import type { NewsItem } from "@/types/home-slider";
import { TopAccent } from "./SlideUI";

export function SlideNoticia({
  news,
  index,
  total,
}: {
  news: NewsItem;
  index: number;
  total: number;
}) {
  const title = news.titulo ?? news.title ?? "Noticia del sector energético";
  const imageUrl = news.imagen ?? news.image ?? null;

  return (
    <div className="relative w-full h-full flex items-center bg-theme-primary overflow-hidden">
      <TopAccent color="#94A3B8" />
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900/40 via-transparent to-slate-800/20 pointer-events-none" />

      {/* Imagen de fondo si existe */}
      {imageUrl && (
        <>
          <div
            className="absolute inset-0 bg-center bg-cover opacity-15"
            style={{ backgroundImage: `url(${imageUrl})` }}
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[var(--bg-primary)] via-[var(--bg-primary)]/90 to-[var(--bg-primary)]/60" />
        </>
      )}

      <div className="relative z-10 w-full flex items-center px-12 xl:px-20 gap-12 xl:gap-20">
        {/* Contenido texto */}
        <div className="flex-1 min-w-0 max-w-4xl">
          {/* Badge de noticia */}
          <div className="flex items-center gap-3 mb-6 xl:mb-8">
            <span className="inline-flex items-center gap-2 px-4 py-1.5 bg-theme-secondary border border-theme-primary rounded-full text-theme-muted text-sm xl:text-base font-semibold tracking-widest uppercase">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
              </svg>
              Noticia {index + 1} de {total}
            </span>
            {news.fuente && (
              <span className="text-slate-500 text-sm xl:text-base">{news.fuente}</span>
            )}
            {news.fecha && (
              <span className="text-slate-600 text-sm xl:text-base">{news.fecha}</span>
            )}
          </div>

          {/* Título */}
          <h2 className="text-3xl xl:text-4xl 2xl:text-5xl font-bold text-theme-primary leading-tight mb-6 xl:mb-8">
            {title}
          </h2>

          {/* Resumen */}
          {news.resumen && (
            <p className="text-slate-400 text-xl xl:text-2xl leading-relaxed line-clamp-4 mb-8 xl:mb-10">
              {news.resumen}
            </p>
          )}

          {/* Link */}
          {news.url && (
            <a
              href={news.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-3 px-6 py-3 bg-amber-500/10 border border-amber-500/30 rounded-full text-gold hover:bg-amber-500/20 hover:border-amber-500/60 transition-all text-lg xl:text-xl font-semibold"
            >
              Leer noticia completa
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
            </a>
          )}
        </div>

        {/* Imagen lateral si existe */}
        {imageUrl && (
          <div className="hidden xl:block flex-shrink-0 w-80 2xl:w-96 h-64 2xl:h-80 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={imageUrl}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
        )}

        {/* Placeholder si no hay imagen */}
        {!imageUrl && (
          <div className="hidden xl:flex flex-shrink-0 w-72 2xl:w-80 h-64 rounded-2xl border border-theme-primary bg-theme-secondary/50 items-center justify-center">
            <svg className="w-24 h-24 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 20H5a2 2 0 01-2-2V6a2 2 0 012-2h10a2 2 0 012 2v1m2 13a2 2 0 01-2-2V7m2 13a2 2 0 002-2V9a2 2 0 00-2-2h-2m-4-3H9M7 16h6M7 8h6v4H7V8z" />
            </svg>
          </div>
        )}
      </div>
    </div>
  );
}
