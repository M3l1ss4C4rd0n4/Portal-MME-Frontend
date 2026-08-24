import { NextRequest, NextResponse } from "next/server";
import { backendPost, BackendError } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

/**
 * Proxy hacia POST /v1/chatbot/asistente/feedback — registra si una respuesta
 * del Asistente fue útil o no (👍/👎), ver ontologia.asistente_feedback.
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const data = await backendPost("/v1/chatbot/asistente/feedback", body);
    return NextResponse.json(data);
  } catch (error) {
    const status = error instanceof BackendError ? error.status : 502;
    const detalle = error instanceof Error ? error.message : String(error);
    return NextResponse.json(
      { error: "No se pudo registrar el feedback", detalle },
      { status }
    );
  }
}
