import { NextResponse } from "next/server";
import { backendGet, BackendError } from "@/lib/backendClient";
import type { ResumenDepartamento } from "@/types/ontologia";

export const dynamic = "force-dynamic";

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ codigo: string }> }
) {
  try {
    const { codigo } = await params;
    const data = await backendGet<ResumenDepartamento>(
      `/v1/ontologia/geografia/${encodeURIComponent(codigo)}/resumen`
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError)
      return NextResponse.json({ error: "Backend error" }, { status: err.status });
    console.error("[api/ontologia/geografia/[codigo]/resumen]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
