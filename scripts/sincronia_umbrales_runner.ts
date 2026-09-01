/**
 * Runner de verificación de sincronía Python↔TypeScript (Fase 39, ítem C.2).
 *
 * Lee por stdin un JSON con una lista de casos {pct, fecha} y calcula, para
 * cada uno, el resultado de clasificarIndiceNE()/clasificarVisualEmbalse()
 * de src/lib/umbralesOficiales.ts — imprime el resultado como JSON en
 * stdout, para que server/scripts/verificar_sincronia_umbrales.py lo
 * compare contra el resultado equivalente del módulo Python
 * (core/umbrales_oficiales.py).
 *
 * No se ejecuta solo — invocado por el script Python.
 */
import { clasificarIndiceNE, clasificarVisualEmbalse } from "../src/lib/umbralesOficiales";

interface Caso {
  pct: number;
  fecha: string;
}

function leerStdin(): Promise<string> {
  return new Promise((resolve, reject) => {
    let data = "";
    process.stdin.setEncoding("utf8");
    process.stdin.on("data", (chunk) => (data += chunk));
    process.stdin.on("end", () => resolve(data));
    process.stdin.on("error", reject);
  });
}

async function main() {
  const raw = await leerStdin();
  const casos: Caso[] = JSON.parse(raw);

  const resultados = casos.map((c) => {
    const fecha = new Date(c.fecha);
    const ne = clasificarIndiceNE(c.pct, fecha);
    const visual = clasificarVisualEmbalse(c.pct, fecha);
    return {
      pct: c.pct,
      fecha: c.fecha,
      nivel_ne: ne.nivel,
      senda_referencia_pct: ne.sendaReferenciaPct,
      visual_label: visual.label,
    };
  });

  process.stdout.write(JSON.stringify(resultados));
}

main().catch((e) => {
  process.stderr.write(String(e));
  process.exit(1);
});
