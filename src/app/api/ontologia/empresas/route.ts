import { NextRequest, NextResponse } from "next/server";
import { backendGet, BackendError } from "@/lib/backendClient";
import type { Empresa } from "@/types/ontologia";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const nit = request.nextUrl.searchParams.get("nit");
  const nombre = request.nextUrl.searchParams.get("nombre");
  if (!nit && !nombre) {
    return NextResponse.json({ error: "Debe indicar 'nit' o 'nombre'" }, { status: 400 });
  }

  const qs = nit ? `nit=${encodeURIComponent(nit)}` : `nombre=${encodeURIComponent(nombre!)}`;

  try {
    const data = await backendGet<{ empresas: Empresa[] }>(`/v1/ontologia/empresas?${qs}`);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError)
      return NextResponse.json({ error: "Backend error" }, { status: err.status });
    console.error("[api/ontologia/empresas]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
