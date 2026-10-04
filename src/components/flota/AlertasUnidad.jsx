import { CLASES_COLOR_UNIDAD } from "../../utils/colorUnidad.js";
import AlertaUnidadEtiqueta from "./AlertaUnidadEtiqueta.jsx";

function AlertasUnidad({ alertas, etiquetasPersonalizadas = {}, razones = [] }) {
  const descripcion = alertas
    .map((categoria) => etiquetasPersonalizadas[categoria] ?? CLASES_COLOR_UNIDAD[categoria].etiqueta)
    .join(" · ");
  const titulo = [...razones, descripcion].filter(Boolean).join(" · ");

  if (alertas.length <= 1) {
    const categoria = alertas[0] ?? "ok";
    return (
      <AlertaUnidadEtiqueta categoria={categoria} title={titulo}>
        {etiquetasPersonalizadas[categoria] ?? CLASES_COLOR_UNIDAD[categoria].etiqueta}
      </AlertaUnidadEtiqueta>
    );
  }

  return (
    <span
      className="unidad-alertas-puntos"
      role="img"
      aria-label={descripcion}
      title={titulo}
    >
      {alertas.map((categoria) => (
        <span
          key={categoria}
          className={`unidad-alertas-puntos__punto unidad-alerta-etiqueta--${categoria}`}
          aria-hidden="true"
        />
      ))}
    </span>
  );
}

export default AlertasUnidad;
