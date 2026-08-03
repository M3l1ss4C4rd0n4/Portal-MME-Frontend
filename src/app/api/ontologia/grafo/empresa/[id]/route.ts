import { NextRequest, NextResponse } from "next/server";
import { backendGet, BackendError } from "@/lib/backendClient";
import type { VecindarioEmpresa } from "@/types/ontologia";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const limit = request.nextUrl.searchParams.get("limit") ?? "50";

  try {
    const data = await backendGet<VecindarioEmpresa>(
      `/v1/ontologia/grafo/empresa/${encodeURIComponent(id)}?limit=${encodeURIComponent(limit)}`
    );
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError)
      return NextResponse.json({ error: "Backend error" }, { status: err.status });
    console.error("[api/ontologia/grafo/empresa/[id]]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
