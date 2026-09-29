import { NextResponse } from "next/server";
import { backendGet, BackendError } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const qs = new URLSearchParams();
  const tipo = searchParams.get("tipo");
  const tecnologia = searchParams.get("tecnologia");
  const estado = searchParams.get("estado");
  if (tipo) qs.set("tipo", tipo);
  if (tecnologia) qs.set("tecnologia", tecnologia);
  if (estado) qs.set("estado", estado);

  const path = `/v1/balance-oferta-demanda/proyectos-upme${qs.toString() ? "?" + qs.toString() : ""}`;

  try {
    const data = await backendGet(path);
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError)
      return NextResponse.json({ error: "Backend error" }, { status: err.status });
    console.error("[api/balance-oferta-demanda/proyectos-upme]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
