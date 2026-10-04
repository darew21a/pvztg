import readXlsxFile from "read-excel-file/browser";

function normalizarEncabezado(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

export function buscarIndicePlacasVigentes(encabezados, anioActual = new Date().getFullYear()) {
  const normalizados = encabezados.map(normalizarEncabezado);
  const candidatosAnioActual = [
    `PLACAS ${anioActual}`,
    `PLACAS VIGENTES ${anioActual}`,
    `PLACAS ${anioActual} VIGENTES`,
    `PLACAS VIGENTES ${anioActual} AÑO ACTUAL`,
    `PLACAS VIGENTES AÑO ACTUAL ${anioActual}`,
  ];
  const coincidenciaExacta = candidatosAnioActual
    .map((candidato) => normalizados.indexOf(normalizarEncabezado(candidato)))
    .find((indice) => indice !== -1);
  if (coincidenciaExacta !== undefined) return coincidenciaExacta;

  const coincidenciaAnioActual = normalizados.findIndex((encabezado) =>
    encabezado.startsWith("PLACAS ") && new RegExp(`\\b${anioActual}\\b`).test(encabezado),
  );
  if (coincidenciaAnioActual !== -1) return coincidenciaAnioActual;

  return normalizados.findIndex((encabezado) =>
    encabezado === "PLACAS VIGENTES"
      || encabezado === "PLACAS VIGENTES ANO ACTUAL"
      || encabezado === "PLACAS ANO ACTUAL",
  );
}

export function prepararCambiosPlacasVigentes(cambios, anioFuente, confirmarComoActual, anioActual = new Date().getFullYear()) {
  const resultado = { ...cambios };
  if (anioFuente == null) return resultado;
  if (confirmarComoActual) {
    resultado.placasVigentesAnio = anioActual;
  } else {
    delete resultado.placas2025;
    delete resultado.placasVigentesAnio;
  }
  return resultado;
}

function buscarColumnaPlacas(encabezados, anioActual) {
  const indiceActual = buscarIndicePlacasVigentes(encabezados, anioActual);
  if (indiceActual !== -1) {
    return {
      indice: indiceActual,
      anio: anioActual,
      encabezado: normalizarTexto(encabezados[indiceActual]),
      requiereConfirmacion: false,
    };
  }

  const opcionesHistoricas = encabezados
    .map((encabezado, indice) => {
      const normalizado = normalizarEncabezado(encabezado);
      const coincidencia = normalizado.match(/^PLACAS(?: VIGENTES)?\s+((?:19|20)\d{2})(?:\s|$)/);
      return coincidencia
        ? { indice, anio: Number(coincidencia[1]), encabezado: normalizarTexto(encabezado) }
        : null;
    })
    .filter((opcion) => opcion && opcion.anio < anioActual)
    .sort((a, b) => b.anio - a.anio);
  const historica = opcionesHistoricas[0];
  return historica
    ? { ...historica, requiereConfirmacion: true }
    : { indice: -1, anio: null, encabezado: "", requiereConfirmacion: false };
}

function normalizarTexto(valor) {
  if (valor === null || valor === undefined) return "";
  return String(valor).trim();
}

function valorCelda(fila, indice) {
  return indice === undefined ? "" : normalizarTexto(fila[indice]);
}

function esFilaVacia(fila) {
  return !fila.some((valor) => valor !== null && valor !== undefined && String(valor).trim() !== "");
}

export function buscarHojaOficialConEncabezados(libro) {
  const hoja = libro.find(({ sheet }) => normalizarEncabezado(sheet) === "RECEPCION DE VEHICULOS");
  if (!hoja) {
    const disponibles = libro.map(({ sheet }) => sheet).join(", ");
    throw new Error(
      `No se encontró la hoja oficial "RECEPCION DE VEHICULOS". Hojas disponibles: ${disponibles || "ninguna"}.`,
    );
  }

  const indice = hoja.data.findIndex((fila) => {
    const encabezados = fila.map(normalizarEncabezado);
    return encabezados.includes("ECONOMICO") && encabezados.includes("NO. SERIE");
  });
  if (indice === -1) {
    throw new Error(`La hoja oficial "${hoja.sheet}" no contiene los encabezados ECONOMICO y NO. SERIE.`);
  }

  return { filas: hoja.data, indice, nombre: hoja.sheet };
}

export function leerFilasHojaOficial(hoja, resolverDepartamento = () => null) {
  const { filas, indice: indiceEncabezado, nombre: nombreHoja } = hoja;
  const encabezados = filas[indiceEncabezado].map(normalizarEncabezado);
  const indiceDe = (nombre) => encabezados.findIndex((encabezado) => encabezado === nombre);
  const indiceResguardante = indiceDe("NOMBRE RESGUARDANTE") !== -1 ? indiceDe("NOMBRE RESGUARDANTE") : indiceDe("NOMBRE RESGUARDANTE SAP");
  const indiceResguardante2 = ["NOMBRE RESGUARDANTE 2", "RESGUARDANTE 2", "NOMBRE RESGUARDANTE DOS"]
    .map(indiceDe)
    .find((indice) => indice !== -1) ?? -1;
  const anioActual = new Date().getFullYear();
  const columnaPlacasVigentes = buscarColumnaPlacas(encabezados, anioActual);
  const indices = {
    economico: indiceDe("ECONOMICO"),
    jefatura: ["JEFATURA", "DEPARTAMENTO", "AREA", "NOMBRE JEFATURA", "NOMBRE DE LA JEFATURA", "UNIDAD RESPONSABLE"]
      .map(indiceDe)
      .find((indice) => indice !== -1),
    marca: indiceDe("MARCA"),
    submarca: indiceDe("SUBMARCA"),
    cilindros: indiceDe("CILINDROS"),
    tipo: indiceDe("TIPO"),
    modelo: indiceDe("MODELO"),
    numeroSerie: indiceDe("NO. SERIE"),
    placas: indiceDe("PLACAS"),
    placas2025: columnaPlacasVigentes.indice,
    centroGestor: indiceDe("CENTRO GESTOR"),
    centroCostos: indiceDe("CENTRO DE COSTOS"),
    ubicacionTecnica: indiceDe("UBICACION TECNICA"),
    rpeResguardante: indiceDe("R.P.E RESGUARDANTE"),
    resguardante2: indiceResguardante2,
    arrendadora: indiceDe("ARRENDADORA"),
    conductorAsignado: indiceResguardante,
    tarjetaEdenred: indiceDe("NO. TARJETA EDENRED"),
    nip: indiceDe("NIP"),
  };

  const filasVehiculares = [];
  const indicePlacasVigentes = columnaPlacasVigentes.indice;
  let filasInvalidas = 0;
  let jefaturaActual = "";

  for (const fila of filas.slice(0, indiceEncabezado).reverse()) {
    const celdasConDatos = fila.filter((valor) => normalizarTexto(valor));
    if (celdasConDatos.length === 1 && resolverDepartamento(celdasConDatos[0])) {
      jefaturaActual = normalizarTexto(celdasConDatos[0]);
      break;
    }
  }

  let filasVaciasConsecutivas = 0;
  for (const [offset, fila] of filas.slice(indiceEncabezado + 1).entries()) {
    const filaExcel = indiceEncabezado + offset + 2;
    if (esFilaVacia(fila)) {
      filasVaciasConsecutivas += 1;
      if (filasVaciasConsecutivas === 2 && filasVehiculares.length > 0) break;
      continue;
    }
    filasVaciasConsecutivas = 0;

    const economico = valorCelda(fila, indices.economico);
    const jefaturaDeFila = valorCelda(fila, indices.jefatura);
    const tieneDatosVehiculo = Object.entries(indices)
      .some(([campo, indice]) => campo !== "economico" && campo !== "jefatura" && valorCelda(fila, indice));
    const textoEconomico = normalizarEncabezado(economico);

    if (textoEconomico === "ECONOMICO") continue;

    const celdasConDatos = fila.filter((valor) => normalizarTexto(valor));
    if (celdasConDatos.length === 1 && resolverDepartamento(celdasConDatos[0])) {
      jefaturaActual = normalizarTexto(celdasConDatos[0]);
      continue;
    }

    if (economico && !tieneDatosVehiculo && !/^\d[\d\s/-]*$/.test(economico)) {
      jefaturaActual = economico;
      continue;
    }

    if (!economico && !valorCelda(fila, indices.numeroSerie)) {
      if (tieneDatosVehiculo) filasInvalidas += 1;
      continue;
    }

    if (!tieneDatosVehiculo && !valorCelda(fila, indices.numeroSerie)) {
      filasInvalidas += 1;
      continue;
    }

    const cambios = {};
    Object.entries(indices).forEach(([campo, indice]) => {
      if (campo === "economico" || campo === "jefatura" || indice === -1) return;
      const valor = valorCelda(fila, indice);
      if (valor) cambios[campo] = valor;
    });
    if (indicePlacasVigentes !== -1) {
      cambios.placas2025 = valorCelda(fila, indicePlacasVigentes) || null;
    }
    cambios.placasVigentesAnio = indicePlacasVigentes === -1 ? null : anioActual;
    filasVehiculares.push({
      filaExcel,
      economico,
      jefatura: jefaturaDeFila || jefaturaActual,
      hoja: nombreHoja,
      anioPlacasVigentesFuente: columnaPlacasVigentes.requiereConfirmacion ? columnaPlacasVigentes.anio : null,
      cambios,
    });
  }

  return {
    nombreHoja,
    filas: filasVehiculares,
    filasInvalidas,
    placasVigentesFuente: {
      anio: columnaPlacasVigentes.anio,
      encabezado: columnaPlacasVigentes.encabezado,
      requiereConfirmacion: columnaPlacasVigentes.requiereConfirmacion,
      valoresCapturados: filasVehiculares.filter((fila) => String(fila.cambios.placas2025 ?? "").trim()).length,
    },
  };
}

/**
 * Lee la relación de parque vehicular y conserva el nombre de la Jefatura
 * que encabeza cada bloque del libro.
 */
export async function leerArchivoParqueVehicular(archivo, resolverDepartamento = () => null) {
  const buffer = await archivo.arrayBuffer();
  const libro = await readXlsxFile(buffer);
  const hoja = buscarHojaOficialConEncabezados(libro);
  return leerFilasHojaOficial(hoja, resolverDepartamento);
}

function claveIdentificador(valor) {
  return normalizarTexto(valor).toUpperCase().replace(/\s+/g, "");
}

function clavePrimaria(valor) {
  return claveIdentificador(valor);
}

/**
 * Genera una vista previa sin modificar el store.
 */
export function analizarParqueVehicular(datos, unidades, resolverDepartamento) {
  const indices = new Map([["economico", new Map()], ["numeroSerie", new Map()]]);
  unidades.forEach((unidad) => {
    ["numeroSerie", "economico"].forEach((campo) => {
      const clave = clavePrimaria(unidad[campo]);
      if (clave) {
        const encontrados = indices.get(campo).get(clave) ?? [];
        encontrados.push(unidad);
        indices.get(campo).set(clave, encontrados);
      }
    });
  });

  const conflictos = [];
  const noEncontrados = [];
  const actualizaciones = [];
  const jefaturasNoEncontradas = [];
  const huellasFilas = new Set();
  const economicosVistos = new Map();
  const filasExactamenteDuplicadas = [];

  datos.filas.forEach((fila) => {
    const departamento = resolverDepartamento(fila.jefatura);
    if (!departamento) {
      jefaturasNoEncontradas.push({
        filaExcel: fila.filaExcel,
        economico: fila.economico,
        jefatura: fila.jefatura,
      });
    }

    const huella = JSON.stringify({
      economico: clavePrimaria(fila.economico),
      jefatura: clavePrimaria(fila.jefatura),
      cambios: Object.fromEntries(Object.entries(fila.cambios).map(([campo, valor]) => [campo, clavePrimaria(valor)])),
    });
    if (huellasFilas.has(huella)) {
      filasExactamenteDuplicadas.push({
        ...fila,
        motivo: "La fila repite exactamente los mismos datos de otra fila del archivo.",
      });
      return;
    }

    huellasFilas.add(huella);
    const economico = clavePrimaria(fila.economico);
    if (economico && economicosVistos.has(economico)) {
      conflictos.push({
        ...fila,
        motivo: `El número económico ya aparece en la fila ${economicosVistos.get(economico)} del archivo; como es el identificador principal, esta fila requiere revisión.`,
      });
      return;
    }
    if (economico) economicosVistos.set(economico, fila.filaExcel);

    const coincidenciasEconomico = economico ? indices.get("economico").get(economico) ?? [] : [];
    const serie = clavePrimaria(fila.cambios.numeroSerie);
    const coincidenciasSerie = serie ? indices.get("numeroSerie").get(serie) ?? [] : [];
    if (coincidenciasEconomico.length > 1) {
      conflictos.push({
        ...fila,
        motivo: "El número económico coincide con más de una unidad ya registrada; no es seguro elegir cuál actualizar.",
      });
      return;
    }
    if (coincidenciasSerie.length > 1 && coincidenciasEconomico.length === 0) {
      conflictos.push({
        ...fila,
        motivo: "El número de serie coincide con más de una unidad y no hay un número económico coincidente para identificar el registro.",
      });
      return;
    }

    const unidad = coincidenciasEconomico[0] ?? coincidenciasSerie[0];
    if (!unidad) {
      noEncontrados.push(fila);
      return;
    }

    const cambiosPropuestos = {
      economico: fila.economico,
      ...fila.cambios,
      ...(departamento ? { departamentoId: departamento } : {}),
    };
    const cambios = Object.fromEntries(Object.entries(cambiosPropuestos).filter(([campo, valor]) => {
      const campoUnidad = {
        numeroSerie: "numeroSerie",
        placas2025: "placas2025",
        placasVigentesAnio: "placasVigentesAnio",
        departamentoId: "departamentoId",
      }[campo] ?? campo;
      const anterior = unidad[campoUnidad];
      return String(anterior ?? "").trim() !== String(valor ?? "").trim();
    }));
    if (Object.keys(cambios).length === 0) return;
    actualizaciones.push({
      unidad,
      economico: fila.economico,
      filaExcel: fila.filaExcel,
      cambios,
      jefatura: fila.jefatura,
      anioPlacasVigentesFuente: fila.anioPlacasVigentesFuente ?? null,
    });
  });

  return {
    hoja: datos.nombreHoja,
    filasDetectadas: datos.filas.length,
    placasVigentesFuente: datos.placasVigentesFuente ?? null,
    actualizaciones,
    duplicados: filasExactamenteDuplicadas,
    conflictos,
    noEncontrados,
    altasValidas: noEncontrados.filter((fila) => String(fila.cambios.numeroSerie ?? "").trim()),
    altasSinNumeroSerie: noEncontrados.filter((fila) => !String(fila.cambios.numeroSerie ?? "").trim()),
    filasInvalidas: datos.filasInvalidas,
    jefaturasNoEncontradas,
  };
}
