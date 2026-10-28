/**
 * Fragmentos SQL compartidos del esquema `subsidios`.
 *
 * Los tableros de Validaciones, Pagos y Detalle Empresas leen las mismas dos
 * tablas y necesitan normalizarlas igual. Tenerlo en un solo sitio evita que
 * cada endpoint clasifique los estados a su manera y muestre cifras distintas
 * para el mismo dato.
 *
 * Todas las funciones devuelven texto SQL y no interpolan nada que venga del
 * usuario: el `alias` lo fija el propio endpoint.
 */

/** Estados de validación, en el orden en que deben graficarse. */
export const ESTADOS_VALIDACION = [
  "e. VF",
  "d. VP",
  "b. VI",
  "c. VI SP",
  "a. Otros",
] as const;

export type EstadoValidacion = (typeof ESTADOS_VALIDACION)[number];

/**
 * Etiqueta corta para ejes y leyendas, sin el prefijo de ordenamiento.
 *
 * El rango llega hasta la `z` por «z. Sin validación», que no es un estado de
 * la fuente sino la fila del resumen por período donde caen los pagos que no
 * cruzan con ninguna validación del corte.
 */
export function etiquetaEstado(estado: string): string {
  return estado.replace(/^[a-z]\.\s*/, "");
}

/**
 * Códigos que SUI asigna por mercado a una misma empresa: uno en el SIN y otro
 * en las ZNI. El catálogo `subsidios_empresas` les da entradas separadas, pero
 * son el mismo prestador, así que el tablero los suma.
 *
 * Es una lista explícita y no una regla de sufijos a propósito. `-F` sí marca
 * el fondo y se puede quitar siempre (`1411` y `1411-F` son la misma CARIBEMAR),
 * pero `-N` no: el catálogo dice que `1213-F` es CELSIA COLOMBIA y `1213-N` es
 * CELSIA TOLIMA, razón social distinta. Quitar `-N` fusionaría dos empresas
 * que no lo son.
 */
export const CODIGOS_UNIFICADOS: Record<string, string> = {
  "520": "1239", //  CENTRALES ELÉCTRICAS DE NARIÑO (CEDENAR): ZNI → SIN
  "1426": "2170", // SIGLO XXI E.I.C.E. E.S.P.: SIN → ZNI (2170 trae 707 filas contra 225)
};

/**
 * Nombres sin código SUI que pertenecen a una empresa que sí lo tiene.
 *
 * El rescate por nombre de `consultaMapaEmpresas` solo acierta cuando las dos
 * grafías normalizan igual, y la fuente escribe la misma empresa unas veces
 * con la sigla y otras sin ella: «EMPRESA DE ENERGIA DE ARAUCA S.A. E.S.P» y
 * «... - ENELAR» son la misma y salían como dos en el tablero.
 *
 * La lista sale de auditar con Jev los 38 nombres sueltos que más se parecen a
 * uno con código, contrastando cada juicio contra el catálogo. Se congela aquí
 * en vez de resolverse con una heurística en tiempo de ejecución, porque una
 * regla de parecido fusiona lo que no debe: la similitud de trigramas daba
 * 0,65 entre GUAVIARE y VICHADA, 0,51 entre CARURU y SIPÍ y 0,49 entre META y
 * CAUCA, tres pares de empresas distintas que Jev rechazó y que una regla
 * automática habría unido.
 *
 * Fuera quedan, para que los mire el área: BAJO PIZARRO contra BAJO BAUDÓ
 * PIZARRO (0,65), EMPRESA DISTRIBUIDORA DEL PACÍFICO contra EMPRESA DE ENERGÍA
 * DEL PACÍFICO (0,40) y la UNIDAD contra la COMPAÑÍA de servicios de Bojayá
 * (0,56).
 *
 * Las claves son el nombre ya normalizado por `nombreNormalizadoSql`, que
 * descarta todo lo que no sea letra sin tilde o dígito.
 */
export const NOMBRES_UNIFICADOS: Record<string, string> = {
  // EMPRESA DE SERVICIOS PÚBLICOS DE ENERGÍA LIMPIA DE COLOMBIA ENERLIMPIA S.A. 
  "EMPRESADESERVICIOSPBLICOSDEENERGALIMPIADECOLOMBIAENERLIMPIASAESPENERLIMPIA": "43836", // Jev 0.98
  // EMPRESA DE SERVICIOS PÚBLICOS Y ENERGIA DEL LITORAL DEL SAN JUAN S.A.S. E.S.
  "EMPRESADESERVICIOSPUBLICOSYENERGIADELLITORALDELSANJUANSASESP": "34274", // Jev 0.95
  // JUNTA ADMINISTRADORA DE SERVICIOS PÚBLICOS  DE  CAPURGANA
  "JUNTAADMINISTRADORADESERVICIOSPUBLICOSDECAPURGANA": "2080", // Jev 0.95
  // EMPRESA ASOCIATIVA DE TRABAJO EAT ELECTRIFICADORA DE SAN JUAN DE LA COSTA E.
  "EMPRESAASOCIATIVADETRABAJOEATELECTRIFICADORADESANJUANDELACOSTAESPEATELECTROSANJUANESP": "3027", // Jev 0.96
  // EMPRESA MUNICIPAL DE SERVICIOS PUBLICOS DE CARTAGENA DEL CHAIRA S.A. ESP
  "EMPRESAMUNICIPALDESERVICIOSPUBLICOSDECARTAGENADELCHAIRA": "1279", // Jev 0.88
  // E.A.T. DE PRESTACION DE SERVICIOS PUBLICOS DE LA LOCALIDAD DEL CHAJAL MUNINI
  "EATDEPRESTACIONDESERVCIOSPUBLICOSDELALOCALIDADDELCHAJALMUNICIPIODETUMACO": "3173", // Jev 0.95
  // ENERGIA Y CONECTIVIDAD COMUNITARIA MONTES DE MARIA S.A.S. E.S.P. (SISFV)
  "ENERGIAYCONECTIVIDADCOMUNITARIAMONTESDEMARIASASESP": "49147S", // Jev 0.95
  // COMPAÑÍA ENERGÉTICA DE OCCIDENTE S.A.S. E.S.P. -CEO
  "COMPAAENERGTICADEOCCIDENTESASESP": "1240", // Jev 0.96
  // CENTRAL HIDROELÉCTRICA DE CALDAS S.A. E.S.P.
  "CENTRALHIDROELECTRICADECALDASSAESP": "1234", // Jev 0.98
  // EMPRESA ASOCIATIVA DE TRABAJO PARA LA PRESTACION DE SERVICIOS PUBLICOS DE EN
  "EMPRESAASOCIATIVADETRABAJOPARALAPRESTACIONDESERVICIOSPUBLICOSDEENERGIAACUEDUCTOALCANTARILLADOYASEODELMUNICIPIODESANTABARBARAISCUAEATSERPUBSANTABARBAYCOPASCOL": "31373", // Jev 0.94
  // EMPRESA MUNICIPAL DE SERVICIOS PÚBLICOS DOMICILIARIOS DE VIGÍA DEL FUERTE
  "EMPRESAMUNICIPALDESERVICIOSPBLICOSDOMICILIARIOSDEVIGADELFUERTEEMSPUVIF": "1930", // Jev 0.96
  // EMPRESA ASOCIATIVA DE TRABAJO COMERCIALIZADORA SAN JOSE E.S.P.
  "EMPRESAASOCIATIVADETRABAJOCOMERCIALIZADORASANJOSESPCOMSAN": "28352", // Jev 0.91
  // EMPRESAS MUNICIPALES DE CALI E.I.C.E. E.S.P.-EMCALI
  "EMPRESASMUNICIPALESDECALIEICEESP": "1232", // Jev 0.93
  // ASOCIACIÓN DE USUARIOS DEL SERVICIO DE ENERGÍA ELÉCTRICA DE LA ZONA RURAL DE
  "ASOCIACIONDEUSUARIOSDELSERVICIODEENERGIAELECTRICADELAZONARURALDESANTABARBARADEISCUANDE": "22594", // Jev 0.95
  // EMPRESA DE ENERGIA DE CASANARE S.A. E.S.P - ENERCA
  "EMPRESADEENERGIADECASANARESAESP": "1331", // Jev 0.96
  // EMPRESA DE ENERGIA DE BOYACA S.A. E.S.P. -EBSA
  "EMPRESADEENERGIADEBOYACASAESP": "1242", // Jev 0.98
  // COOPERATIVA DE SERVICIOS PÚBLICOS DE LÓPEZ DE MICAY
  "COOPERATIVADESERVICIOSPUBLICOSDELOPEZDEMICAY": "21597", // Jev 0.96
  // ELECTRIFICADORA DEL CAQUETÁ S.A. E.S.P.-ELECTROCAQUETÁ
  "ELECTRIFICADORADELCAQUETSAESP": "1238", // Jev 0.94
  // ELECTRIFICADORA DEL HUILA S.A. E.S.P.-ELECTROHUILA
  "ELECTRIFICADORADELHUILASAESP": "1237", // Jev 0.95
  // EMPRESA DE ENERGIA DE ARAUCA S.A. E.S.P - ENELAR
  "EMPRESADEENERGIADEARAUCASAESP": "1246", // Jev 0.95
  // EMPRESA DE SERVICIOS PUBLICOS DEL CAQUETA S.A.S. ESP
  "EMPRESADESERVICIOSPBLICOSDELCAQUETSASESP": "38893", // Jev 0.95
  // EMPRESA DE ENERGIA ELECTRICA DEL PATIA SAS ESP
  "EMPRESADEENERGIAELCTRICADELPATASASESP": "69939", // Jev 0.97
  // HELIOS ENERGIA S.A. ESP
  "HELIOSENERGASAESP": "42637", // Jev 0.92
  // SOLUNA ENERGÍA S.A.S E.S.P. (SISFV)
  "SOLUNAENERGASASESP": "53888S", // Jev 0.95
  // CENTRALES ELÉCTRICAS DE NARIÑO S.A. E.S.P.-CEDENAR
  "CENTRALESELECTRICASDENARIOSAESP": "1239", // Jev 0.93
  // CENTRALES ELECTRICAS DEL NORTE DE SANTANDER S.A. E.S.P.
  "CENTRALESELECTRICASDELNORTEDESANTANDERSAEMPRESADESERVICIOSPUBLICOS": "1233", // Jev 0.95
  // EMPRESAS PÚBLICAS DE MEDELLÍN E.S.P. - EPM
  "EMPRESASPUBLICASDEMEDELLINESP": "1250", // Jev 0.97
  // EMPRESA DE ENERGÍA DEL QUINDÍO S.A. E.S.P  - EDEQ
  "EMPRESADEENERGIADELQUINDIOSAESP": "1202", // Jev 0.97
  // SOLING DEL SINU S.A.S. E.S.P.
  "SOLINGDELSINUESPSAS": "48907", // Jev 0.94
  // EMPRESA DE ENERGIA DEL GUAINIA LA CEIBA S.A. E.S.P.  (Localidades)
  "EMPRESADEENERGADELGUAINIALACEIBASAESPEMELCESAESP": "2331", // Jev 0.86
  // ENERGIA PARA EL AMAZONAS S.A. ESP
  "EMPRESADEENERGAPARAELAMAZONASSAESPENAMSAESP": "23430", // Jev 0.95
};

/**
 * Clave estable de empresa.
 *
 * `nombre_prestador` no identifica una empresa: en `subsidios_pagos` hay 311
 * nombres distintos para solo 169 `codigo_sui`, porque la misma razón social
 * llega con puntuación y espacios distintos («CARIBEMAR DE LA COSTA S.A.S.
 * E.S.P.» aparece con tres grafías). Agrupar por nombre crudo parte las
 * empresas grandes en varias filas.
 *
 * Se usa `codigo_sui` cuando existe y, como respaldo, el nombre reducido a
 * letras y dígitos — necesario porque el 5 % de las filas de pagos no trae
 * código.
 *
 * El código se normaliza antes de agrupar, porque la fuente escribe el mismo
 * con caja y espacios distintos y cada variante salía como una empresa aparte:
 * `34833s`/`34833S`, `42637s`/`42637S`, `67580 - 1757`/`67580-1757`.
 *
 * Se le quita el sufijo `-F`: no es otra empresa, es la misma bajo el fondo
 * FOES. En el catálogo, `1411` y `1411-F` comparten razón social. Sin quitarlo,
 * 17 empresas salen duplicadas.
 *
 * `N.A.`, `N.A.1`, `N.A.2` y `NaN` no son códigos, son el marcador de «no hay
 * código»: se devuelven como ausentes para que la clave caiga en el nombre. Sin
 * eso, MUNICIPIO DE CUMBAL salía partido en dos, `N.A.2-N` en validaciones y
 * `N.A.-N` en pagos.
 */
export function codigoBaseSql(alias: string): string {
  return codigoNormalizadoSql(`${alias}.codigo_sui`);
}

/**
 * La normalización, aplicable a cualquier columna que guarde un código SUI.
 *
 * Se separó de `codigoBaseSql` para poder normalizar también el catálogo
 * `subsidios_empresas` y cruzarlo por el mismo criterio: el catálogo guarda
 * `1213-F` y `1411-F` con el sufijo puesto, así que comparar contra la clave ya
 * reducida dejaba 5 empresas sin nombre oficial, sin NIT y sin departamento.
 *
 * Un código sin una sola letra ni dígito no es un código: en la fuente hay
 * cuatro filas cuyo `codigo_sui` es un guion suelto, y bajo él conviven tres
 * empresas que no tienen nada que ver (CONSORCIO EMCALI, EMPAAATICS y
 * FIDEICOMISOS SOCIEDAD FIDUCIARIA DE OCCIDENTE). Devolverlo como ausente
 * manda cada una a su propio nombre y deja de fundirlas.
 */
export function codigoNormalizadoSql(columna: string): string {
  const base = `REGEXP_REPLACE(UPPER(REGEXP_REPLACE(COALESCE(${columna}, ''), '\\s+', '', 'g')), '-F$', '')`;
  const unificados = `'${JSON.stringify(CODIGOS_UNIFICADOS)}'::jsonb`;
  return `CASE
    WHEN ${base} !~ '[A-Z0-9]' OR ${base} ~ '^N\\.A\\.' OR ${base} = 'NAN' THEN NULL
    ELSE COALESCE(${unificados} ->> ${base}, ${base})
  END`;
}

/**
 * Catálogo oficial de empresas, con el código ya normalizado.
 *
 * Va como CTE y no como JOIN directo contra la tabla porque, al reducir el
 * código, `1411` y `1411-F` colapsan en la misma clave: sin el `DISTINCT ON`
 * el JOIN duplicaría cada fila de esas 18 empresas. Entre dos entradas del
 * mismo código gana la que trae NIT, que es la que más información aporta.
 */
export function catalogoEmpresasCte(nombre = "catalogo_empresa"): string {
  return `${nombre} AS (
    SELECT DISTINCT ON (cod) cod, nombre_prestador, nit, departamento
    FROM (
      SELECT ${codigoNormalizadoSql("se.codigo_sui")} AS cod,
             se.nombre_prestador,
             -- Dos secuelas de que el ETL leyera la columna como decimal: el
             -- NaN de pandas quedó escrito como texto en 115 de las 219
             -- empresas, y los NIT reales arrastran un '.0' al final.
             NULLIF(REGEXP_REPLACE(se.nit, '\\.0$', ''), 'NaN') AS nit,
             se.departamento
      FROM subsidios.subsidios_empresas se
    ) t
    WHERE cod IS NOT NULL
    ORDER BY cod, (nit IS NULL), nombre_prestador
  )`;
}

export function nombreNormalizadoSql(alias: string): string {
  return `UPPER(REGEXP_REPLACE(COALESCE(${alias}.nombre_prestador, ''), '[^A-Za-z0-9]+', '', 'g'))`;
}

/**
 * Consulta que arma el mapa nombre normalizado → código.
 *
 * El 5 % de las filas de pagos no trae `codigo_sui`, pero sí el nombre de una
 * empresa que en otras filas sí lo tiene. Se ejecuta UNA vez por petición (y
 * se cachea): recorre las dos tablas, así que cuesta ~600 ms y no debe
 * repetirse por consulta.
 */
export function consultaMapaEmpresas(): string {
  const fuente = (tabla: string, alias: string) => `
    SELECT ${nombreNormalizadoSql(alias)} AS nom, ${codigoBaseSql(alias)} AS cod
    FROM ${tabla} ${alias}
    WHERE ${codigoBaseSql(alias)} IS NOT NULL`;
  return `
    SELECT DISTINCT ON (nom) nom, cod FROM (${fuente("subsidios.subsidios_pagos", "mp")}
      UNION ALL${fuente("subsidios.subsidios_validaciones", "mv")}
    ) t
    WHERE nom <> ''
    ORDER BY nom, cod`;
}

/**
 * CTE con el mapa ya resuelto, recibido como dos arreglos.
 *
 * Se pasa desde el cliente en vez de recalcularlo dentro de cada consulta:
 * reconstruirlo costaba 625 ms por consulta y había diez por petición.
 */
export function mapaEmpresasCte(paramNom: string, paramCod: string, nombre = "mapa_empresa"): string {
  // El mapa se agrega a un único objeto jsonb para que la búsqueda por nombre
  // sea por clave y no un recorrido. Como CTE de filas, cada consulta lo
  // recorría entero por cada fila sin código: la consulta de opciones de
  // empresa tardaba 2.979 ms; con jsonb tarda 38 ms.
  //
  // MATERIALIZED evita que PostgreSQL vuelva a construir el objeto en cada
  // referencia (desde la versión 12 las CTE se insertan por defecto).
  return `${nombre} AS MATERIALIZED (
    SELECT jsonb_object_agg(nom, cod) AS j
    FROM unnest(${paramNom}::text[], ${paramCod}::text[]) AS t(nom, cod)
  )`;
}

/**
 * Clave estable de empresa.
 *
 * Orden de preferencia: el código propio de la fila, el código que le
 * corresponde a su nombre, y como último recurso el nombre normalizado.
 *
 * El rescate por nombre es una subconsulta dentro de `COALESCE`, no un JOIN,
 * **a propósito**: `COALESCE` evalúa de izquierda a derecha y se detiene en el
 * primer valor no nulo, así que la subconsulta y su expresión regular solo se
 * ejecutan en las filas que de verdad no traen código. Con JOIN, la misma
 * agregación tardaba 1.040 ms; así tarda 24 ms.
 */
export function empresaKeySql(alias: string, cte = "mapa_empresa"): string {
  const nom = nombreNormalizadoSql(alias);
  const alias_jsonb = `'${JSON.stringify(NOMBRES_UNIFICADOS)}'::jsonb`;
  return `COALESCE(
    ${codigoBaseSql(alias)},
    (SELECT j ->> ${nom} FROM ${cte}),
    ${alias_jsonb} ->> ${nom},
    'NOM:' || ${nom}
  )`;
}

/**
 * Estado de validación normalizado.
 *
 * `estado_validacion_organizado` está en NULL en el 80 % de las filas, así que
 * el respaldo es `estado_validacion`, que llega sucio: variantes de caja
 * (`Vf`, `vf`), espacios al final (`'VI '`) y dos grafías para el mismo estado
 * (`VI_SP` y `VI SP`).
 *
 * El CASE anterior —en el endpoint de validaciones— comparaba contra el texto
 * crudo, así que 1.622 filas caían en «Otros» sin serlo.
 */
export function estadoValidacionSql(alias: string): string {
  const crudo = `TRIM(UPPER(COALESCE(${alias}.estado_validacion, '')))`;
  return `CASE
    WHEN ${alias}.estado_validacion_organizado IS NOT NULL THEN ${alias}.estado_validacion_organizado
    WHEN ${crudo} = 'VF' THEN 'e. VF'
    WHEN ${crudo} = 'VP' THEN 'd. VP'
    WHEN ${crudo} = 'VI' THEN 'b. VI'
    WHEN ${crudo} IN ('VI SP', 'VI_SP') THEN 'c. VI SP'
    ELSE 'a. Otros'
  END`;
}

/**
 * Huella de una fila de validación: sus quince columnas de negocio.
 *
 * El Excel del área trae filas repetidas y el ETL las inserta tal cual, a
 * propósito, para que la tabla conserve lo que dijo la fuente. En el corte de
 * octubre hay 83 de 3.576 idénticas carácter por carácter en las quince
 * columnas —incluidas la justificación, el radicado y quién las actualizó—,
 * así que contarlas dos veces infla los estados: VI sale 1.536 cuando los
 * registros distintos son 1.479.
 *
 * Contando por esta huella, cada registro vale uno. Se descarta al leer y no
 * al cargar: la auditoría de lo que vino en el Excel no se pierde.
 *
 * Quedan fuera `id` y `fecha_importacion`, que son técnicas y siempre
 * difieren.
 */
export function huellaValidacionSql(alias: string): string {
  const columnas = [
    "fecha_actualizacion", "persona_actualiza", "fondo", "area", "anio", "trimestre",
    "codigo_sui", "nombre_prestador", "estado_validacion", "justificacion", "radicado",
    "fecha_radicado", "observaciones", "estado_validacion_organizado", "cod_general",
  ];
  return `md5(ROW(${columnas.map((c) => `${alias}.${c}`).join(", ")})::text)`;
}

/**
 * Pagos sin las filas que el Excel trae repetidas.
 *
 * Mismo defecto que en validaciones y con más consecuencia, porque aquí hay
 * dinero: 95 de las 13.835 filas son idénticas en sus 26 columnas de negocio
 * —misma resolución, mismo valor, mismo giro, misma observación— y sumarlas
 * dos veces inflaba el valor pagado en 29.577 millones.
 *
 * Se descarta al leer y no al cargar: la tabla conserva lo que vino en el
 * Excel. Un `SUM` no sabe de repetidas, así que no basta con contar distintos:
 * hay que quedarse con una fila por huella antes de sumar.
 *
 * `id` y `fecha_importacion` quedan fuera de la huella porque son técnicas y
 * siempre difieren.
 */
export function pagosUnicosSql(): string {
  const columnas = [
    "fecha_actualizacion", "persona_actualiza", "fondo", "area", "anio", "trimestre",
    "concepto_trimestre", "codigo_sui", "nombre_prestador", "estado_resolucion",
    "no_resolucion", "fecha_resolucion", "valor_resolucion", "link_resolucion", "tipo_giro",
    "distribuidor_mayorista", "estado_pago", "tipo_pago", "valor_pagado", "pct_pagado",
    "saldo_pendiente", "observacion", "cod_general", "anio_trimestre_resolucion",
    "valor_disponible", "valor_disponible_2",
  ];
  const huella = `md5(ROW(${columnas.map((c) => `p.${c}`).join(", ")})::text)`;
  return `SELECT DISTINCT ON (${huella}) p.*
    FROM subsidios.subsidios_pagos p`;
}

/** La misma lectura como CTE, para las consultas que ya abren con `WITH`. */
export function pagosUnicosCte(nombre = "pagos_unicos"): string {
  return `${nombre} AS (${pagosUnicosSql()})`;
}

/** Conteo de validaciones que no cuenta dos veces una fila repetida. */
export function conteoValidacionesSql(alias: string): string {
  return `COUNT(DISTINCT ${huellaValidacionSql(alias)})`;
}

/**
 * Cortes disponibles: cada mes con la fecha de su última carga.
 *
 * `fecha_actualizacion` no es una marca de importación —eso es
 * `fecha_importacion`—, es la fecha en que el área tocó cada registro, y **cada
 * mes trae dos cargas**, a mitad y a fin de mes. Las dos son snapshots
 * completos: octubre de 2026 tiene 3.642 filas con fecha del día 13 y 3.647 con
 * fecha del 26, ambas con las mismas 178 empresas y los mismos periodos
 * 2014-2026.
 *
 * Restringir el corte al mes sumaba las dos cargas y duplicaba todos los
 * conteos por estado: VI salía 3.068 cuando el snapshot tiene 1.536. De ahí que
 * el mes se resuelva a la fecha de su última carga.
 */
export function consultaCortes(): string {
  return `
    SELECT EXTRACT(YEAR FROM fecha_actualizacion)::int  AS anio,
           EXTRACT(MONTH FROM fecha_actualizacion)::int AS mes,
           MAX(fecha_actualizacion)::date               AS carga
    FROM subsidios.subsidios_validaciones
    WHERE fecha_actualizacion IS NOT NULL
    GROUP BY 1, 2
    ORDER BY anio DESC, mes DESC`;
}

/**
 * Restricción a una sola carga de validaciones.
 *
 * Se compara contra un rango de un día en vez de `fecha_actualizacion::date =`
 * para no envolver la columna en una función.
 */
export function corteWhereSql(alias: string, param: string): string {
  return `${alias}.fecha_actualizacion >= ${param}::date
      AND ${alias}.fecha_actualizacion < ${param}::date + 1`;
}

/** Clave `YYYY-MM` con la que viaja un corte entre el tablero y el endpoint. */
export function claveCorte(c: { anio: number; mes: number }): string {
  return `${c.anio}-${String(c.mes).padStart(2, "0")}`;
}

/**
 * Área normalizada: las filas de FOES llegan con `area` nula o 'NA' y
 * corresponden al SIN. Mismo criterio que ya aplica el tablero de Validaciones.
 */
export function areaSql(alias: string): string {
  return `CASE
    WHEN (${alias}.area = 'NA' OR ${alias}.area IS NULL) AND ${alias}.fondo = 'FOES' THEN 'SIN'
    ELSE ${alias}.area
  END`;
}

/**
 * Año y trimestre de una fila de pagos.
 *
 * No se usa la columna `trimestre` de `subsidios_pagos`: viene nula en el 34 %
 * de las filas. `anio_trimestre_resolucion` sí está completa y con formato
 * `YYYY/TN` en el 100 % de los registros.
 */
export function anioPagosSql(alias: string): string {
  return `LEFT(${alias}.anio_trimestre_resolucion, 4)::int`;
}

export function trimestrePagosSql(alias: string): string {
  return `RIGHT(${alias}.anio_trimestre_resolucion, 1)::int`;
}

/**
 * Identidad de una resolución, para `COUNT(DISTINCT ...)`.
 *
 * El número solo no basta: se repite entre años (la resolución 1463 aparece
 * en ocho años distintos, de 2017 a 2024). Contando solo el número salen 586
 * resoluciones cuando hay 610.
 *
 * El año que identifica es el de la propia resolución, no el del pago: por el
 * año de pago salen 781 porque una resolución se paga a lo largo de varios
 * años. Que `anio_trimestre_resolucion` y `fecha_resolucion` den exactamente
 * el mismo conteo (610) confirma cuál es el correcto.
 */
export function resolucionDistintaSql(alias: string): string {
  return `(${alias}.no_resolucion, LEFT(${alias}.anio_trimestre_resolucion, 4))`;
}

/** Etiqueta de periodo para el eje de las gráficas: «2026 T1». */
export function periodoLabel(anio: number, trimestre: number): string {
  return `${anio} T${trimestre}`;
}

/* ─── Período como un solo número ──────────────────────────────────────────
 * El deslizador de período necesita un eje entero y continuo, igual que el del
 * tablero de balance oferta-demanda, que se mueve sobre días y traduce a fecha
 * con `formatValue`. Aquí la unidad es el trimestre.
 */

/** Trimestres transcurridos desde el año 0: el eje del deslizador. */
export function indiceTrimestre(anio: number, trimestre: number): number {
  return anio * 4 + (trimestre - 1);
}

/** Inverso de `indiceTrimestre`. */
export function periodoDesdeIndice(indice: number): { anio: number; trimestre: number } {
  return { anio: Math.floor(indice / 4), trimestre: (indice % 4) + 1 };
}

/**
 * Restricción de rango sobre `anio`/`trimestre` de validaciones.
 *
 * Es una comparación por filas y no `anio * 4 + trimestre BETWEEN …` para que
 * pueda usar `idx_sv_anio_trim`: envolver las columnas en aritmética deja el
 * índice fuera de juego.
 */
export function rangoPeriodoSql(
  alias: string,
  [anioDesde, trimDesde, anioHasta, trimHasta]: [string, string, string, string]
): string {
  return `(${alias}.anio, ${alias}.trimestre) >= (${anioDesde}::int, ${trimDesde}::int)
      AND (${alias}.anio, ${alias}.trimestre) <= (${anioHasta}::int, ${trimHasta}::int)`;
}

/**
 * El mismo rango sobre pagos, donde el período es texto `YYYY/TN`.
 *
 * Ese formato ordena igual como texto que como fecha, así que un `BETWEEN`
 * alfabético es correcto y aprovecha `idx_sp_anio_trim_resol`.
 */
export function rangoPeriodoPagosSql(alias: string, desde: string, hasta: string): string {
  return `${alias}.anio_trimestre_resolucion BETWEEN ${desde} AND ${hasta}`;
}

/** Clave de período `YYYY/TN`, la que guarda `anio_trimestre_resolucion`. */
export function clavePeriodoPagos(anio: number, trimestre: number): string {
  return `${anio}/T${trimestre}`;
}

/**
 * Porcentaje de ejecución de un monto pagado sobre el asignado.
 *
 * No se acota a 100: en la fuente hay resoluciones con `pct_pagado` de hasta
 * 1,34, es decir pagos por encima del valor de la resolución. Recortarlo
 * escondería un dato que el área debe poder ver.
 */
export function pctEjecucion(valorPagado: number, valorResolucion: number): number {
  if (!valorResolucion) return 0;
  return (valorPagado / valorResolucion) * 100;
}
