export const CLASES_COLOR_UNIDAD = {
  duplicados: {
    fila: "bg-blue-50 border-l-4 border-l-blue-600",
    texto: "text-blue-950",
    badge: "border border-blue-300 bg-blue-100 text-blue-950",
    resalte: "ring-1 ring-inset ring-blue-500",
    color: "#2563eb",
    etiqueta: "Datos duplicados",
  },
  datos: {
    fila: "bg-yellow-50 border-l-4 border-l-yellow-600",
    texto: "text-yellow-950",
    badge: "border border-yellow-300 bg-yellow-100 text-yellow-950",
    resalte: "ring-1 ring-inset ring-yellow-500",
    color: "#eab308",
    etiqueta: "Unidades por completar",
  },
  transacciones: {
    fila: "bg-purple-50 border-l-4 border-l-purple-500",
    texto: "text-purple-950",
    badge: "border border-purple-300 bg-purple-100 text-purple-950",
    resalte: "ring-1 ring-inset ring-purple-400",
    color: "#9333ea",
    etiqueta: "Cifras atípicas",
  },
  edenred: {
    fila: "bg-pink-50 border-l-4 border-l-pink-600",
    texto: "text-pink-950",
    badge: "border border-pink-300 bg-pink-100 text-pink-950",
    resalte: "ring-1 ring-inset ring-pink-500",
    color: "#db2777",
    etiqueta: "Alertas Edenred",
  },
  reporte: {
    fila: "bg-orange-50 border-l-4 border-l-orange-600",
    texto: "text-orange-950",
    badge: "border border-orange-300 bg-orange-100 text-orange-950",
    resalte: "ring-1 ring-inset ring-orange-500",
    color: "#ea580c",
    etiqueta: "Reporte activo",
  },
  ok: {
    fila: "bg-white",
    texto: "text-slate-700",
    badge: "border border-slate-300 bg-white text-slate-700",
    resalte: "",
    color: "#64748b",
    etiqueta: "Sin alertas",
  },
};

export const CLASES_ESTADO_UNIDAD = {
  "en-ruta": {
    texto: "border border-sky-800 bg-sky-800 text-white",
    punto: "bg-sky-600",
  },
  "en-estacion": {
    texto: "border border-green-800 bg-green-800 text-white",
    punto: "bg-green-600",
  },
  taller: {
    texto: "border border-amber-800 bg-amber-800 text-white",
    punto: "bg-amber-600",
  },
  baja: {
    texto: "border border-rose-800 bg-rose-800 text-white",
    punto: "bg-rose-600",
  },
  "sin-estado": {
    texto: "border border-slate-700 bg-slate-700 text-white",
    punto: "bg-slate-600",
  },
};

const PRIORIDAD_CATEGORIA = ["duplicados", "datos", "transacciones", "edenred"];
export const CATEGORIAS_COLOR_UNIDAD = [
  "duplicados",
  "datos",
  "transacciones",
  "edenred",
  "reporte",
  "ok",
];

export function evaluarColorUnidad(unidad, _todasLasUnidades, reportes, anomalias = []) {
  const casosUnidad = anomalias.filter((anomalia) =>
    (anomalia.unidadIds ?? []).some((id) => String(id) === String(unidad.id)),
  );
  const categorias = new Set(casosUnidad.map((anomalia) => anomalia.categoria));
  const tieneReporteActivo = reportes.some((reporte) =>
    reporte.estado !== "resuelto"
      && (reporte.unidadesIds ?? []).some((id) => String(id) === String(unidad.id)),
  );
  const alertas = [
    ...PRIORIDAD_CATEGORIA.filter((categoria) => categorias.has(categoria)),
    ...(tieneReporteActivo ? ["reporte"] : []),
  ];
  const razones = [
    ...alertas.map((categoria) => CLASES_COLOR_UNIDAD[categoria].etiqueta),
  ];

  const color = alertas[0] ?? "ok";

  return { color, razones, alertas: alertas.length > 0 ? alertas : ["ok"] };
}

export function obtenerClasesFilaUnidad(unidad, reportes, anomalias) {
  const { alertas } = evaluarColorUnidad(unidad, [], reportes, anomalias);
  const categorias = alertas.filter((categoria) => categoria !== "ok");
  return [
    "fleet-unit-row",
    ...(categorias.length ? ["fleet-unit-row--has-alerts"] : []),
    ...categorias.map((categoria) => `fleet-unit-row--alert-${categoria}`),
  ].join(" ");
}

export function obtenerGradienteFilaAlertas(alertas) {
  const categorias = [...new Set((alertas ?? []).filter((categoria) =>
    categoria !== "ok" && CLASES_COLOR_UNIDAD[categoria]?.color,
  ))];
  if (categorias.length === 0) return "none";

  const tintes = categorias.map((categoria) =>
    `color-mix(in srgb, ${CLASES_COLOR_UNIDAD[categoria].color} 48%, #ffffff)`,
  );
  if (tintes.length === 1) {
    const tonoSuave = `color-mix(in srgb, ${CLASES_COLOR_UNIDAD[categorias[0]].color} 38%, #ffffff)`;
    return `linear-gradient(110deg, ${tintes[0]} 0%, ${tonoSuave} 50%, ${tintes[0]} 100%)`;
  }

  const stops = tintes.map((tinte, index) =>
    `${tinte} ${(index / (tintes.length - 1)) * 100}%`,
  );
  return `linear-gradient(110deg, ${stops.join(", ")})`;
}
