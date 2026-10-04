function EstadoUnidadEtiqueta({ estado, children }) {
  const estadoValido = ["en-ruta", "en-estacion", "taller", "baja"].includes(estado)
    ? estado
    : "sin-estado";

  return (
    <span className={`unidad-estado-etiqueta unidad-estado-etiqueta--${estadoValido}`}>
      <span className="unidad-estado-etiqueta__franjas" aria-hidden="true" />
      <span className="unidad-estado-etiqueta__punto" aria-hidden="true" />
      <span className="unidad-estado-etiqueta__texto">{children}</span>
    </span>
  );
}

export default EstadoUnidadEtiqueta;
