/**
 * Selector de puesto para el login operativo (Conductor / Auditor).
 * El SuperAdministrador no se selecciona aquí: entra por su propio flujo
 * (ver `AdminLoginPage`), tal como exige el requisito de credencial separada.
 *
 * @param {Object} props
 * @param {"conductor" | "auditor"} props.value      Rol actualmente seleccionado.
 * @param {(rol: "conductor" | "auditor") => void} props.onChange
 */
const OPCIONES = [
  { value: "conductor", label: "Conductor", icon: "local_shipping" },
  { value: "auditor", label: "Auditor", icon: "fact_check" },
];

function RoleSelector({ value, onChange }) {
  return (
    <div className="space-y-2">
      <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">
        Puesto
      </span>
      <div
        role="radiogroup"
        aria-label="Selector de puesto"
        className="grid grid-cols-2 gap-2 bg-surface-container-low p-1 rounded-xl border border-outline-variant/30"
      >
        {OPCIONES.map((opcion) => {
          const isActive = value === opcion.value;
          return (
            <button
              key={opcion.value}
              type="button"
              role="radio"
              aria-checked={isActive}
              onClick={() => onChange(opcion.value)}
              className={`py-3 px-2 rounded-lg font-label-sm text-label-sm transition-all duration-300 flex items-center justify-center gap-2 ${
                isActive
                  ? "bg-primary text-on-primary shadow-md"
                  : "bg-transparent text-on-surface-variant hover:bg-surface-container-high"
              }`}
            >
              <span className="material-symbols-outlined text-[18px]">{opcion.icon}</span>
              {opcion.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export default RoleSelector;
