import { NextResponse } from "next/server";
import { backendGet, BackendError } from "@/lib/backendClient";
import type { Metrica } from "@/types/ontologia";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await backendGet<{ metricas: Metrica[] }>("/v1/ontologia/metricas");
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError)
      return NextResponse.json({ error: "Backend error" }, { status: err.status });
    console.error("[api/ontologia/metricas]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
