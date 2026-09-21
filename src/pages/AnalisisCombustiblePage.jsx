import { useMemo, useState } from "react";
import TopNavBar from "../components/layout/TopNavBar.jsx";
import BarraFiltrosFlota from "../components/flota/BarraFiltrosFlota.jsx";
import { useUnidades } from "../hooks/useUnidades.js";
import { useFiltrosFlota, useEstadoFiltrosFlota } from "../hooks/useFiltrosFlota.js";
import { useEjercicioFiscal } from "../hooks/useEjercicioFiscal.js";
import { generarPdfCierreAnual } from "../utils/generarPdfCierreAnual.js";
import SelectorAnioFiscal from "../components/flota/SelectorAnioFiscal.jsx";
import { useSearch } from "../context/SearchContext.jsx";
import { coincideBusqueda } from "../utils/coincideBusqueda.js";

/**
 * ============================================================================
 * MÓDULO DE ANÁLISIS DE COMBUSTIBLE
 * ============================================================================
 * Aísla UNA unidad (búsqueda por Placa/Económico, vía el núcleo
 * centralizado `useFiltrosFlota`) y analiza su consumo total - útil para
 * responder "¿cuánto ha gastado esta unidad en total?" sin tener que sumar
 * a mano el historial mensual.
 * ============================================================================
 */
function AnalisisCombustiblePage() {
  const unidades = useUnidades();
  const { query } = useSearch();
  const [unidadSeleccionadaId, setUnidadSeleccionadaId] = useState(null);

  const busquedaUnidad = useEstadoFiltrosFlota();
  const extractoresUnidad = useMemo(
    () => ({ obtenerPlaca: (unidad) => unidad.placas, obtenerEconomico: (unidad) => unidad.economico }),
    [],
  );
  const unidadesConEconomico = useMemo(() => unidades.filter((unidad) => unidad.economico), [unidades]);
  const resultadosPorFiltros = useFiltrosFlota(unidadesConEconomico, busquedaUnidad.filtros, extractoresUnidad);
  const resultadosBusqueda = query.trim() ? unidadesConEconomico.filter((unidad) => coincideBusqueda(unidad, query)) : resultadosPorFiltros;

  const unidadSeleccionada = unidades.find((unidad) => unidad.id === unidadSeleccionadaId) ?? null;

  return (
    <>
      <TopNavBar activeTab="Alertas" searchPlaceholder="Buscar unidad..." />
      <div className="p-margin-desktop flex-1 space-y-6">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Análisis de Combustible por Unidad</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            Busca una unidad por placa o económico para ver su consumo total.
          </p>
        </div>

        <BarraFiltrosFlota
          filtros={busquedaUnidad.filtros}
          setFiltro={busquedaUnidad.setFiltro}
          limpiarFiltros={busquedaUnidad.limpiarFiltros}
          camposVisibles={["placa", "economico"]}
        />

        {!unidadSeleccionada ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-lg divide-y divide-outline-variant/30">
            {resultadosBusqueda.length === 0 ? (
              <p className="p-6 text-center text-on-surface-variant font-body-md text-body-md">
                Escribe una placa o económico arriba para buscar la unidad a analizar.
              </p>
            ) : (
              resultadosBusqueda.map((unidad) => (
                <button
                  key={unidad.id}
                  onClick={() => setUnidadSeleccionadaId(unidad.id)}
                  className="w-full text-left p-4 hover:bg-surface-container-low transition-colors flex justify-between items-center"
                >
                  <span>
                    <span className="font-technical-mono text-technical-mono">{unidad.economico}</span> - {unidad.marca} {unidad.submarca} - {unidad.placas}
                  </span>
                  <span className="material-symbols-outlined text-on-surface-variant">chevron_right</span>
                </button>
              ))
            )}
          </div>
        ) : (
          <AnalisisDeUnaUnidad unidad={unidadSeleccionada} onCambiarUnidad={() => setUnidadSeleccionadaId(null)} />
        )}
      </div>
    </>
  );
}

/** Totales y desglose mensual filtrable (Año/Mes) de UNA unidad ya elegida. */
function AnalisisDeUnaUnidad({ unidad, onCambiarUnidad }) {
  const ejercicioFiscal = useEjercicioFiscal(unidad.historialCombustible);
  const { mesesDelAnio, totales } = ejercicioFiscal;

  const rendimientoPromedio = totales.litros > 0 ? (totales.km / totales.litros).toFixed(1) : null;

  function handleDescargarPdf() {
    const url = generarPdfCierreAnual({
      anio: ejercicioFiscal.anioSeleccionado,
      titulo: `Económico ${unidad.economico ?? "s/e"} - ${unidad.marca ?? ""} ${unidad.submarca ?? ""} (${unidad.placas ?? "s/placa"})`,
      mesesDelAnio,
      totales,
    });
    window.open(url, "_blank");
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center flex-wrap gap-3">
        <div>
          <h2 className="font-title-md text-title-md text-on-surface">
            {unidad.economico} - {unidad.marca} {unidad.submarca} ({unidad.placas})
          </h2>
          <p className="font-body-md text-body-md text-on-surface-variant text-sm">
            Ejercicio fiscal {ejercicioFiscal.anioSeleccionado} - enero a diciembre
          </p>
        </div>
        <button onClick={onCambiarUnidad} className="font-label-sm text-label-sm text-primary hover:underline">
          Cambiar unidad
        </button>
      </div>

      <SelectorAnioFiscal
        anioSeleccionado={ejercicioFiscal.anioSeleccionado}
        setAnioSeleccionado={ejercicioFiscal.setAnioSeleccionado}
        aniosDisponibles={ejercicioFiscal.aniosDisponibles}
        esAnioActual={ejercicioFiscal.esAnioActual}
        onDescargarPdf={handleDescargarPdf}
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <TarjetaTotal etiqueta="Km recorridos totales" valor={`${totales.km.toLocaleString("es-MX")} km`} />
        <TarjetaTotal etiqueta="Litros consumidos totales" valor={`${totales.litros.toLocaleString("es-MX")} L`} />
        <TarjetaTotal etiqueta="Importe total facturado" valor={`$${totales.importe.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`} />
        <TarjetaTotal etiqueta="Rendimiento promedio" valor={rendimientoPromedio ? `${rendimientoPromedio} km/L` : "Sin datos"} />
      </div>

      <div className="bg-surface-container-lowest border border-outline-variant rounded-lg overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface-container-high font-label-sm text-label-sm text-on-surface-variant uppercase">
            <tr>
              <th className="p-3">Mes</th>
              <th className="p-3 text-right">Km</th>
              <th className="p-3 text-right">Litros</th>
              <th className="p-3 text-right">Importe</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {[...mesesDelAnio].reverse().map((registro) => (
              <tr key={registro.mes}>
                <td className="p-3 font-technical-mono text-technical-mono">{registro.mes}</td>
                <td className="p-3 text-right">{registro.km.toLocaleString("es-MX")}</td>
                <td className="p-3 text-right">{registro.litros.toLocaleString("es-MX")}</td>
                <td className="p-3 text-right">${registro.importe.toLocaleString("es-MX", { minimumFractionDigits: 2 })}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function TarjetaTotal({ etiqueta, valor }) {
  return (
    <div className="bg-surface-container-lowest border border-outline-variant rounded-lg p-4">
      <p className="font-label-sm text-label-sm text-on-surface-variant uppercase mb-1">{etiqueta}</p>
      <p className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-on-surface">{valor}</p>
    </div>
  );
}

export default AnalisisCombustiblePage;
