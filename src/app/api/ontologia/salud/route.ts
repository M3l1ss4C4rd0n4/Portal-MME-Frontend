import { NextResponse } from "next/server";
import { backendGet, BackendError } from "@/lib/backendClient";
import type { SaludDatos } from "@/types/ontologia";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await backendGet<SaludDatos>("/v1/ontologia/salud");
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError)
      return NextResponse.json({ error: "Backend error" }, { status: err.status });
    console.error("[api/ontologia/salud]", err);
    return NextResponse.json({ error: "Error interno" }, { status: 500 });
  }
}
