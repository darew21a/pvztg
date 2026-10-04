import { CLASES_COLOR_UNIDAD } from "../../utils/colorUnidad.js";

function AlertaUnidadEtiqueta({ categoria, children, title }) {
  const estilo = CLASES_COLOR_UNIDAD[categoria] ?? CLASES_COLOR_UNIDAD.ok;
  const etiqueta = children ?? estilo.etiqueta;

  return (
    <span
      className={`unidad-alerta-etiqueta unidad-alerta-etiqueta--${categoria}`}
      title={title ?? (typeof etiqueta === "string" ? etiqueta : estilo.etiqueta)}
    >
      <span className="unidad-alerta-etiqueta__texto">{etiqueta}</span>
    </span>
  );
}

export default AlertaUnidadEtiqueta;
