#!/usr/bin/env python3
"""
Extrae texto del resumen ejecutivo diario.
Uso: python extract_resumen.py <pdf_path>
Salida: JSON en stdout
"""
import sys
import json
import fitz


def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Falta pdf_path"}), file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]

    try:
        doc = fitz.open(pdf_path)
        texto = ""
        for page in doc:
            texto += page.get_text()

        extracto = texto[:2500].strip()
        kpis = {}

        print(
            json.dumps(
                {"extracto": extracto, "kpis": kpis, "ok": True},
                ensure_ascii=False,
            )
        )
    except Exception as e:
        print(
            json.dumps({"error": str(e), "ok": False}, ensure_ascii=False),
            file=sys.stderr,
        )
        sys.exit(1)


if __name__ == "__main__":
    main()
