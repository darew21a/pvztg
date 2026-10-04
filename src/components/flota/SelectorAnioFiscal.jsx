import { useMemo } from "react";
import { obtenerAniosDisponibles } from "../../hooks/useEjercicioFiscal.js";
import GlowButton from "../ui/GlowButton.jsx";

/**
 * Selector de año fiscal + botón "Descargar PDF" del cierre del año que
 * se está viendo. Se usa igual en el Dashboard (flota completa) y en el
 * Perfil de unidad - recibe todo lo que necesita de `useEjercicioFiscal`.
 *
 * @param {Object} props
 * @param {number} props.anioSeleccionado
 * @param {(anio: number) => void} props.setAnioSeleccionado
 * @param {number[]} props.aniosDisponibles
 * @param {boolean} props.esAnioActual
 * @param {() => void} props.onDescargarPdf
 */
function SelectorAnioFiscal({ anioSeleccionado, setAnioSeleccionado, aniosDisponibles, esAnioActual, onDescargarPdf }) {
  const opcionesDeAnio = useMemo(() => obtenerAniosDisponibles(aniosDisponibles), [aniosDisponibles]);

  return (
    <div className="flex items-center gap-3 flex-wrap">
      <div className="flex items-center gap-2">
        <span className="font-label-sm text-label-sm text-on-surface-variant uppercase">Año fiscal</span>
        <select
          value={anioSeleccionado}
          onChange={(event) => setAnioSeleccionado(Number(event.target.value))}
          className="px-3 py-1.5 border border-outline-variant rounded-md bg-surface-bright text-sm font-medium"
        >
          {opcionesDeAnio.map((anio) => (
            <option key={anio} value={anio}>{anio}</option>
          ))}
        </select>
        {esAnioActual && (
          <span className="px-2 py-0.5 bg-primary-container/20 text-primary rounded-full font-label-sm text-label-sm uppercase">
            En curso
          </span>
        )}
      </div>
      <GlowButton
        onClick={onDescargarPdf}
      >
        <span className="material-symbols-outlined text-[16px]">picture_as_pdf</span>
        Descargar PDF {anioSeleccionado}
      </GlowButton>
    </div>
  );
}

export default SelectorAnioFiscal;
