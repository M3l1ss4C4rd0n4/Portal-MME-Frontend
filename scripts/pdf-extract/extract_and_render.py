#!/usr/bin/env python3
"""
Extrae texto estructurado y renderiza un PDF a imágenes PNG.
Uso: python extract_and_render.py <pdf_path> <output_dir> [tipo_xm] [dpi]
Salida: JSON en stdout
"""
import sys
import json
import os
import re
import fitz  # PyMuPDF


def normalizar_texto(texto: str) -> str:
    texto = re.sub(r" \n", " ", texto)
    texto = re.sub(r"\n ", " ", texto)
    texto = re.sub(r"\n", " ", texto)
    texto = re.sub(r" +", " ", texto)
    return texto.strip()


def extraer_kpis_xm(texto: str, tipo: str) -> dict:
    kpis = {}
    texto_norm = normalizar_texto(texto)

    if tipo == "SeguimientoDespacho":
        m = re.findall(r"(\d{3}\.\d+)COP/kWh", texto_norm)
        if m:
            kpis["preciosOferta"] = m
        m = re.search(
            r"Indisponible por mantenimiento\s*(.*?)\s*->\s*Indisponible sin mantenimiento registrado\s*(.*?)\.",
            texto_norm,
        )
        if m:
            recursos = []
            for grupo in [m.group(1), m.group(2)]:
                for r in grupo.split(","):
                    r = r.strip()
                    if r and r not in recursos:
                        recursos.append(r)
            kpis["recursosIndisponibles"] = recursos

    elif tipo == "VariablesOperativas":
        m = re.search(r"exportaciones fueron de ([\d.]+)GWh", texto_norm)
        if m:
            kpis["exportacionesGWh"] = float(m.group(1))
        m = re.search(r"importaciones fueron de ([\d.]+)GWh", texto_norm)
        if m:
            kpis["importacionesGWh"] = float(m.group(1))
        m = re.search(
            r"generación de energía de las plantas solares y eólicas.*?aportes de ([\d.]+)%",
            texto_norm,
        )
        if m:
            kpis["maxFNCERPct"] = float(m.group(1))

    elif tipo == "VariablesHidrologicas":
        m = re.search(r"aportes fueron de ([\d.]+)GWh/día", texto_norm)
        if m:
            kpis["aportesGWhDia"] = float(m.group(1))
        m = re.search(r"equivalente al ([\d.]+)% respecto a la media", texto_norm)
        if m:
            kpis["aportesPctMedia"] = float(m.group(1))
        m = re.search(r"nivel de embalse del SIN llegó al ([\d.]+)%", texto_norm)
        if m:
            kpis["nivelEmbalsePct"] = float(m.group(1))
        m = re.search(r"se vertieron ([\d.]+)GWh por ITUANGO", texto_norm)
        if m:
            kpis["vertimientosItuangoGWh"] = float(m.group(1))

    return kpis


def detectar_secciones(paginas_texto: list[str]) -> list[dict]:
    """Detecta posibles títulos de sección en el texto de cada página."""
    secciones = []
    for i, texto in enumerate(paginas_texto):
        lineas = texto.split("\n")
        for linea in lineas:
            linea = linea.strip()
            # Heurística: línea corta, en mayúsculas, sin puntuación al final
            if (
                len(linea) > 8
                and len(linea) < 120
                and linea.upper() == linea
                and not linea.endswith((".", ",", ";", ":"))
                and not linea.startswith(("$", "•", "-", "▪"))
            ):
                secciones.append({"titulo": linea, "pagina": i + 1})
    # Eliminar duplicados conservando orden
    vistas = set()
    unicas = []
    for s in secciones:
        clave = (s["titulo"], s["pagina"])
        if clave not in vistas:
            vistas.add(clave)
            unicas.append(s)
    return unicas


def main():
    if len(sys.argv) < 3:
        print(json.dumps({"error": "Faltan argumentos: pdf_path output_dir [tipo_xm] [dpi]"}), file=sys.stderr)
        sys.exit(1)

    pdf_path = sys.argv[1]
    output_dir = sys.argv[2]
    tipo_xm = sys.argv[3] if len(sys.argv) > 3 else None
    dpi = int(sys.argv[4]) if len(sys.argv) > 4 else 150

    try:
        os.makedirs(output_dir, exist_ok=True)
        doc = fitz.open(pdf_path)

        paginas_texto = []
        texto_completo = ""
        paginas_imagenes = []

        for i, page in enumerate(doc):
            texto = page.get_text()
            paginas_texto.append(texto)
            texto_completo += f"\n--- PÁGINA {i + 1} ---\n{texto}"

            # Renderizar imagen
            pix = page.get_pixmap(dpi=dpi)
            filename = f"pagina-{i + 1:03d}.png"
            filepath = os.path.join(output_dir, filename)
            pix.save(filepath)

            paginas_imagenes.append({
                "numero": i + 1,
                "filename": filename,
                "url": f"/api/pdf-image?path={os.path.basename(output_dir)}/{filename}",
                "width": pix.width,
                "height": pix.height,
            })

        doc.close()

        # Extraer KPIs
        kpis = {}
        if tipo_xm:
            kpis = extraer_kpis_xm(texto_completo, tipo_xm)

        # Detectar secciones
        secciones = detectar_secciones(paginas_texto)

        # Estadísticas
        palabras = len(texto_completo.split())

        result = {
            "ok": True,
            "totalPaginas": len(paginas_imagenes),
            "dpi": dpi,
            "palabras": palabras,
            "extracto": texto_completo[:2000].strip(),
            "kpis": kpis,
            "secciones": secciones,
            "paginas": paginas_imagenes,
        }

        print(json.dumps(result, ensure_ascii=False))
    except Exception as e:
        print(json.dumps({"error": str(e), "ok": False}, ensure_ascii=False), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
