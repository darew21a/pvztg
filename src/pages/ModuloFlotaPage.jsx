import { useMemo, useState } from "react";
import TopNavBar from "../components/layout/TopNavBar.jsx";
import UnidadDetallePanel from "../components/flota/UnidadDetallePanel.jsx";
import UnidadFormNueva from "../components/flota/UnidadFormNueva.jsx";
import { useUnidades } from "../hooks/useUnidades.js";
import { ESTADOS_UNIDAD } from "../data/unidadesStore.js";

// Mapa estático obligatorio: Tailwind purga en build y no detecta clases
// armadas con template strings (`bg-${color}-container/20` no funcionaría).
const CLASES_ESTADO = {
  primary: "bg-primary-container/20 text-primary",
  secondary: "bg-secondary-container/40 text-secondary",
  tertiary: "bg-tertiary-container/20 text-tertiary",
  error: "bg-error-container/40 text-error",
};

/**
 * ============================================================================
 * MÓDULO DE FLOTA VEHICULAR
 * ============================================================================
 * Tabla de las unidades reales migradas del Excel de parque vehicular, con
 * el orden de columnas solicitado: económico, marca/submarca, conductor
 * asignado, placas, kilometraje, tipo de combustible y estado. Al hacer
 * clic en una fila se abre el Expediente completo (`UnidadDetallePanel`)
 * donde se edita, documenta o da de baja la unidad.
 * ============================================================================
 */
function ModuloFlotaPage() {
  const unidades = useUnidades();
  const [unidadSeleccionadaId, setUnidadSeleccionadaId] = useState(null);
  const [mostrarAltaUnidad, setMostrarAltaUnidad] = useState(false);
  const [busqueda, setBusqueda] = useState("");

  // Filtro simple por económico, placas, marca o conductor — suficiente
  // mientras la búsqueda real la resuelva el backend con un índice.
  const unidadesFiltradas = useMemo(() => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return unidades;
    return unidades.filter((unidad) =>
      [unidad.economico, unidad.placas, unidad.marca, unidad.submarca, unidad.conductorAsignado]
        .filter(Boolean)
        .some((campo) => campo.toLowerCase().includes(termino)),
    );
  }, [unidades, busqueda]);

  const unidadSeleccionada = unidades.find((unidad) => unidad.id === unidadSeleccionadaId) ?? null;

  function estadoInfo(valor) {
    return ESTADOS_UNIDAD.find((estado) => estado.value === valor) ?? ESTADOS_UNIDAD[1];
  }

  return (
    <>
      <TopNavBar activeTab="Operaciones" searchPlaceholder="Buscar unidad, placa o conductor..." />
      <main className="flex-1 overflow-auto custom-scrollbar p-margin-desktop bg-surface-container-low">
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Flota Vehicular</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">{unidadesFiltradas.length} unidades</p>
          </div>
          <div className="flex gap-3">
            <input
              type="text"
              value={busqueda}
              onChange={(event) => setBusqueda(event.target.value)}
              placeholder="Filtrar en esta tabla..."
              className="px-4 py-2 border border-outline-variant rounded-lg bg-surface-bright font-body-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary"
            />
            <button
              onClick={() => setMostrarAltaUnidad(true)}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm flex items-center gap-2 hover:bg-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add</span>
              Nueva unidad
            </button>
          </div>
        </div>

        <div className="bg-surface-container-lowest rounded-lg border border-outline-variant overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-surface-container-high">
              <tr className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                <th className="p-4">Económico</th>
                <th className="p-4">Marca / Submarca</th>
                <th className="p-4">Conductor asignado</th>
                <th className="p-4">Placas</th>
                <th className="p-4">Kilometraje</th>
                <th className="p-4">Combustible</th>
                <th className="p-4">Estado</th>
              </tr>
            </thead>
            <tbody className="font-body-md text-body-md text-on-surface divide-y divide-outline-variant/30">
              {unidadesFiltradas.map((unidad) => {
                const estado = estadoInfo(unidad.estado);
                return (
                  <tr
                    key={unidad.id}
                    onClick={() => setUnidadSeleccionadaId(unidad.id)}
                    className="hover:bg-surface-container-low cursor-pointer transition-colors bento-lift"
                  >
                    <td className="p-4 font-technical-mono text-technical-mono">{unidad.economico ?? "Pendiente"}</td>
                    <td className="p-4">{unidad.marca} {unidad.submarca}</td>
                    <td className="p-4">{unidad.conductorAsignado ?? "Sin asignar"}</td>
                    <td className="p-4">{unidad.placas ?? "—"}</td>
                    <td className="p-4">{unidad.kilometraje ? `${unidad.kilometraje} km` : "Sin capturar"}</td>
                    <td className="p-4">{unidad.tipoCombustible ?? "Sin capturar"}</td>
                    <td className="p-4">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium uppercase ${CLASES_ESTADO[estado.color]}`}>
                        {estado.label}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>

      {unidadSeleccionada && (
        <UnidadDetallePanel unidad={unidadSeleccionada} onCerrar={() => setUnidadSeleccionadaId(null)} />
      )}
      {mostrarAltaUnidad && <UnidadFormNueva onCerrar={() => setMostrarAltaUnidad(false)} />}
    </>
  );
}

export default ModuloFlotaPage;
