import { NextRequest, NextResponse } from "next/server";
import { backendGet, BackendError } from "@/lib/backendClient";
import type { ResultadoBusquedaTexto } from "@/types/ontologia";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const q = request.nextUrl.searchParams.get("q");
  if (!q || q.trim().length < 3) {
    return NextResponse.json(
      { error: "El parámetro 'q' es requerido (mínimo 3 caracteres)" },
      { status: 400 }
    );
  }
  const topK = request.nextUrl.searchParams.get("top_k") ?? "5";

  try {
    const data = await backendGet<{ consulta: string; resultados: ResultadoBusquedaTexto[] }>(
      `/v1/ontologia/buscar-texto?q=${encodeURIComponent(q)}&top_k=${encodeURIComponent(topK)}`
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError)
      return NextResponse.json({ error: "Backend error" }, { status: err.status });
    console.error("[api/ontologia/buscar-texto]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
