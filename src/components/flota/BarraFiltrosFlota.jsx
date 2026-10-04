import { useMemo } from "react";
import { useDepartamentos } from "../../hooks/useDepartamentos.js";
import { obtenerAniosDisponibles } from "../../hooks/useEjercicioFiscal.js";

/**
 * Barra de filtros con inputs SEPARADOS - nunca una sola barra de
 * búsqueda. Se usa junto con `useFiltrosFlota`/`useEstadoFiltrosFlota` en
 * los módulos del ecosistema. `camposVisibles` controla cuáles de los 7
 * campos mostrar (no todas las pantallas necesitan Hora o Departamento,
 * por ejemplo). El select de Departamento se llena dinámicamente desde
 * `departamentosStore.js` - nunca una lista fija, crece con el sistema.
 *
 * @param {Object} props
 * @param {Object} props.filtros
 * @param {(campo: string, valor: string) => void} props.setFiltro
 * @param {() => void} props.limpiarFiltros
 * @param {string[]} [props.camposVisibles]  Subconjunto de ["placa","economico","departamento","anio","mes","dia","hora"].
 * @param {number[]} [props.aniosDisponibles]  Años con datos; se completa con el actual.
 */
function BarraFiltrosFlota({
  filtros,
  setFiltro,
  limpiarFiltros,
  camposVisibles = ["placa", "economico", "anio", "mes", "dia", "hora"],
  aniosDisponibles = [],
}) {
  const departamentos = useDepartamentos();
  const opcionesDeAnio = useMemo(() => obtenerAniosDisponibles(aniosDisponibles), [aniosDisponibles]);
  const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ];

  return (
    <div className="flex flex-wrap items-end gap-3 p-4 bg-surface-container-low rounded-lg border border-outline-variant/40">
      {camposVisibles.includes("placa") && (
        <CampoFiltro etiqueta="Placa">
          <input
            type="text"
            value={filtros.placa}
            onChange={(event) => setFiltro("placa", event.target.value)}
            placeholder="Ej. ABC123A"
            className="px-3 py-1.5 border border-outline-variant rounded-md bg-surface-bright text-sm w-32 focus:outline-none focus:border-primary"
          />
        </CampoFiltro>
      )}

      {camposVisibles.includes("economico") && (
        <CampoFiltro etiqueta="Económico">
          <input
            type="text"
            value={filtros.economico}
            onChange={(event) => setFiltro("economico", event.target.value)}
            placeholder="Ej. 23002762"
            className="px-3 py-1.5 border border-outline-variant rounded-md bg-surface-bright text-sm w-32 focus:outline-none focus:border-primary"
          />
        </CampoFiltro>
      )}

      {camposVisibles.includes("departamento") && (
        <CampoFiltro etiqueta="Departamento">
          <select
            value={filtros.departamento}
            onChange={(event) => setFiltro("departamento", event.target.value)}
            className="px-3 py-1.5 border border-outline-variant rounded-md bg-surface-bright text-sm"
          >
            <option value="">Todos</option>
            {departamentos.map((departamento) => (
              <option key={departamento.id} value={departamento.id}>{departamento.nombre}</option>
            ))}
          </select>
        </CampoFiltro>
      )}

      {camposVisibles.includes("anio") && (
        <CampoFiltro etiqueta="Año">
          <select
            value={filtros.anio}
            onChange={(event) => setFiltro("anio", event.target.value)}
            className="px-3 py-1.5 border border-outline-variant rounded-md bg-surface-bright text-sm"
          >
            <option value="">Todos</option>
            {opcionesDeAnio.map((anio) => (
              <option key={anio} value={anio}>{anio}</option>
            ))}
          </select>
        </CampoFiltro>
      )}

      {camposVisibles.includes("mes") && (
        <CampoFiltro etiqueta="Mes">
          <select
            value={filtros.mes}
            onChange={(event) => setFiltro("mes", event.target.value)}
            className="px-3 py-1.5 border border-outline-variant rounded-md bg-surface-bright text-sm"
          >
            <option value="">Todos</option>
            {MESES.map((nombreMes, indice) => (
              <option key={nombreMes} value={indice + 1}>{nombreMes}</option>
            ))}
          </select>
        </CampoFiltro>
      )}

      {camposVisibles.includes("dia") && (
        <CampoFiltro etiqueta="Día">
          <input
            type="number"
            min="1"
            max="31"
            value={filtros.dia}
            onChange={(event) => setFiltro("dia", event.target.value)}
            className="px-3 py-1.5 border border-outline-variant rounded-md bg-surface-bright text-sm w-20 focus:outline-none focus:border-primary"
          />
        </CampoFiltro>
      )}

      {camposVisibles.includes("hora") && (
        <CampoFiltro etiqueta="Hora">
          <select
            value={filtros.hora}
            onChange={(event) => setFiltro("hora", event.target.value)}
            className="px-3 py-1.5 border border-outline-variant rounded-md bg-surface-bright text-sm"
          >
            <option value="">Todas</option>
            {Array.from({ length: 24 }, (_, hora) => (
              <option key={hora} value={hora}>{String(hora).padStart(2, "0")}:00</option>
            ))}
          </select>
        </CampoFiltro>
      )}

      <button
        onClick={limpiarFiltros}
        className="px-3 py-1.5 font-label-sm text-label-sm text-on-surface-variant hover:text-error border border-outline-variant rounded-md hover:bg-error-container/10 transition-colors flex items-center gap-1"
      >
        <span className="material-symbols-outlined text-[16px]">filter_alt_off</span>
        Limpiar
      </button>
    </div>
  );
}

function CampoFiltro({ etiqueta, children }) {
  return (
    <div className="flex flex-col gap-1">
      <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">{etiqueta}</span>
      {children}
    </div>
  );
}

export default BarraFiltrosFlota;
