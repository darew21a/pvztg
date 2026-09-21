import { useRef, useState } from "react";
import { actualizarParqueVehicular } from "../../data/unidadesStore.js";
import { analizarParqueVehicular, leerArchivoParqueVehicular } from "../../utils/parqueVehicularParser.js";

const FASES = { INACTIVO: "inactivo", ANALIZANDO: "analizando", VISTA_PREVIA: "vista-previa", APLICADO: "aplicado" };

function normalizarNombre(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^A-Za-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .toUpperCase();
}

function CargadorParqueVehicular({ unidades, departamentos }) {
  const inputArchivoRef = useRef(null);
  const [fase, setFase] = useState(FASES.INACTIVO);
  const [resultado, setResultado] = useState(null);
  const [errorMensaje, setErrorMensaje] = useState("");

  function resolverDepartamento(nombre) {
    const clave = normalizarNombre(nombre);
    return departamentos.find((departamento) => normalizarNombre(departamento.nombre) === clave)?.id ?? null;
  }

  async function procesarArchivo(archivo) {
    if (!archivo) return;
    setErrorMensaje("");
    setFase(FASES.ANALIZANDO);
    try {
      const datos = await leerArchivoParqueVehicular(archivo);
      setResultado(analizarParqueVehicular(datos, unidades, resolverDepartamento));
      setFase(FASES.VISTA_PREVIA);
    } catch (error) {
      setErrorMensaje(error.message);
      setFase(FASES.INACTIVO);
    }
  }

  function manejarArchivo(event) {
    procesarArchivo(event.target.files?.[0]);
    event.target.value = "";
  }

  function confirmar() {
    actualizarParqueVehicular(resultado.actualizaciones);
    setFase(FASES.APLICADO);
  }

  function cerrar() {
    setResultado(null);
    setErrorMensaje("");
    setFase(FASES.INACTIVO);
  }

  return (
    <>
      <button
        type="button"
        onClick={() => inputArchivoRef.current?.click()}
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => {
          event.preventDefault();
          procesarArchivo(event.dataTransfer.files?.[0]);
        }}
        className="px-4 py-2 border-2 border-dashed border-primary text-primary rounded-lg font-label-sm text-label-sm flex items-center gap-2 hover:bg-primary-container/20 transition-colors"
      >
        <span className="material-symbols-outlined text-[18px]">upload_file</span>
        RELACIÓN DE PARQUE VEHICULAR
      </button>
      <input ref={inputArchivoRef} type="file" accept=".xlsx,.xls" className="hidden" onChange={manejarArchivo} />

      {fase !== FASES.INACTIVO && (
        <div className="fixed inset-0 z-50 bg-on-surface/40 backdrop-blur-sm flex items-center justify-center p-4" onClick={cerrar}>
          <section className="bg-surface-container-lowest rounded-xl shadow-2xl max-w-xl w-full p-6 space-y-4" onClick={(event) => event.stopPropagation()}>
            {fase === FASES.ANALIZANDO && <p className="text-on-surface">Analizando relación de parque vehicular...</p>}
            {fase === FASES.VISTA_PREVIA && resultado && (
              <>
                <div>
                  <h2 className="font-title-md text-title-md text-on-surface">Vista previa de actualización</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Hoja detectada: {resultado.hoja}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <p className="bg-primary-container/20 rounded-lg p-3"><strong>{resultado.actualizaciones.length}</strong> unidades a actualizar</p>
                  <p className="bg-tertiary-container/20 rounded-lg p-3"><strong>{resultado.noEncontrados.length}</strong> económicos no encontrados</p>
                  <p className="bg-error-container/20 rounded-lg p-3"><strong>{resultado.duplicados.length}</strong> filas duplicadas</p>
                  <p className="bg-surface-container-high rounded-lg p-3"><strong>{resultado.filasInvalidas}</strong> filas inválidas</p>
                </div>
                {resultado.jefaturasNoEncontradas.length > 0 && (
                  <p className="text-sm text-error">No se reconoció la Jefatura de {resultado.jefaturasNoEncontradas.length} fila(s); esas unidades se actualizarán sin cambiar su Departamento.</p>
                )}
                <p className="text-sm text-on-surface-variant">
                  La carga solo modifica datos maestros encontrados por número económico. Se conservan historial de Edenred, consumos, documentos, fotografías y kilometraje.
                </p>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={cerrar} className="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg">Cancelar</button>
                  <button type="button" onClick={confirmar} disabled={resultado.actualizaciones.length === 0} className="px-4 py-2 bg-primary text-on-primary rounded-lg disabled:opacity-50">Confirmar actualización</button>
                </div>
              </>
            )}
            {fase === FASES.APLICADO && (
              <>
                <h2 className="font-title-md text-title-md text-on-surface">Carga aplicada correctamente</h2>
                <p className="text-sm text-on-surface-variant">{resultado?.actualizaciones.length ?? 0} unidades actualizadas sin alterar sus datos de Edenred.</p>
                <div className="flex justify-end"><button type="button" onClick={cerrar} className="px-4 py-2 bg-primary text-on-primary rounded-lg">Cerrar</button></div>
              </>
            )}
          </section>
        </div>
      )}
      {errorMensaje && <p role="alert" className="fixed bottom-4 right-4 z-[60] bg-error-container text-error px-4 py-2 rounded-lg shadow-lg">{errorMensaje}</p>}
    </>
  );
}

export default CargadorParqueVehicular;
