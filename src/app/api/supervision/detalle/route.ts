import { NextResponse } from "next/server";
import { backendGet, BackendError } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

function buildQueryString(searchParams: URLSearchParams): string {
  const qs = new URLSearchParams();
  for (const key of ["fondo", "estado", "etapa", "ejecutor", "anoMin", "anoMax"]) {
    const val = searchParams.get(key);
    if (val) qs.set(key, val);
  }
  return qs.toString();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = buildQueryString(searchParams);
  const path = `/v1/supervision/detalle${qs ? "?" + qs : ""}`;

  try {
    const data = await backendGet(path);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError)
      return NextResponse.json({ error: "Backend error" }, { status: err.status });
    console.error("[api/supervision/detalle]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
