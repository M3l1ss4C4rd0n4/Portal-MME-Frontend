import { NextResponse } from "next/server";
import { backendGet, BackendError } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  const qs = new URLSearchParams();
  const fondo        = searchParams.get("fondo");
  const estado       = searchParams.get("estado");
  const etapa        = searchParams.get("etapa");
  const departamento = searchParams.get("departamento");
  const municipio    = searchParams.get("municipio");
  const anoMin       = searchParams.get("anoMin");
  const anoMax       = searchParams.get("anoMax");

  if (fondo)        qs.set("fondo",        fondo);
  if (estado)       qs.set("estado",       estado);
  if (etapa)        qs.set("etapa",        etapa);
  if (departamento) qs.set("departamento", departamento);
  if (municipio)    qs.set("municipio",    municipio);
  if (anoMin)   qs.set("anoMin",   anoMin);
  if (anoMax)   qs.set("anoMax",   anoMax);

  const path = `/v1/supervision/dashboard${qs.toString() ? "?" + qs.toString() : ""}`;

  try {
    const data = await backendGet(path);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError)
      return NextResponse.json({ error: "Backend error" }, { status: err.status });
    console.error("[api/supervision]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
