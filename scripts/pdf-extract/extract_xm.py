#!/usr/bin/env python3
"""
Extrae texto y KPIs estructurados de los informes diarios XM.
Uso: python extract_xm.py <tipo> <pdf_path>
Salida: JSON en stdout
"""
import sys
import json
import re
import fitz  # PyMuPDF


def normalizar_texto(texto: str) -> str:
    # Limpiar saltos de línea insertados en medio de frases
    texto = re.sub(r" \n", " ", texto)
    texto = re.sub(r"\n ", " ", texto)
    texto = re.sub(r"\n", " ", texto)
    texto = re.sub(r" +", " ", texto)
    return texto.strip()


def extraer_kpis(texto: str, tipo: str) -> dict:
    kpis = {}
    texto = normalizar_texto(texto)

    if tipo == "SeguimientoDespacho":
        m = re.findall(r"(\d{3}\.\d+)COP/kWh", texto)
        if m:
            kpis["preciosOferta"] = m
        m = re.search(
            r"Indisponible por mantenimiento\s*(.*?)\s*->\s*Indisponible sin mantenimiento registrado\s*(.*?)\.",
            texto,
        )
        if m:
            por_mant = m.group(1).strip()
            sin_mant = m.group(2).strip()
            recursos = [r.strip() for r in por_mant.split(",") if r.strip()]
            recursos += [r.strip() for r in sin_mant.split(",") if r.strip()]
            kpis["recursosIndisponibles"] = recursos

    elif tipo == "VariablesOperativas":
        m = re.search(r"exportaciones fueron de ([\d.]+)GWh", texto)
        if m:
            kpis["exportacionesGWh"] = float(m.group(1))
        m = re.search(r"importaciones fueron de ([\d.]+)GWh", texto)
        if m:
            kpis["importacionesGWh"] = float(m.group(1))
        m = re.search(
            r"generación de energía de las plantas solares y eólicas.*?aportes de ([\d.]+)%",
            texto,
        )
        if m:
            kpis["maxFNCERPct"] = float(m.group(1))

    elif tipo == "VariablesHidrologicas":
        m = re.search(r"aportes fueron de ([\d.]+)GWh/día", texto)
        if m:
            kpis["aportesGWhDia"] = float(m.group(1))
        m = re.search(r"equivalente al ([\d.]+)% respecto a la media", texto)
        if m:
            kpis["aportesPctMedia"] = float(m.group(1))
        m = re.search(r"nivel de embalse del SIN llegó al ([\d.]+)%", texto)
        if m:
            kpis["nivelEmbalsePct"] = float(m.group(1))
        m = re.search(r"se vertieron ([\d.]+)GWh por ITUANGO", texto)
        if m:
            kpis["vertimientosItuangoGWh"] = float(m.group(1))

    return kpis


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Faltan argumentos: tipo pdf_path"}), file=sys.stderr)
        sys.exit(1)

    tipo = sys.argv[1]
    pdf_path = sys.argv[2]

    try:
        doc = fitz.open(pdf_path)
        texto = ""
        for page in doc:
            texto += page.get_text()

        extracto = texto[:2500].strip()
        kpis = extraer_kpis(texto, tipo)

        print(
            json.dumps(
                {"tipo": tipo, "extracto": extracto, "kpis": kpis, "ok": True},
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
