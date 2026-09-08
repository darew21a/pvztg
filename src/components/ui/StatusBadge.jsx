/**
 * Pill de estado ("Operativo", "Mantenimiento", "En Ruta", "Falla"...).
 * Ver spec del doc de diseño: "High-contrast capsules for grid status.
 * Use uppercase typography at label-sm."
 */
const VARIANTS = {
  operativo: "bg-primary-container/10 text-primary border-primary-container/30",
  mantenimiento: "bg-error-container/20 text-error border-error-container/50",
  "en-ruta": "bg-tertiary-container/10 text-tertiary border-tertiary-container/30",
};

function StatusBadge({ status, children }) {
  const variantClasses = VARIANTS[status] ?? VARIANTS.operativo;
  return (
    <span
      className={`inline-flex items-center px-2 py-1 rounded-full border font-label-sm text-[10px] uppercase ${variantClasses}`}
    >
      {children}
    </span>
  );
}

export default StatusBadge;
