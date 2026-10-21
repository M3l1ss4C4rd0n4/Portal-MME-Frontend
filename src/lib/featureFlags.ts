/**
 * Interruptores de visibilidad del portal.
 *
 * Centralizan qué secciones se muestran, sin borrar el código que las produce.
 * Cambiar el valor y volver a desplegar es todo lo que hace falta para
 * devolverlas a la vista.
 */

/**
 * Contenido de la Dirección de Hidrocarburos: entrada del menú principal,
 * slides del carrusel de inicio (noticias + presupuesto + producción) y las
 * seis páginas de tablero bajo `/hidrocarburos`.
 *
 * En `false` desde octubre de 2026: el portal volvió al alcance de la
 * Dirección de Energía. Las páginas, los endpoints de API, el ETL de SICOM y
 * los datos en PostgreSQL siguen intactos — solo dejan de mostrarse.
 */
export const HIDROCARBUROS_VISIBLE = false;
