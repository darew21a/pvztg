/**
 * Grid de 12 columnas con gutters de 24px (spec del doc de diseño:
 * "Desktop: 12-column fluid grid with 24px gutters... 16px gap between modules").
 */
export function BentoGrid({ children, className = "" }) {
  return (
    <div className={`grid grid-cols-1 md:grid-cols-bento gap-bento-gap ${className}`}>
      {children}
    </div>
  );
}

// Mapa estático obligatorio: Tailwind purga en build y no puede detectar
// clases armadas con template strings (`md:col-span-${span}` NO funcionaría).
const SPAN_CLASSES = {
  1: "md:col-span-1",
  2: "md:col-span-2",
  3: "md:col-span-3",
  4: "md:col-span-4",
  5: "md:col-span-5",
  6: "md:col-span-6",
  8: "md:col-span-8",
  12: "md:col-span-12",
};

/**
 * Celda individual del bento grid. `span` = número de columnas (1-12) en desktop.
 */
export function BentoCell({ children, span = 4, className = "" }) {
  return (
    <div
      className={`bg-surface-container-lowest border border-outline-variant rounded-lg shadow-sm ${SPAN_CLASSES[span] ?? SPAN_CLASSES[4]} ${className}`}
    >
      {children}
    </div>
  );
}
