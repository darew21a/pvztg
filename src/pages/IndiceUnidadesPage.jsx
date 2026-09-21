import { useMemo, useState } from "react";
import TopNavBar from "../components/layout/TopNavBar.jsx";
import UnidadDetallePanel from "../components/flota/UnidadDetallePanel.jsx";
import { useUnidades } from "../hooks/useUnidades.js";
import { useReportes } from "../hooks/useReportes.js";
import { obtenerNombreDepartamento } from "../data/departamentosStore.js";
import { evaluarColorUnidad, CLASES_COLOR_UNIDAD } from "../utils/colorUnidad.js";
import { useSearch } from "../context/SearchContext.jsx";
import { coincideBusqueda } from "../utils/coincideBusqueda.js";

/**
 * ============================================================================
 * ÍNDICE DE UNIDADES (MÓDULO 1)
 * ============================================================================
 * A diferencia del Buscador de Flota (que solo muestra unidades CON
 * económico, agrupadas por departamento), este índice lista TODA la
 * flota - incluidas las unidades incompletas - numerada, con el color de
 * alerta de `evaluarColorUnidad` para detectar de un vistazo qué unidad
 * necesita atención y por qué.
 * ============================================================================
 */
function IndiceUnidadesPage() {
  const unidades = useUnidades();
  const reportes = useReportes();
  const { query } = useSearch();
  const [unidadSeleccionadaId, setUnidadSeleccionadaId] = useState(null);

  const unidadesEvaluadas = useMemo(
    () => unidades.map((unidad, indice) => ({ numero: indice + 1, unidad, ...evaluarColorUnidad(unidad, unidades, reportes) })),
    [unidades, reportes],
  );

  const unidadSeleccionada = unidades.find((unidad) => unidad.id === unidadSeleccionadaId) ?? null;

  return (
    <>
      <TopNavBar activeTab="Operaciones" searchPlaceholder="Buscar unidad..." />
      <main className="flex-1 overflow-auto custom-scrollbar p-margin-desktop bg-surface-container-low space-y-4">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Índice de Unidades</h1>
          <p className="font-body-md text-body-md text-on-surface-variant">{unidades.length} unidades totales en la flota</p>
        </div>

        <LeyendaDeColores />

        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-x-auto">
          <table className="w-full text-left text-sm">
            <thead className="bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant uppercase">
              <tr>
                <th className="p-3 w-16">No.</th>
                <th className="p-3">Económico</th>
                <th className="p-3">Marca / Submarca</th>
                <th className="p-3">Placas</th>
                <th className="p-3">Departamento</th>
                <th className="p-3">Alerta</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {unidadesEvaluadas.map(({ numero, unidad, color, razones }) => (
                <tr
                  key={unidad.id}
                  onClick={() => setUnidadSeleccionadaId(unidad.id)}
                  data-search-match={coincideBusqueda({ ...unidad, numero }, query) ? "true" : undefined}
                  title={razones.join(" · ") || "Sin alertas"}
                  className={`cursor-pointer hover:brightness-95 transition-all ${color ? CLASES_COLOR_UNIDAD[color].fila : ""}`}
                >
                  <td className="p-3 font-technical-mono text-technical-mono text-on-surface-variant">{numero}</td>
                  <td className="p-3 font-technical-mono text-technical-mono">{unidad.economico ?? "Pendiente"}</td>
                  <td className="p-3">{unidad.marca} {unidad.submarca}</td>
                  <td className="p-3">{unidad.placas ?? "-"}</td>
                  <td className="p-3">{obtenerNombreDepartamento(unidad.departamento)}</td>
                  <td className="p-3">
                    {color ? (
                      <span className={`font-label-sm text-label-sm uppercase ${CLASES_COLOR_UNIDAD[color].texto}`}>
                        {CLASES_COLOR_UNIDAD[color].etiqueta}
                      </span>
                    ) : (
                      <span className="font-label-sm text-label-sm text-on-surface-variant">Sin alertas</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      {unidadSeleccionada && <UnidadDetallePanel unidad={unidadSeleccionada} onCerrar={() => setUnidadSeleccionadaId(null)} />}
    </>
  );
}

function LeyendaDeColores() {
  return (
    <div className="flex flex-wrap gap-4 bg-surface-container-lowest border border-outline-variant rounded-lg p-3">
      {Object.entries(CLASES_COLOR_UNIDAD).map(([color, clases]) => (
        <div key={color} className="flex items-center gap-2">
          <span className={`w-3 h-3 rounded-full ${clases.fila.split(" ")[0]}`}></span>
          <span className="font-label-sm text-label-sm text-on-surface-variant">{clases.etiqueta}</span>
        </div>
      ))}
    </div>
  );
}

export default IndiceUnidadesPage;
