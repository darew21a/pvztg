import { formatearFecha } from "../src/utils/formatearFecha.js";

const RULE_VERSION = 8;
export const MULTIPLICADOR_TOLERANCIA_CAPACIDAD = 1.1;

const CAMPOS_REQUERIDOS = [
  { campo: "Estado de la unidad", campoUnidad: "estado" },
  { campo: "Kilometraje", campoUnidad: "kilometraje" },
  { campo: "Tipo de combustible", campoUnidad: "tipoCombustible" },
  { campo: "Departamento", campoUnidad: "departamentoId" },
  { campo: "Número económico", campoUnidad: "economico" },
  { campo: "Resguardante", campoUnidad: "conductorAsignado" },
  { campo: "Resguardante 2", campoUnidad: "resguardante2" },
  { campo: "Marca", campoUnidad: "marca" },
  { campo: "Submarca", campoUnidad: "submarca" },
  { campo: "Tipo", campoUnidad: "tipo" },
  { campo: "Modelo (año)", campoUnidad: "modelo" },
  { campo: "Placas", campoUnidad: "placas" },
  { campo: "placas vigentes", campoUnidad: "placas2025" },
  { campo: "No. de serie (VIN)", campoUnidad: "numeroSerie" },
  { campo: "R.P.E. resguardante", campoUnidad: "rpeResguardante" },
  { campo: "Centro gestor", campoUnidad: "centroGestor" },
  { campo: "Centro de costos", campoUnidad: "centroCostos" },
  { campo: "Ubicación técnica", campoUnidad: "ubicacionTecnica" },
  { campo: "Arrendadora", campoUnidad: "arrendadora" },
];
const MARCADORES_VACIOS = new Set(["", "BLANCA", "S/E", "S/P", "N/A", "N/D", "SIN DATO", "PENDIENTE", "-"]);

function normalizar(valor) {
  return String(valor ?? "").trim().toUpperCase().replace(/\s+/g, " ");
}

function esValorValido(valor) {
  const texto = normalizar(valor);
  return !MARCADORES_VACIOS.has(texto);
}

function normalizarSeriePlaca(valor) {
  const texto = normalizar(valor)
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\b(?:VENCE(?:\s+EN)?(?:\s+(?:EL\s+)?ANO)?|VIGENTE\s+HASTA|HASTA)\s+(?:19|20)\d{2}\b/g, " ");
  const coincidencias = texto.match(
    /(?<![A-Z0-9])(?:(?:[A-Z][\s./-]*){1,4}(?:\d[\s./-]*){2,5}(?:[A-Z][\s./-]*){0,3}|(?:\d[\s./-]*){2,5}(?:[A-Z][\s./-]*){1,4}(?:\d[\s./-]*){0,3})(?![A-Z0-9])/g,
  ) ?? [];
  return coincidencias
    .map((coincidencia) => coincidencia.replace(/[^A-Z0-9]/g, ""))
    .filter((coincidencia) => coincidencia.length >= 5 && coincidencia.length <= 8)
    .sort((a, b) => b.length - a.length)[0] ?? "";
}

export function normalizarVin(valor) {
  return normalizar(valor).replace(/[^A-Z0-9]/g, "");
}

function campoRequeridoIncompleto(unidad, campoUnidad, anioActual) {
  const valor = unidad[campoUnidad];
  if (campoUnidad === "kilometraje") {
    const lectura = numero(valor);
    return !Number.isFinite(lectura) || lectura <= 0;
  }
  if (campoUnidad === "placas2025") {
    return Number(unidad.placasVigentesAnio) !== anioActual || !esValorValido(valor);
  }
  if (campoUnidad === "resguardante2") {
    return unidad.requiereResguardante2 === true && !esValorValido(valor);
  }
  return campoUnidad === "departamentoId" ? valor == null || String(valor).trim() === "" : !esValorValido(valor);
}

function agruparPor(unidades, obtenerValor, normalizarClave = normalizar) {
  const grupos = new Map();
  unidades.forEach((unidad) => {
    const valor = obtenerValor(unidad);
    if (!esValorValido(valor)) return;
    const clave = normalizarClave(valor);
    if (!clave) return;
    const grupo = grupos.get(clave) ?? [];
    grupo.push(unidad);
    grupos.set(clave, grupo);
  });
  return grupos;
}

function numero(valor) {
  if (typeof valor === "number") return valor;
  const limpio = String(valor ?? "").replace(/[$,\s]/g, "");
  return limpio === "" ? NaN : Number(limpio);
}

function excedeCapacidadConTolerancia(detalle) {
  const coincidencia = String(detalle).match(/se cargaron\s+([\d,.]+)\s+L\s+y el tanque admite\s+([\d,.]+)\s+L/i);
  if (!coincidencia) return false;
  const litros = numero(coincidencia[1]);
  const capacidad = numero(coincidencia[2]);
  return Number.isFinite(litros)
    && Number.isFinite(capacidad)
    && capacidad > 0
    && litros > capacidad * MULTIPLICADOR_TOLERANCIA_CAPACIDAD;
}

function buscarUnidad(indices, transaccion) {
  const placa = normalizar(transaccion.Placa);
  const economico = normalizar(
    transaccion["Id Vehículo"]
      ?? transaccion["Id Vehiculo"]
      ?? transaccion["Número Económico"]
      ?? transaccion["Numero Economico"],
  );
  if (esValorValido(economico)) {
    const unidadesPorEconomico = indices.porEconomico.get(economico) ?? [];
    return unidadesPorEconomico.length === 1 ? unidadesPorEconomico[0] : null;
  }
  if (esValorValido(placa)) {
    const unidadesPorPlaca = indices.porPlaca.get(placa) ?? [];
    if (unidadesPorPlaca.length === 1) return unidadesPorPlaca[0];
  }
  return null;
}

function agregarAnomalia(anomalias, regla, datos) {
  anomalias.push({
    regla,
    versionRegla: RULE_VERSION,
    severidad: "media",
    ...datos,
  });
}

function idEstable(...partes) {
  return partes.map((parte) => encodeURIComponent(String(parte ?? ""))).join(":");
}

export function detectarAnomaliasFlota(unidades, cargasEdenred) {
  const anomalias = [];
  const anioActual = new Date().getFullYear();
  const etiquetaPlacasVigentes = `Placas vigentes ${anioActual}`;
  const unidadesActivas = (unidades ?? []).filter((unidad) => unidad.activo !== false && unidad.estado !== "baja");
  const indices = {
    porId: new Map(unidadesActivas.map((unidad) => [String(unidad.id), unidad])),
    porPlaca: new Map(),
    porEconomico: new Map(),
  };

  unidadesActivas.forEach((unidad) => {
    [unidad.placas, Number(unidad.placasVigentesAnio) === anioActual ? unidad.placas2025 : null].forEach((valor) => {
      const clave = normalizar(valor);
      if (!esValorValido(valor)) return;
      const unidadesPorPlaca = indices.porPlaca.get(clave) ?? [];
      if (!unidadesPorPlaca.some((coincidente) => String(coincidente.id) === String(unidad.id))) {
        unidadesPorPlaca.push(unidad);
        indices.porPlaca.set(clave, unidadesPorPlaca);
      }
    });
    const economico = normalizar(unidad.economico);
    if (esValorValido(unidad.economico)) {
      const unidadesPorEconomico = indices.porEconomico.get(economico) ?? [];
      unidadesPorEconomico.push(unidad);
      indices.porEconomico.set(economico, unidadesPorEconomico);
    }
  });

  unidadesActivas.forEach((unidad) => {
    CAMPOS_REQUERIDOS
      .filter(({ campoUnidad }) => campoRequeridoIncompleto(unidad, campoUnidad, anioActual))
      .forEach(({ campo, campoUnidad }) => {
        const etiquetaCampo = campoUnidad === "placas2025" ? etiquetaPlacasVigentes : campo;
        const identificador = unidad.economico || unidad.numeroSerie || `Unidad ${unidad.id}`;
        agregarAnomalia(anomalias, "unidad-dato-incompleto", {
          id: idEstable("unidad-dato-incompleto", unidad.id, campoUnidad),
          tipo: "dato-incompleto",
          categoria: "datos",
          titulo: `Falta ${etiquetaCampo}`,
          detalle: `${identificador}: falta capturar ${etiquetaCampo}.`,
          unidadIds: [unidad.id],
          camposIncompletos: [campoUnidad],
          campoUnidad,
          valorDuplicado: null,
          departamentoIds: unidad.departamentoId == null ? [] : [unidad.departamentoId],
          ruta: "/flota",
          parametro: "unidad",
          targetId: unidad.id,
          suggestion: `Captura ${etiquetaCampo} en el expediente de la unidad y guarda el cambio.`,
        });
      });
  });

  const grupos = [
    { campo: "Número económico", campoUnidad: "economico", obtener: (unidad) => unidad.economico, regla: "unidad-economico-duplicado", tipo: "economico-duplicado" },
    { campo: "Placas", campoUnidad: "placas", obtener: (unidad) => unidad.placas, regla: "unidad-placas-duplicadas", tipo: "placas-duplicadas", normalizarClave: (valor) => normalizar(valor).replace(/[^A-Z0-9]/g, "") },
    { campo: etiquetaPlacasVigentes, campoUnidad: "placas2025", obtener: (unidad) => unidad.placas2025, regla: "unidad-placas-vigentes-duplicadas", tipo: "placas-vigentes-duplicadas", normalizarClave: normalizarSeriePlaca, maximoUnidadesCompartidas: 2 },
    { campo: "No. de serie (VIN)", campoUnidad: "numeroSerie", obtener: (unidad) => unidad.numeroSerie, regla: "unidad-vin-duplicado", tipo: "vin-duplicado", normalizarClave: normalizarVin },
  ];

  grupos.forEach(({ campo, campoUnidad, obtener, regla, tipo, normalizarClave, maximoUnidadesCompartidas = 1 }) => {
    const unidadesConCampoVigente = campoUnidad === "placas2025"
      ? unidadesActivas.filter((unidad) => Number(unidad.placasVigentesAnio) === anioActual)
      : unidadesActivas;
    agruparPor(unidadesConCampoVigente, obtener, normalizarClave).forEach((duplicadas, valor) => {
      if (duplicadas.length <= maximoUnidadesCompartidas) return;
      const registrosDuplicados = duplicadas.map((unidad) => ({
        unidadId: unidad.id,
        identificador: `${unidad.economico ?? "Sin económico"} · ID ${unidad.id}`,
      }));
      agregarAnomalia(anomalias, regla, {
        id: idEstable(regla, campoUnidad, valor),
        tipo,
        categoria: "duplicados",
        severidad: "alta",
        titulo: `${campo} repetido`,
        detalle: `${campo}: “${valor}” está registrado en ${duplicadas.length} unidades.`,
        unidadIds: duplicadas.map((unidad) => unidad.id),
        registrosDuplicados,
        camposDuplicados: [campoUnidad],
        campo,
        campoUnidad,
        valorDuplicado: valor,
        departamentoIds: [...new Set(duplicadas.map((unidad) => unidad.departamentoId).filter((id) => id != null))],
        ruta: "/indice-unidades",
        parametro: "anomaly",
        targetId: duplicadas[0].id,
        suggestion: `Revisa los registros indicados y corrige el valor de ${campo.toLowerCase()} en la unidad que corresponda.`,
      });
    });
  });

  (cargasEdenred ?? []).forEach((carga) => {
    const unidadesConOdometroAtipico = new Set(
      (carga.resumenAplicado ?? [])
        .filter((registro) => (registro.anomalias ?? []).some((detalle) => String(detalle).startsWith("Odómetro:")))
        .map((registro) => String(registro.unidadId)),
    );
    (carga.resumenAplicado ?? []).forEach((registro) => {
      (registro.anomalias ?? []).forEach((detalle, indice) => {
        if (String(detalle).startsWith("Rendimiento:")) return;
        if (String(detalle).startsWith("Capacidad:") && !excedeCapacidadConTolerancia(detalle)) return;
        const unidad = indices.porId.get(String(registro.unidadId));
        agregarAnomalia(anomalias, "edenred-resumen-anomalo", {
          id: idEstable("edenred-resumen", carga.id, registro.unidadId, registro.mes, indice),
          tipo: "edenred-detectada",
          categoria: "edenred",
          severidad: "alta",
          titulo: "Anomalía de Edenred",
          detalle: `${unidad?.economico ?? "Unidad sin económico"} · ${registro.mes}: ${detalle}`,
          unidadIds: unidad ? [unidad.id] : [],
          departamentoIds: unidad?.departamentoId == null ? [] : [unidad.departamentoId],
          ruta: "/auditoria-edenred",
          parametro: "carga",
          targetId: carga.id,
          suggestion: "Revisa el registro del periodo y la conciliación con la unidad antes de resolver el caso.",
        });
      });
    });

    (carga.transacciones ?? []).forEach((transaccion, indice) => {
      if (transaccion["Estado Transacción"] !== "APROBADA") return;
      const litros = numero(transaccion["Cantidad Mercancía"]);
      const importe = numero(transaccion["Importe Transacción"] ?? transaccion["Importe Neto"]);
      const kilometraje = numero(transaccion["Km Transacción"]);
      const unidad = buscarUnidad(indices, transaccion);
      const fecha = transaccion["Fecha transacción"] ? formatearFecha(transaccion["Fecha transacción"]) : "sin fecha";
      const cifrasExtrañas = [];
      if (Number.isFinite(litros) && litros <= 0) cifrasExtrañas.push(`litros ${litros.toLocaleString("es-MX")}`);
      if (Number.isFinite(importe) && importe <= 0) cifrasExtrañas.push(`importe ${importe.toLocaleString("es-MX")}`);
      if (Number.isFinite(kilometraje)
        && kilometraje > 1000000
        && (!unidad || !unidadesConOdometroAtipico.has(String(unidad.id)))) {
        cifrasExtrañas.push(`kilometraje ${kilometraje.toLocaleString("es-MX")}`);
      }
      if (cifrasExtrañas.length === 0) return;
      agregarAnomalia(anomalias, "edenred-cifra-atipica", {
        id: idEstable("edenred-cifra", carga.id, indice),
        tipo: "transaccion-atipica",
        categoria: "transacciones",
        severidad: "alta",
        titulo: "Cifras atípicas en transacción",
        detalle: `${unidad?.economico ?? transaccion.Placa ?? "Unidad no identificada"} · ${fecha}: ${cifrasExtrañas.join(", ")}`,
        unidadIds: unidad ? [unidad.id] : [],
        departamentoIds: unidad?.departamentoId == null ? [] : [unidad.departamentoId],
        ruta: "/auditoria-edenred",
        parametro: "carga",
        targetId: carga.id,
        suggestion: "Contrasta litros, importe y kilometraje con el comprobante; documenta la decisión antes de cerrar el caso.",
      });
    });
  });

  return anomalias;
}
