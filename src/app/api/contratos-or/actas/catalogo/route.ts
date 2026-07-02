import { NextResponse } from "next/server";
import { backendGet } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

interface ActaItem {
  id: string;
  name: string;
  lastModified?: string;
}

interface ActasResponse {
  actas: ActaItem[];
  total: number;
}

export async function GET() {
  try {
    const data = await backendGet<ActasResponse>(
      "/v1/contratos-or/actas/catalogo",
      60_000,
    );
    return NextResponse.json(data, {
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate, max-age=0",
        Pragma: "no-cache",
      },
    });
  } catch (error) {
    console.error("[API /contratos-or/actas/catalogo] Error:", error);
    return NextResponse.json(
      { actas: [], total: 0, error: "No se pudo cargar el catálogo de actas" },
      { status: 502 },
    );
  }
}
