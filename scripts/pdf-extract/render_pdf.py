#!/usr/bin/env python3
"""
Renderiza un PDF a imágenes PNG, una por página.
Uso: python render_pdf.py <pdf_path> <output_dir> [dpi]
Salida: JSON en stdout con metadata de las imágenes generadas.
"""
import sys
import json
import os
import fitz  # PyMuPDF


def render_pdf(pdf_path: str, output_dir: str, dpi: int = 150):
    os.makedirs(output_dir, exist_ok=True)
    doc = fitz.open(pdf_path)
    paginas = []

    for i, page in enumerate(doc):
        # Renderizar página a pixmap
        pix = page.get_pixmap(dpi=dpi)
        filename = f"pagina-{i + 1:03d}.png"
        filepath = os.path.join(output_dir, filename)
        pix.save(filepath)

        paginas.append({
            "numero": i + 1,
            "filename": filename,
            "url": f"/generated-pdfs/{os.path.basename(output_dir)}/{filename}",
            "width": pix.width,
            "height": pix.height,
            "dpi": dpi,
        })

    doc.close()

    return {
        "ok": True,
        "totalPaginas": len(paginas),
        "dpi": dpi,
        "outputDir": output_dir,
        "paginas": paginas,
    }


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Faltan argumentos: pdf_path output_dir [dpi]"}), file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_dir = sys.argv[2]
    dpi = int(sys.argv[3]) if len(sys.argv) > 3 else 150

    try:
        result = render_pdf(pdf_path, output_dir, dpi)
        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e), "ok": False}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
