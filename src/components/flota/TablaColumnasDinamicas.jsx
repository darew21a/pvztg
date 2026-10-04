import { useEffect, useRef, useState } from "react";
import { coincideBusqueda } from "../../utils/coincideBusqueda.js";

/**
 * Tabla adaptativa reutilizable: encabezado fijo, scroll horizontal
 * CONTENIDO dentro de su propio contenedor (nunca se sale de la pantalla
 * ni obliga a hacer zoom del navegador), y un menú superior de botones
 * tipo Toggle para prender/apagar columnas - no un dropdown de checkboxes.
 *
 * @param {Object} props
 * @param {Array<Object>} props.filas
 * @param {Array<{ key: string, label: string, opcional?: boolean, render?: (fila: Object) => React.ReactNode, alinearDerecha?: boolean }>} props.columnas
 *   `opcional: false` (o ausente) = columna visible por defecto. `opcional: true` = empieza apagada, se prende con su botón Toggle.
 * @param {(fila: Object, indice: number) => string | number} [props.obtenerLlave]  Para el `key` de cada fila; por defecto usa el índice.
 * @param {(fila: Object) => void} [props.onFilaClick]  Si se pasa, cada fila se vuelve clicable (ej. para abrir un detalle).
 */
function TablaColumnasDinamicas({
  filas,
  columnas,
  obtenerLlave,
  onFilaClick,
  searchQuery = "",
  resaltarFilas = false,
  coincideFila,
  scrollRequest = 0,
  scrollVertical = false,
  allowVerticalScrollChaining = false,
  unidadesAnomalia = [],
  classNameFila,
  styleFila,
}) {
  const [columnasActivas, setColumnasActivas] = useState(() => new Set(columnas.filter((columna) => !columna.opcional).map((columna) => columna.key)));
  const tablaRef = useRef(null);

  useEffect(() => {
    if (!scrollRequest && unidadesAnomalia.length === 0) return;
    const match = tablaRef.current?.querySelector('[data-anomaly-match="true"]')
      ?? tablaRef.current?.querySelector('[data-search-match="true"]');
    if (!match) return;

    if (scrollVertical && tablaRef.current) {
      const container = tablaRef.current;
      const row = match.getBoundingClientRect();
      const bounds = container.getBoundingClientRect();
      container.scrollTo({
        top: container.scrollTop + row.top - bounds.top - (container.clientHeight - row.height) / 2,
        behavior: "smooth",
      });
      return;
    }

    match.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [scrollRequest, scrollVertical, unidadesAnomalia, filas.length]);

  function alternarColumna(key) {
    setColumnasActivas((anteriores) => {
      const siguiente = new Set(anteriores);
      if (siguiente.has(key)) siguiente.delete(key);
      else siguiente.add(key);
      return siguiente;
    });
  }

  const columnasVisibles = columnas.filter((columna) => columnasActivas.has(columna.key));
  const columnasOpcionales = columnas.filter((columna) => columna.opcional);

  return (
    <div className="space-y-3">
      {columnasOpcionales.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {columnasOpcionales.map((columna) => {
            const activa = columnasActivas.has(columna.key);
            return (
              <button
                key={columna.key}
                onClick={() => alternarColumna(columna.key)}
                className={`px-3 py-1 rounded-full border font-label-sm text-label-sm transition-colors ${
                  activa
                    ? "bg-primary text-on-primary border-primary"
                    : "bg-surface-bright text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
                }`}
              >
                {activa ? "✓ " : "+ "}{columna.label}
              </button>
            );
          })}
        </div>
      )}

      {/* overflow-x-auto contiene el desbordamiento DENTRO de la tabla, nunca se sale del layout ni requiere zoom. */}
      <div
        ref={tablaRef}
        className={`table-scroll transaction-table-scroll custom-scrollbar max-w-full ${allowVerticalScrollChaining ? "table-scroll-chain-vertical" : ""}`}
        role="region"
        tabIndex={0}
        aria-label="Tabla de datos desplazable"
      >
        <table className="fleet-color-table w-full text-left text-[11px]">
          <thead className="bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant uppercase sticky top-0 z-10">
            <tr>
              {columnasVisibles.map((columna) => (
                <th key={columna.key} className={`p-1.5 whitespace-nowrap ${columna.alinearDerecha ? "text-right" : "text-left"}`}>
                  {columna.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {filas.map((fila, indice) => {
              const coincide = coincideFila ? coincideFila(fila) : coincideBusqueda(fila, searchQuery);
              const resaltada = resaltarFilas || coincide;
              const coincideAnomalia = unidadesAnomalia.includes(String(fila.id));
              const claseFila = classNameFila?.(fila) ?? "";
              const estiloFila = styleFila?.(fila) ?? undefined;
              return (
              <tr
                key={obtenerLlave ? obtenerLlave(fila, indice) : indice}
                onClick={onFilaClick ? () => onFilaClick(fila) : undefined}
                data-search-match={coincide ? "true" : undefined}
                data-anomaly-match={coincideAnomalia ? "true" : undefined}
                style={estiloFila}
                className={`transition-colors ${claseFila} ${coincideAnomalia ? "outline outline-2 outline-offset-[-2px] outline-orange-700" : resaltada ? "outline outline-1 outline-offset-[-1px] outline-primary" : ""} ${onFilaClick ? "cursor-pointer" : ""} ${!coincideAnomalia && !resaltada ? "hover:brightness-[0.98]" : ""}`}
              >
                {columnasVisibles.map((columna) => (
                  <td key={columna.key} className={`p-1.5 whitespace-nowrap ${columna.alinearDerecha ? "text-right" : "text-left"}`}>
                    {columna.render ? columna.render(fila) : String(fila[columna.key] ?? "-")}
                  </td>
                ))}
              </tr>
              );
            })}
            {filas.length === 0 && (
              <tr>
                <td colSpan={columnasVisibles.length} className="p-6 text-center text-on-surface-variant">
                  Sin resultados con los filtros actuales.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default TablaColumnasDinamicas;
