import { NextRequest } from "next/server";

export const dynamic = "force-dynamic";

const BACKEND_URL = process.env.BACKEND_API_URL ?? "http://localhost:8000";
const BACKEND_KEY = process.env.BACKEND_API_KEY ?? "";

/**
 * Proxy de streaming hacia POST /v1/chatbot/asistente — a diferencia del resto
 * de rutas de /api (backendGet, JSON completo), aquí se reenvía el body de la
 * respuesta del backend tal cual (SSE) en vez de esperar el JSON completo, para
 * que el frontend pueda mostrar el texto apareciendo palabra por palabra.
 */
export async function POST(request: NextRequest) {
  const body = await request.text();

  const backendResponse = await fetch(`${BACKEND_URL}/v1/chatbot/asistente`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": BACKEND_KEY,
    },
    body,
  });

  if (!backendResponse.ok || !backendResponse.body) {
    // El texto de error interno del backend se registra en el servidor y no se devuelve al navegador.
    const detalle = await backendResponse.text().catch(() => "");
    console.error("[api/asistente] Error del backend:", backendResponse.status, detalle);
    return new Response(
      JSON.stringify({ error: "Error del backend al generar la respuesta" }),
      { status: backendResponse.status || 502, headers: { "Content-Type": "application/json" } }
    );
  }

  return new Response(backendResponse.body, {
    status: 200,
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
