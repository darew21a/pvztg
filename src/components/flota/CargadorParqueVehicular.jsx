import { useRef, useState } from "react";
import { actualizarParqueVehicular, agregarUnidad } from "../../data/unidadesStore.js";
import { consultarCargaRelacionApi, importarRelacionUnidadesApi } from "../../services/unidadService.js";
import { analizarParqueVehicular, leerArchivoParqueVehicular, prepararCambiosPlacasVigentes } from "../../utils/parqueVehicularParser.js";
import { hashArchivo, hashObjeto } from "../../utils/hashArchivo.js";

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
  const [archivo, setArchivo] = useState(null);
  const [archivoHash, setArchivoHash] = useState("");
  const [contenidoHash, setContenidoHash] = useState("");
  const [confirmarPlacasHistoricas, setConfirmarPlacasHistoricas] = useState(null);

  function resolverDepartamento(nombre) {
    const clave = normalizarNombre(nombre);
    const aliases = new Map([
      ["ZOT GUERRERO MORELOS", "ZONA DE OPERACION DE TRANSMISION GUERRERO MORELOS"],
      ["ZONA DE OPERACION GUERRERO MORELOS", "ZONA DE OPERACION DE TRANSMISION GUERRERO MORELOS"],
      ["IXTAPA", "IXTAPA POTENCIA"],
      ["CHILPANCINGO", "CHILPANCINGO POTENCIA"],
    ]);
    const claveCanonica = aliases.get(clave) ?? clave;
    return departamentos.find((departamento) => normalizarNombre(departamento.nombre) === claveCanonica)?.id ?? null;
  }

  async function procesarArchivo(archivo) {
    if (!archivo) return;
    setErrorMensaje("");
    setFase(FASES.ANALIZANDO);
    try {
      const hash = await hashArchivo(archivo);
      const datos = await leerArchivoParqueVehicular(archivo, resolverDepartamento);
      const contenidoHash = await hashObjeto(datos.filas.map(({ economico, jefatura, cambios }) => ({ economico, jefatura, cambios })));
      const estadoHash = await consultarCargaRelacionApi(hash, contenidoHash);
      if (estadoHash.yaCargado) {
        const nombre = estadoHash.carga?.nombre_archivo ? ` "${estadoHash.carga.nombre_archivo}"` : "";
        setErrorMensaje(`El archivo de relación de unidades${nombre} ya se ha subido antes (${estadoHash.carga?.created_at ? new Date(estadoHash.carga.created_at).toLocaleString("es-MX") : "fecha no disponible"}). No se aplicaron cambios.`);
        setFase(FASES.INACTIVO);
        return;
      }
      setResultado(analizarParqueVehicular(datos, unidades, resolverDepartamento));
      setArchivo(archivo);
      setArchivoHash(hash);
      setContenidoHash(contenidoHash);
      setConfirmarPlacasHistoricas(null);
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

  async function confirmar() {
    if (!resultado) return;
    const actualizaciones = resultado.actualizaciones
      .map(({ anioPlacasVigentesFuente, cambios, ...actualizacion }) => ({
        ...actualizacion,
        cambios: prepararCambiosPlacasVigentes(cambios, anioPlacasVigentesFuente, confirmarPlacasHistoricas === true),
      }))
      .filter(({ cambios }) => Object.keys(cambios).length > 0);
    const altasPreparadas = resultado.altasValidas.map((fila) => ({
      ...fila,
      cambios: prepararCambiosPlacasVigentes(fila.cambios, fila.anioPlacasVigentesFuente, confirmarPlacasHistoricas === true),
    }));
    const altas = altasPreparadas.map((fila) => ({
      datos: { ...fila.cambios, economico: fila.economico, departamentoId: resolverDepartamento(fila.jefatura) },
    }));
    const respuesta = await importarRelacionUnidadesApi({
      archivoHash,
      contenidoHash,
      nombreArchivo: archivo?.name,
      actualizaciones: actualizaciones.map(({ unidad, cambios }) => ({ id: unidad.id, cambios })),
      altas,
    });
    actualizarParqueVehicular(actualizaciones);
    respuesta.creadas.forEach(({ id, datos }) => agregarUnidad({ ...datos, id }));
    setResultado((actual) => ({ ...actual, actualizaciones, altasValidas: altasPreparadas }));
    setFase(FASES.APLICADO);
  }

  function cerrar() {
    setResultado(null);
    setArchivo(null);
    setArchivoHash("");
    setContenidoHash("");
    setConfirmarPlacasHistoricas(null);
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
          <section className="bg-surface-container-lowest rounded-xl shadow-2xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-4" onClick={(event) => event.stopPropagation()}>
            {fase === FASES.ANALIZANDO && <p className="text-on-surface">Analizando relación de parque vehicular...</p>}
            {fase === FASES.VISTA_PREVIA && resultado && (
              <>
                <div>
                  <h2 className="font-title-md text-title-md text-on-surface">Vista previa de carga</h2>
                  <p className="text-sm text-on-surface-variant mt-1">Hoja detectada: {resultado.hoja}</p>
                  <p className="text-sm text-on-surface-variant mt-1">Unidades detectadas en la relación: {resultado.filasDetectadas}</p>
                </div>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <p className="bg-primary-container/20 rounded-lg p-3"><strong>{resultado.actualizaciones.length}</strong> unidades a actualizar</p>
                  <p className="bg-tertiary-container/20 rounded-lg p-3"><strong>{resultado.altasValidas.length}</strong> unidades nuevas listas para alta</p>
                  <p className="bg-surface-container-high rounded-lg p-3"><strong>{resultado.duplicados.length}</strong> filas idénticas repetidas (se omiten)</p>
                  <p className="bg-error-container/20 rounded-lg p-3"><strong>{resultado.conflictos.length}</strong> conflictos de identidad</p>
                  <p className="bg-surface-container-high rounded-lg p-3"><strong>{resultado.filasInvalidas}</strong> filas sin datos suficientes para identificar vehículo</p>
                </div>
                {resultado.placasVigentesFuente?.requiereConfirmacion
                  && resultado.placasVigentesFuente.valoresCapturados > 0 && (
                    <fieldset className="space-y-2 rounded-lg border border-amber-500/50 bg-amber-50 p-3 text-sm text-amber-950">
                      <legend className="px-1 font-semibold">Confirmar vigencia de placas</legend>
                      <p>
                        El encabezado dice <strong>{resultado.placasVigentesFuente.encabezado}</strong>, pero el año actual es <strong>{new Date().getFullYear()}</strong>.
                        Hay {resultado.placasVigentesFuente.valoresCapturados} valores. ¿Corresponden realmente a las placas vigentes de este año?
                      </p>
                      <label className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="confirmar-placas-historicas"
                          checked={confirmarPlacasHistoricas === true}
                          onChange={() => setConfirmarPlacasHistoricas(true)}
                        />
                        <span>Sí, importarlas como placas vigentes de {new Date().getFullYear()}.</span>
                      </label>
                      <label className="flex items-start gap-2">
                        <input
                          type="radio"
                          name="confirmar-placas-historicas"
                          checked={confirmarPlacasHistoricas === false}
                          onChange={() => setConfirmarPlacasHistoricas(false)}
                        />
                        <span>No, ignorar esa columna y conservar las placas vigentes que ya tenga cada unidad.</span>
                      </label>
                    </fieldset>
                  )}
                {resultado.jefaturasNoEncontradas.length > 0 && (
                  <div className="text-sm text-error bg-error-container/20 rounded-lg p-3 space-y-2">
                    <p><strong>Falta o no se reconoció la Jefatura en {resultado.jefaturasNoEncontradas.length} fila(s).</strong> Las unidades existentes conservarán su departamento; las altas nuevas quedarán sin departamento y se señalarán como incompletas.</p>
                    <ul className="max-h-32 overflow-y-auto space-y-1 list-disc pl-5">
                      {resultado.jefaturasNoEncontradas.map((fila) => <li key={`jefatura-${fila.filaExcel}`}>Fila {fila.filaExcel}, económico {fila.economico || "sin dato"}: {fila.jefatura || "sin Jefatura indicada"}</li>)}
                    </ul>
                  </div>
                )}
                {resultado.altasSinNumeroSerie.length > 0 && (
                  <div className="text-sm text-error bg-error-container/20 rounded-lg p-3 space-y-2">
                    <p><strong>{resultado.altasSinNumeroSerie.length} fila(s) nueva(s) no se pueden dar de alta sin número de serie.</strong> Se omitirán para preservar la llave de identidad de la unidad.</p>
                    <ul className="max-h-32 overflow-y-auto space-y-1 list-disc pl-5">
                      {resultado.altasSinNumeroSerie.map((fila) => <li key={`sin-serie-${fila.filaExcel}`}>Fila {fila.filaExcel}, económico {fila.economico}</li>)}
                    </ul>
                  </div>
                )}
                {resultado.conflictos.length > 0 && (
                  <div className="text-sm text-error bg-error-container/20 rounded-lg p-3 space-y-2">
                    <p><strong>{resultado.conflictos.length} conflicto(s) detectado(s).</strong> Se notifican y se omiten sólo las filas que no pueden identificarse de forma segura:</p>
                    <ul className="max-h-32 overflow-y-auto space-y-1 list-disc pl-5">
                      {resultado.conflictos.map((fila) => <li key={`conflicto-${fila.filaExcel}`}>Fila {fila.filaExcel}, económico {fila.economico || "sin dato"}: {fila.motivo}</li>)}
                    </ul>
                  </div>
                )}
                {resultado.duplicados.length > 0 && (
                  <div className="text-sm text-error bg-error-container/20 rounded-lg p-3 space-y-2">
                    <p><strong>{resultado.duplicados.length} repetición(es) exacta(s) de fila.</strong> Sólo se omiten esas copias idénticas; compartir placas no descarta una unidad.</p>
                    <ul className="max-h-32 overflow-y-auto space-y-1 list-disc pl-5">
                      {resultado.duplicados.map((fila) => <li key={`duplicado-${fila.filaExcel}`}>Fila {fila.filaExcel}, económico {fila.economico || "sin dato"}: {fila.motivo}</li>)}
                    </ul>
                  </div>
                )}
                <p className="text-sm text-on-surface-variant">
                Se actualizarán las unidades existentes y se darán de alta sólo las filas nuevas con número de serie. Los datos operativos y el historial persistido no se reemplazan por los datos del archivo.
                </p>
                <div className="flex justify-end gap-2">
                  <button type="button" onClick={cerrar} className="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg">Cancelar</button>
                  <button
                    type="button"
                    onClick={() => confirmar().catch((error) => {
                      setErrorMensaje(error.message);
                      setFase(FASES.INACTIVO);
                    })}
                    disabled={(resultado.actualizaciones.length === 0 && resultado.altasValidas.length === 0)
                      || (resultado.placasVigentesFuente?.requiereConfirmacion
                        && resultado.placasVigentesFuente.valoresCapturados > 0
                        && confirmarPlacasHistoricas === null)}
                    className="px-4 py-2 bg-primary text-on-primary rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Confirmar carga
                  </button>
                </div>
              </>
            )}
            {fase === FASES.APLICADO && (
              <>
                <h2 className="font-title-md text-title-md text-on-surface">Carga aplicada correctamente</h2>
                <p className="text-sm text-on-surface-variant">
                  Se actualizaron {resultado?.actualizaciones.length ?? 0} unidades y se dieron de alta {resultado?.altasValidas.length ?? 0} unidades nuevas sin reemplazar datos operativos.
                </p>
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
