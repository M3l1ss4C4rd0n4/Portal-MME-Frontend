import { NextResponse } from "next/server";

// Caché de 8 horas → 3 refrescos diarios (mañana / tarde / noche)
export const revalidate = 28800;

/**
 * Extrae la imagen Open Graph de una URL de artículo.
 * Devuelve string vacío si no se puede obtener.
 */
async function fetchOgImage(url: string): Promise<string> {
  if (!url) return "";
  // No intentar scrapear URLs de Google News (no resuelven a artículos reales)
  if (url.includes("news.google.com")) return "";
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

    // Leer solo los primeros 20KB para extraer el <head>
    const reader = res.body?.getReader();
    if (!reader) return "";
    let html = "";
    let bytesRead = 0;
    while (bytesRead < 20_000) {
      const { done, value } = await reader.read();
      if (done) break;
      html += new TextDecoder().decode(value);
      bytesRead += value.length;
      // Parar cuando ya pasamos el </head>
      if (html.includes("</head>")) break;
    }
    reader.cancel().catch(() => {});

    // Buscar og:image o twitter:image
    const ogMatch =
      html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i) ??
      html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i) ??
      html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);

    return ogMatch?.[1] ?? "";
  } catch {
    return "";
  }
}

/**
 * GET /api/noticias
 * Obtiene las noticias más recientes del sector energético
 * desde el orquestador de IA a través del intent noticias_sector.
 * Enriquece cada noticia con la imagen Open Graph del artículo.
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
        sessionId: `slider_noticias_${Date.now()}`,
        intent: "noticias_sector",
        parameters: {},
      }),
      signal: AbortSignal.timeout(15_000),
    });

    if (!res.ok) {
      return NextResponse.json({ noticias: [] });
    }

    const data = await res.json();

    // El orquestador puede devolver la lista en data.data.noticias, data.noticias o data.news
    const rawList =
      data?.data?.noticias ??
      data?.noticias ??
      data?.news ??
      [];

    const base = (Array.isArray(rawList) ? rawList : []).slice(0, 3);

    // Enriquecer con imagen OG en paralelo; si ya viene imagen del orquestador la usamos
    const noticias = await Promise.all(
      base.map(async (n: Record<string, string>) => {
        const existing = n.imagen ?? n.image ?? "";
        let imagen = existing;
        if (!imagen) {
          // 1. Intentar artículo directo (solo si no es URL de Google News)
          imagen = await fetchOgImage(n.url ?? "");
        }
        if (!imagen && n.source_url) {
          // 2. Fallback: OG image de la homepage del publisher
          imagen = await fetchOgImage(n.source_url);
        }
        return { ...n, imagen };
      })
    );

    return NextResponse.json({ noticias });
  } catch {
    // No propagamos el error; simplemente devolvemos vacío
    return NextResponse.json({ noticias: [] });
  }
}
