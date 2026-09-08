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
 * @param {string} [props.type]      "text" | "number" — por defecto "text".
 */
function CampoUnidad({ label, name, value, onChange, type = "text" }) {
  return (
    <div className="space-y-1">
      <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide" htmlFor={`campo-${name}`}>
        {label}
      </label>
      <input
        id={`campo-${name}`}
        type={type}
        value={value ?? ""}
        placeholder="Sin capturar"
        onChange={(event) => onChange(name, event.target.value)}
        className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-on-surface font-body-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
      />
    </div>
  );
}

export default CampoUnidad;
