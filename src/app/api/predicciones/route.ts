import { NextResponse } from "next/server";
import { backendGet, BackendError } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await backendGet("/v1/predictions/dashboard");
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError)
      return NextResponse.json({ error: "Backend error" }, { status: err.status });
    console.error("[api/predicciones]", err);
    return NextResponse.json({ error: "Error al obtener predicciones del SIN" }, { status: 500 });
  }
}
