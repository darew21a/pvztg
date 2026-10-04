import { useMemo, useState } from "react";
import { useFiltrosFlota, useEstadoFiltrosFlota } from "../../hooks/useFiltrosFlota.js";
import { obtenerAniosDisponibles } from "../../hooks/useEjercicioFiscal.js";
import BarraFiltrosFlota from "./BarraFiltrosFlota.jsx";

const EMPTY_ARRAY = [];

/**
 * Historial de combustible mensual de una unidad (kilómetros recorridos,
 * litros consumidos e importe facturado por mes), alimentado por el
 * análisis de reportes de Edenred. Editable: si el dato automático no
 * coincide con la realidad, el Administrador puede corregirlo a mano mes
 * por mes, sin tener que volver a subir el reporte completo.
 *
 * Filtrable por Año/Mes con el núcleo centralizado `useFiltrosFlota` -
 * útil en cuanto una unidad acumula varios años de historial.
 *
 * @param {Object} props
 * @param {Array<{mes:string, km:number, litros:number, importe:number}>} props.historial
 * @param {(mes: string, cambios: {km:number, litros:number, importe:number}) => void} props.onEditar
 */
function HistorialCombustible({ historial, onEditar }) {
  const [mesEnEdicion, setMesEnEdicion] = useState(null);
  const [borrador, setBorrador] = useState({ km: 0, litros: 0, importe: 0 });
  const { filtros, setFiltro, limpiarFiltros } = useEstadoFiltrosFlota();

  const historialSeguro = historial ?? EMPTY_ARRAY;

  // Extractor: le enseña al núcleo centralizado cómo leer la fecha de un
  // registro mensual ("2026-07" -> Date del primer día de ese mes).
  const extractores = useMemo(() => ({ obtenerFecha: (registro) => new Date(`${registro.mes}-01T00:00:00`) }), []);
  const historialFiltrado = useFiltrosFlota(historialSeguro, filtros, extractores);

  const aniosDisponibles = useMemo(
    () => obtenerAniosDisponibles(historialSeguro.map((registro) => Number(registro.mes.slice(0, 4)))),
    [historialSeguro],
  );

  if (historialSeguro.length === 0) {
    return (
      <p className="font-body-md text-body-md text-on-surface-variant text-sm">
        Sin datos de combustible todavía. Se llenan al subir un reporte de Edenred, o puedes capturarlos manualmente en cuanto exista al menos un mes.
      </p>
    );
  }

  function empezarEdicion(registro) {
    setMesEnEdicion(registro.mes);
    setBorrador({ km: registro.km, litros: registro.litros, importe: registro.importe });
  }

  function guardarEdicion(mes) {
    onEditar(mes, {
      km: Number(borrador.km) || 0,
      litros: Number(borrador.litros) || 0,
      importe: Number(borrador.importe) || 0,
    });
    setMesEnEdicion(null);
  }

  return (
    <div className="space-y-3">
      {/* El filtro solo tiene sentido cuando ya hay varios años acumulados; con 1-2 meses no estorba pero está disponible desde ya. */}
      <BarraFiltrosFlota
        filtros={filtros}
        setFiltro={setFiltro}
        limpiarFiltros={limpiarFiltros}
        camposVisibles={["anio", "mes"]}
        aniosDisponibles={aniosDisponibles}
      />
      <div className="table-scroll custom-scrollbar" role="region" tabIndex={0} aria-label="Historial de combustible desplazable">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant uppercase">
            <tr>
              <th className="p-2">Mes</th>
              <th className="p-2 text-right">Km recorridos</th>
              <th className="p-2 text-right">Litros consumidos</th>
              <th className="p-2 text-right">Importe facturado</th>
              <th className="p-2 text-right">Editar</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {[...historialFiltrado].reverse().map((registro) => {
              const enEdicion = mesEnEdicion === registro.mes;
              return (
                <tr key={registro.mes}>
                  <td className="p-2 font-technical-mono text-technical-mono">{registro.mes}</td>
                  {enEdicion ? (
                    <>
                      <td className="p-1">
                        <input type="number" value={borrador.km} onChange={(e) => setBorrador((b) => ({ ...b, km: e.target.value }))}
                          className="w-24 bg-surface-container-lowest text-on-surface text-right px-2 py-1 border border-outline-variant rounded" />
                      </td>
                      <td className="p-1">
                        <input type="number" value={borrador.litros} onChange={(e) => setBorrador((b) => ({ ...b, litros: e.target.value }))}
                          className="w-24 bg-surface-container-lowest text-on-surface text-right px-2 py-1 border border-outline-variant rounded" />
                      </td>
                      <td className="p-1">
                        <input type="number" value={borrador.importe} onChange={(e) => setBorrador((b) => ({ ...b, importe: e.target.value }))}
                          className="w-28 bg-surface-container-lowest text-on-surface text-right px-2 py-1 border border-outline-variant rounded" />
                      </td>
                      <td className="p-2 text-right">
                        <button onClick={() => guardarEdicion(registro.mes)} className="text-primary hover:underline text-xs mr-2">Guardar</button>
                        <button onClick={() => setMesEnEdicion(null)} className="text-on-surface-variant hover:underline text-xs">Cancelar</button>
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="p-2 text-right">{registro.km.toLocaleString("es-MX")} km</td>
                      <td className="p-2 text-right">{registro.litros.toLocaleString("es-MX")} L</td>
                      <td className="p-2 text-right">${registro.importe.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
                      <td className="p-2 text-right">
                        <button onClick={() => empezarEdicion(registro)} className="text-primary hover:underline text-xs flex items-center gap-1 ml-auto">
                          <span className="material-symbols-outlined text-[14px]">edit</span> Editar
                        </button>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
            {historialFiltrado.length === 0 && (
              <tr>
                <td colSpan={5} className="p-4 text-center text-on-surface-variant">Sin meses con los filtros actuales.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default HistorialCombustible;
