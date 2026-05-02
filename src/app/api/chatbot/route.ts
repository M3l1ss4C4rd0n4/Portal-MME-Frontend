import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // Validación básica del request
    if (!body.intent || typeof body.intent !== "string") {
      return NextResponse.json(
        { status: "ERROR", message: "Campo 'intent' requerido" },
        { status: 400 }
      );
    }

    const apiUrl = process.env.CHATBOT_API_URL;
    const apiKey = process.env.CHATBOT_API_KEY;

    if (!apiUrl || !apiKey) {
      console.error("[API /chatbot] Variables de entorno CHATBOT_API_URL o CHATBOT_API_KEY no configuradas");
      return NextResponse.json(
        { status: "ERROR", message: "Servicio de chatbot no configurado" },
        { status: 503 }
      );
    }

    const upstream = await fetch(apiUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-API-Key": apiKey,
      },
      body: JSON.stringify({
        sessionId: body.sessionId ?? `web_${Date.now()}`,
        intent: body.intent,
        parameters: body.parameters ?? {},
      }),
      signal: AbortSignal.timeout(35_000),
    });

    const data = await upstream.json();
    return NextResponse.json(data, { status: upstream.status });
  } catch (error) {
    console.error("[API /chatbot] Error:", error);
    return NextResponse.json(
      { status: "ERROR", message: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
