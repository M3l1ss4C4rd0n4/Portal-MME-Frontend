import { backendPost, BackendError } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

/**
 * Proxy hacia POST /v1/voz/token (Fase 20) — genera el token efímero que el
 * navegador usa para abrir el WebSocket de voz directo contra el backend
 * (wss://<dominio>/v1/voz/ws?token=...). El WebSocket en sí NO pasa por este
 * BFF (Next.js no sostiene una conexión bidireccional persistente de forma
 * nativa) — nginx expone esa ruta puntual directo al backend, ver Fase 19.
 */
export async function POST() {
  try {
    const data = await backendPost("/v1/voz/token");
    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 502;
    const detalle = error instanceof Error ? error.message : String(error);
    return new Response(
      JSON.stringify({ error: "No se pudo iniciar la sesión de voz", detalle }),
      { status, headers: { "Content-Type": "application/json" } }
    );
  }
}
