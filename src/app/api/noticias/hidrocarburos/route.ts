import { NextResponse } from "next/server";
import { HYDRO_KEYWORDS, countKeywordHits } from "@/lib/news-keywords";

export const dynamic = "force-dynamic";

async function fetchOgImage(url: string): Promise<string> {
  if (!url || url.includes("news.google.com")) return "";
  try {
    const res = await fetch(url, {
      signal: AbortSignal.timeout(6_000),
      headers: {
        "User-Agent":
          "Mozilla/5.0 (compatible; PortalMMEBot/1.0; +https://portaldireccionee.minenergia.gov.co)",
        Accept: "text/html",
      },
    });
    if (!res.ok) return "";
    const reader = res.body?.getReader();
    if (!reader) return "";
    let html = "";
    let bytesRead = 0;
    while (bytesRead < 20_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      bytesRead += value.length;
      if (html.includes("</head>")) break;
    }
    reader.cancel().catch(() => {});
    const ogMatch =
      html.match(
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i
      ) ??
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i
      ) ??
      html.match(
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i
      ) ??
      html.match(
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i
      );
    return ogMatch?.[1] ?? "";
  } catch {
    return "";
  }
}

/**
 * GET /api/noticias/hidrocarburos
 * Obtiene noticias del sector energético y filtra aquellas
 * relacionadas con hidrocarburos (petróleo, gas, combustibles, etc.).
 */
export async function GET() {
  try {
    const apiUrl = process.env.CHATBOT_API_URL;
    const apiKey = process.env.CHATBOT_API_KEY;

    if (!apiUrl || !apiKey) {
      return NextResponse.json({ noticias: [] });
    }

    const res = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        sessionId: `slider_hidrocarburos_${Date.now()}`,
        intent: "noticias_hidrocarburos",
        parameters: {},
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) return NextResponse.json({ noticias: [] });

    const data = await res.json();
    const topList =
      data?.data?.noticias ?? data?.noticias ?? data?.news ?? [];
    const extraList =
      data?.data?.otras_noticias ?? data?.otras_noticias ?? [];

    const pool = [
      ...(Array.isArray(topList) ? topList : []),
      ...(Array.isArray(extraList) ? extraList : []),
    ];

    // Filtrar estrictamente por keywords de hidrocarburos
    const hydroNews = pool.filter((n: Record<string, string>) => {
      const text = `${n.titulo ?? n.title ?? ""} ${n.resumen ?? n.description ?? ""}`;
      return countKeywordHits(text, HYDRO_KEYWORDS) >= 1;
    });

    // Tomar hasta 3 (SÓLO las que coincidan, sin fallback)
    const selected = hydroNews.slice(0, 3);

    // Enriquecer con imágenes OG en paralelo
    const noticias = await Promise.all(
      selected.map(async (n: Record<string, string>) => {
        const existing = n.imagen ?? n.image ?? "";
        let imagen = existing;
        if (!imagen) {
          imagen = await fetchOgImage(n.url ?? "");
        }
        if (!imagen && n.source_url) {
          imagen = await fetchOgImage(n.source_url);
        }
        return { ...n, imagen };
      })
    );

    return NextResponse.json({ noticias, fetchedAt: new Date().toISOString() });
  } catch {
    return NextResponse.json({ noticias: [], fetchedAt: null });
  }
}
