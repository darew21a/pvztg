import { useState } from "react";
import { agregarUnidad } from "../../data/unidadesStore.js";
import CampoUnidad from "./CampoUnidad.jsx";

const CAMPOS_ALTA = [
  { name: "numeroSerie", label: "No. de serie (VIN)", requerido: true },
  { name: "economico", label: "Número económico" },
  { name: "marca", label: "Marca" },
  { name: "submarca", label: "Submarca" },
  { name: "tipo", label: "Tipo" },
  { name: "modelo", label: "Modelo (año)" },
  { name: "placas", label: "Placas" },
  { name: "conductorAsignado", label: "Conductor asignado" },
];

/**
 * Alta de unidad nueva. Solo pide lo mínimo indispensable (VIN como llave
 * única); el resto de los ~14 campos se completa después desde el
 * Expediente, igual que con las unidades migradas del Excel.
 */
function UnidadFormNueva({ onCerrar }) {
  const [datos, setDatos] = useState({});
  const [error, setError] = useState("");

  function actualizarCampo(name, value) {
    setDatos((anterior) => ({ ...anterior, [name]: value }));
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!datos.numeroSerie?.trim()) {
      setError("El número de serie (VIN) es obligatorio: es la llave única de la unidad.");
      return;
    }
    agregarUnidad(datos);
    onCerrar();
  }

  return (
    <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 flex items-center justify-center p-4" onClick={onCerrar}>
      <form
        onSubmit={handleSubmit}
        onClick={(event) => event.stopPropagation()}
        className="bg-surface-container-lowest rounded-xl shadow-2xl max-w-lg w-full p-6 space-y-4"
      >
        <h2 className="font-title-md text-title-md text-on-surface">Dar de alta unidad nueva</h2>
        {error && (
          <p role="alert" className="font-body-md text-body-md text-error bg-error-container/20 border border-error-container rounded-lg px-3 py-2 text-sm">
            {error}
          </p>
        )}
        <div className="grid grid-cols-2 gap-4">
          {CAMPOS_ALTA.map((campo) => (
            <CampoUnidad key={campo.name} label={campo.label} name={campo.name} value={datos[campo.name]} onChange={actualizarCampo} />
          ))}
        </div>
        <div className="flex justify-end gap-2 pt-2">
          <button type="button" onClick={onCerrar} className="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface transition-colors">
            Cancelar
          </button>
          <button type="submit" className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-secondary transition-colors">
            Guardar unidad
          </button>
        </div>
      </form>
    </div>
  );
}

export default UnidadFormNueva;
