import { useState } from "react";

/**
 * Historial de combustible mensual de una unidad (kilómetros recorridos,
 * litros consumidos e importe facturado por mes), alimentado por el
 * análisis de reportes de Edenred. Editable: si el dato automático no
 * coincide con la realidad, el Administrador puede corregirlo a mano mes
 * por mes, sin tener que volver a subir el reporte completo.
 *
 * @param {Object} props
 * @param {Array<{mes:string, km:number, litros:number, importe:number}>} props.historial
 * @param {(mes: string, cambios: {km:number, litros:number, importe:number}) => void} props.onEditar
 */
function HistorialCombustible({ historial, onEditar }) {
  const [mesEnEdicion, setMesEnEdicion] = useState(null);
  const [borrador, setBorrador] = useState({ km: 0, litros: 0, importe: 0 });

  if (!historial || historial.length === 0) {
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
    <div className="overflow-x-auto border border-outline-variant/40 rounded-lg">
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
          {[...historial].reverse().map((registro) => {
            const enEdicion = mesEnEdicion === registro.mes;
            return (
              <tr key={registro.mes}>
                <td className="p-2 font-technical-mono text-technical-mono">{registro.mes}</td>
                {enEdicion ? (
                  <>
                    <td className="p-1">
                      <input type="number" value={borrador.km} onChange={(e) => setBorrador((b) => ({ ...b, km: e.target.value }))}
                        className="w-24 text-right px-2 py-1 border border-outline-variant rounded" />
                    </td>
                    <td className="p-1">
                      <input type="number" value={borrador.litros} onChange={(e) => setBorrador((b) => ({ ...b, litros: e.target.value }))}
                        className="w-24 text-right px-2 py-1 border border-outline-variant rounded" />
                    </td>
                    <td className="p-1">
                      <input type="number" value={borrador.importe} onChange={(e) => setBorrador((b) => ({ ...b, importe: e.target.value }))}
                        className="w-28 text-right px-2 py-1 border border-outline-variant rounded" />
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
        </tbody>
      </table>
    </div>
  );
}

export default HistorialCombustible;
