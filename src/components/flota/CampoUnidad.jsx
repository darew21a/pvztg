/**
 * Campo de datos de la unidad dentro del Expediente. Reutilizable para
 * evitar repetir el mismo bloque de label+input por cada uno de los ~14
 * campos que trae el Excel de origen más los nuevos (kilometraje, etc.).
 *
 * @param {Object} props
 * @param {string} props.label
 * @param {string} props.name        Debe coincidir con la llave del objeto unidad.
 * @param {string | number | null} props.value
 * @param {(name: string, value: string) => void} props.onChange
 * @param {string} [props.type]      "text" | "number" - por defecto "text".
 */
function CampoUnidad({ label, name, value, onChange, type = "text", duplicado = false, detalleDuplicado = "", incompleto = false }) {
  const estiloAlerta = duplicado
    ? {
      contenedor: "border-error/70 bg-error-container/10",
      etiqueta: "text-error",
      input: "border-error/70",
    }
    : incompleto
      ? {
        contenedor: "border-tertiary/70 bg-tertiary-container/10",
        etiqueta: "text-tertiary",
        input: "border-tertiary/70",
      }
      : null;
  return (
    <div className={`space-y-1 rounded-md ${estiloAlerta ? `border ${estiloAlerta.contenedor} p-2` : ""}`}>
      <label className={`block font-label-sm text-label-sm uppercase tracking-wide ${estiloAlerta ? `font-bold ${estiloAlerta.etiqueta}` : "text-on-surface-variant"}`} htmlFor={`campo-${name}`}>
        {label}
      </label>
      {duplicado && <p className="text-xs font-medium text-error">Dato duplicado{detalleDuplicado ? `: ${detalleDuplicado}` : ""}</p>}
      {incompleto && <p className="text-xs font-medium text-tertiary">Dato faltante o sin lectura válida.</p>}
      <input
        id={`campo-${name}`}
        type={type}
        value={value ?? ""}
        placeholder="Sin capturar"
        onChange={(event) => onChange(name, event.target.value)}
        className={`w-full px-3 py-2 rounded-md border bg-surface-bright text-on-surface font-body-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors ${estiloAlerta?.input ?? "border-outline-variant"}`}
      />
    </div>
  );
}

export default CampoUnidad;
