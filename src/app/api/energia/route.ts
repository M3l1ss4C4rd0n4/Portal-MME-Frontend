import { NextResponse } from "next/server";
import { backendGet, BackendError } from "@/lib/backendClient";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const data = await backendGet("/v1/energia/dashboard");
    return NextResponse.json(data);
  } catch (err) {
    if (err instanceof BackendError)
      return NextResponse.json({ error: "Backend error" }, { status: err.status });
    console.error("[api/energia]", err);
    return NextResponse.json({ error: "Error al obtener datos de energía" }, { status: 500 });
  }
}
