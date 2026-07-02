import { NextRequest, NextResponse } from "next/server";
import { promises as fs } from "node:fs";
import path from "node:path";

export const dynamic = "force-dynamic";

const PUBLIC_PDFS_DIR = path.resolve(process.cwd(), "public/generated-pdfs");

export async function GET(request: NextRequest) {
  const filePath = request.nextUrl.searchParams.get("path");

  if (!filePath) {
    return NextResponse.json({ error: "Falta parámetro path" }, { status: 400 });
  }

  // Sanitizar: evitar path traversal
  const normalized = path.normalize(filePath).replace(/^(\.\.(\/|\\|$))+/, "");
  const fullPath = path.join(PUBLIC_PDFS_DIR, normalized);

  // Verificar que esté dentro del directorio permitido
  if (!fullPath.startsWith(PUBLIC_PDFS_DIR + path.sep) && fullPath !== PUBLIC_PDFS_DIR) {
    return NextResponse.json({ error: "Ruta no permitida" }, { status: 403 });
  }

  try {
    const stat = await fs.stat(fullPath);
    if (!stat.isFile()) {
      return NextResponse.json({ error: "No es un archivo" }, { status: 404 });
    }

    const buffer = await fs.readFile(fullPath);

    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=300, stale-while-revalidate=600",
        "Content-Length": String(buffer.length),
      },
    });
  } catch (error) {
    console.error("[API /pdf-image] Error:", error);
    return NextResponse.json({ error: "Imagen no encontrada" }, { status: 404 });
  }
}
