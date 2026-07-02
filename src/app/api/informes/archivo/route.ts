import { NextRequest, NextResponse } from "next/server";
import { backendGetPdf, BackendError } from "@/lib/backendClient";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const driveId = searchParams.get("driveId");
  const itemId = searchParams.get("itemId");

  if (!driveId || !itemId) {
    return NextResponse.json(
      { error: "Se requieren driveId e itemId" },
      { status: 400 },
    );
  }

  try {
    const res = await backendGetPdf(
      `/v1/reports/archivo?drive_id=${encodeURIComponent(driveId)}&item_id=${encodeURIComponent(itemId)}`,
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({ error: text || `HTTP ${res.status}` }, { status: res.status });
    }

    const buffer = await res.arrayBuffer();
    const disposition = res.headers.get("content-disposition") ?? 'attachment; filename="informe.pdf"';

    return new NextResponse(buffer, {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": disposition,
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    const status = err instanceof BackendError ? err.status : 502;
    const msg = err instanceof Error ? err.message : "Error desconocido";
    return NextResponse.json({ error: msg }, { status });
  }
}
