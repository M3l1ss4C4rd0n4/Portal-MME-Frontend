import { NextResponse } from "next/server";
import { backendGet, BackendError } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  const fechaInicio = searchParams.get("fecha_inicio");
  const fechaFin = searchParams.get("fecha_fin");
  if (fechaInicio) qs.set("fecha_inicio", fechaInicio);
  if (fechaFin) qs.set("fecha_fin", fechaFin);

  const path = `/v1/balance-oferta-demanda/demanda-no-atendida-regional${qs.toString() ? "?" + qs.toString() : ""}`;

  try {
    const data = await backendGet(path);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError)
      return NextResponse.json({ error: "Backend error" }, { status: err.status });
    console.error("[api/balance-oferta-demanda/demanda-no-atendida-regional]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
