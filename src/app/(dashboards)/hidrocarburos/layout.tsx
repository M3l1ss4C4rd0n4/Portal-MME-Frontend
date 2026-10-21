import { notFound } from "next/navigation";
import { HIDROCARBUROS_VISIBLE } from "@/lib/featureFlags";

/**
 * Cierra la entrada directa por URL a los seis tableros de Hidrocarburos
 * mientras la sección esté oculta. Las páginas siguen en el repositorio: basta
 * con poner HIDROCARBUROS_VISIBLE en `true` para que vuelvan a responder.
 */
export default function HidrocarburosLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  if (!HIDROCARBUROS_VISIBLE) notFound();
  return <>{children}</>;
}
