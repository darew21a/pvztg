import { useEffect, useRef, useState } from "react";
import { ESTADOS_UNIDAD, TIPOS_COMBUSTIBLE, actualizarUnidad, agregarDocumentoUnidad, darDeBajaUnidad, registrarConsumoMensual } from "../../data/unidadesStore.js";
import { DEPARTAMENTOS } from "../../data/departamentos.js";
import CampoUnidad from "./CampoUnidad.jsx";
import HistorialCombustible from "./HistorialCombustible.jsx";

/**
 * ============================================================================
 * EXPEDIENTE DE UNIDAD (panel deslizable)
 * ============================================================================
 * Se abre al hacer clic en una fila de la tabla de Flota. Permite:
 *  - Ver/cambiar la fotografía de la unidad.
 *  - Editar cualquier dato capturado (los del Excel de origen + los nuevos:
 *    kilometraje, tipo de combustible, estado operativo).
 *  - Subir documentos (seguro, tarjeta de circulación, otros) en PDF; el
 *    historial se conserva ordenado por fecha, nunca se sobreescribe.
 *  - Dar de baja la unidad (baja lógica: se conserva el registro).
 *
 * Los cambios se editan en un borrador local (`draft`) y solo se aplican al
 * store global al presionar "Guardar cambios" — así un clic accidental en un
 * campo no altera el dato real hasta confirmar.
 * ============================================================================
 */
function UnidadDetallePanel({ unidad, onCerrar }) {
  const [draft, setDraft] = useState(unidad);
  const inputImagenRef = useRef(null);
  const inputDocumentoRef = useRef(null);

  // Si el usuario abre otra unidad sin cerrar el panel, el borrador se
  // reinicia con los datos de la nueva unidad seleccionada.
  useEffect(() => {
    setDraft(unidad);
  }, [unidad]);

  function actualizarCampo(name, value) {
    setDraft((anterior) => ({ ...anterior, [name]: value }));
  }

  function guardarCambios() {
    actualizarUnidad(unidad.id, draft);
    onCerrar();
  }

  function manejarCambioImagen(event) {
    const archivo = event.target.files?.[0];
    if (!archivo) return;
    // TODO: cuando exista el backend, subir el archivo real; por ahora se
    // usa una URL de objeto local para previsualizar en esta sesión.
    const urlLocal = URL.createObjectURL(archivo);
    actualizarCampo("imagenUrl", urlLocal);
  }

  // 1. MODIFICA LA FUNCIÓN PARA CARGAR DOCUMENTOS EN EL DRAFT LOCAL
function manejarCargaDocumento(tipoDocumento) {
  return (event) => {
    const archivo = event.target.files?.[0];
    if (!archivo) return;

    const nuevoDocumento = {
      tipo: tipoDocumento,
      nombreArchivo: archivo.name,
      fechaCarga: new Date().toISOString(),
      url: URL.createObjectURL(archivo),
    };

    // CORRECCIÓN: Actualizamos el borrador local (draft) para que React redibuje la pantalla de inmediato
    setDraft((anterior) => ({
      ...anterior,
      documentos: [...(anterior.documentos || []), nuevoDocumento],
    }));

    event.target.value = "";
  };
}

  function confirmarBaja() {
    if (window.confirm(`¿Dar de baja la unidad ${unidad.economico ?? unidad.numeroSerie}? El registro se conserva en el historial.`)) {
      darDeBajaUnidad(unidad.id);
      onCerrar();
    }
  }

  const documentosPorTipo = (tipo) => draft.documentos.filter((documento) => documento.tipo === tipo);

  return (
    <>
      <div className="fixed inset-0 bg-on-surface/40 backdrop-blur-sm z-50 transition-opacity" onClick={onCerrar}></div>
      <aside className="fixed top-0 right-0 h-full w-full max-w-2xl bg-surface-container-lowest shadow-2xl z-50 overflow-y-auto custom-scrollbar">
        {/* Encabezado con imagen de la unidad */}
        <div className="relative h-48 bg-surface-container-high">
          {draft.imagenUrl ? (
            <img src={draft.imagenUrl} alt={`Unidad ${draft.economico ?? draft.numeroSerie}`} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-on-surface-variant">
              <span className="material-symbols-outlined text-6xl">directions_car</span>
            </div>
          )}
          <button
            onClick={() => inputImagenRef.current?.click()}
            className="absolute bottom-3 right-3 bg-surface-container-lowest/90 backdrop-blur px-3 py-2 rounded-lg shadow-sm font-label-sm text-label-sm flex items-center gap-2 hover:bg-surface-container-lowest transition-colors"
          >
            <span className="material-symbols-outlined text-[18px]">photo_camera</span>
            Cambiar foto
          </button>
          <input ref={inputImagenRef} type="file" accept="image/*" className="hidden" onChange={manejarCambioImagen} />
          <button onClick={onCerrar} className="absolute top-3 right-3 w-9 h-9 rounded-full bg-surface-container-lowest/90 backdrop-blur flex items-center justify-center hover:bg-error-container/40 hover:text-error transition-colors">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="p-6 space-y-8">
          {/* Estado operativo: lo decide el auditor manualmente */}
          <div className="space-y-2">
            <span className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide">Estado de la unidad</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {ESTADOS_UNIDAD.map((estado) => (
                <button
                  key={estado.value}
                  onClick={() => actualizarCampo("estado", estado.value)}
                  className={`py-2 px-2 rounded-lg font-label-sm text-label-sm transition-all border ${
                    draft.estado === estado.value
                      ? "bg-primary text-on-primary border-primary"
                      : "bg-transparent text-on-surface-variant border-outline-variant hover:bg-surface-container-high"
                  }`}
                >
                  {estado.label}
                </button>
              ))}
            </div>
          </div>

          {/* Datos operativos nuevos (no vienen del Excel de origen) */}
          <div className="grid grid-cols-2 gap-4">
            <CampoUnidad label="Kilometraje" name="kilometraje" type="number" value={draft.kilometraje} onChange={actualizarCampo} />
            <div className="space-y-1">
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide" htmlFor="campo-tipoCombustible">
                Tipo de combustible
              </label>
              <select
                id="campo-tipoCombustible"
                value={draft.tipoCombustible ?? ""}
                onChange={(event) => actualizarCampo("tipoCombustible", event.target.value)}
                className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-on-surface font-body-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
              >
                <option value="">Sin capturar</option>
                {TIPOS_COMBUSTIBLE.map((tipo) => (
                  <option key={tipo} value={tipo}>{tipo}</option>
                ))}
              </select>
            </div>
            <div className="space-y-1 col-span-2">
              <label className="block font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wide" htmlFor="campo-departamento">
                Departamento (define qué Jefe de Departamento la ve)
              </label>
                <select
               id="campo-departamento"
               value={draft.departamento ?? draft.departamentoId ?? ""}
                onChange={(event) => {
                const valor = event.target.value;
               setDraft((anterior) => ({
               ...anterior,
              departamento: valor,   // Mantiene tu propiedad actual
               departamentoId: valor, // CORRECCIÓN: Asegura que el perfil del departamento pueda encontrar el ID
               }));
             }}
               className="w-full px-3 py-2 border border-outline-variant rounded-md bg-surface-bright text-on-surface font-body-md text-sm focus:outline-none focus:border-primary focus:ring-1 focus:ring-primary transition-colors"
             >
                <option value="">Sin asignar</option>
                {DEPARTAMENTOS.map((departamento) => (
                <option key={departamento.id} value={departamento.id}>{departamento.nombre}</option>
              ))}
               </select>
            </div>
          </div>

          {/* Datos del vehículo (origen: Excel de parque vehicular) */}
          <div className="space-y-3">
            <h3 className="font-title-md text-title-md text-on-surface border-b border-outline-variant/30 pb-2">Datos del vehículo</h3>
            <div className="grid grid-cols-2 gap-4">
              <CampoUnidad label="Número económico" name="economico" value={draft.economico} onChange={actualizarCampo} />
              <CampoUnidad label="Conductor asignado" name="conductorAsignado" value={draft.conductorAsignado} onChange={actualizarCampo} />
              <CampoUnidad label="Conductor asignado 2 (si aplica)" name="conductorAsignado2" value={draft.conductorAsignado2} onChange={actualizarCampo} />
              <CampoUnidad label="Marca" name="marca" value={draft.marca} onChange={actualizarCampo} />
              <CampoUnidad label="Submarca" name="submarca" value={draft.submarca} onChange={actualizarCampo} />
              <CampoUnidad label="Tipo" name="tipo" value={draft.tipo} onChange={actualizarCampo} />
              <CampoUnidad label="Modelo (año)" name="modelo" value={draft.modelo} onChange={actualizarCampo} />
              <CampoUnidad label="Placas" name="placas" value={draft.placas} onChange={actualizarCampo} />
              <CampoUnidad label={`Placas vigentes ${new Date().getFullYear()}`} name="placas2025" value={draft.placas2025} onChange={actualizarCampo} />
              <CampoUnidad label="No. de serie (VIN)" name="numeroSerie" value={draft.numeroSerie} onChange={actualizarCampo} />
              <CampoUnidad label="R.P.E. resguardante" name="rpeResguardante" value={draft.rpeResguardante} onChange={actualizarCampo} />
              <CampoUnidad label="Centro gestor" name="centroGestor" value={draft.centroGestor} onChange={actualizarCampo} />
              <CampoUnidad label="Centro de costos" name="centroCostos" value={draft.centroCostos} onChange={actualizarCampo} />
              <CampoUnidad label="Ubicación técnica" name="ubicacionTecnica" value={draft.ubicacionTecnica} onChange={actualizarCampo} />
              <CampoUnidad label="Arrendadora" name="arrendadora" value={draft.arrendadora} onChange={actualizarCampo} />
            </div>
          </div>

          {/* Historial de combustible: alimentado por el análisis de Edenred */}
          <div className="space-y-3">
            <h3 className="font-title-md text-title-md text-on-surface border-b border-outline-variant/30 pb-2">Historial de Combustible</h3>
            <HistorialCombustible
              historial={draft.historialCombustible}
              onEditar={(mes, cambios) => registrarConsumoMensual(unidad.id, { mes, ...cambios })}
            />
          </div>

          {/* Documentación: seguro y tarjeta de circulación, historial por fecha */}
          <div className="space-y-4">
            <h3 className="font-title-md text-title-md text-on-surface border-b border-outline-variant/30 pb-2">Documentación</h3>
            {[
              { tipo: "seguro", etiqueta: "Póliza de seguro" },
              { tipo: "tarjeta-circulacion", etiqueta: "Tarjeta de circulación" },
            ].map(({ tipo, etiqueta }) => (
              <div key={tipo} className="border border-outline-variant/40 rounded-lg p-4 space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-body-md text-body-md text-on-surface font-medium">{etiqueta}</span>
                  <label className="cursor-pointer font-label-sm text-label-sm text-primary hover:text-secondary transition-colors flex items-center gap-1">
                    <span className="material-symbols-outlined text-[18px]">upload_file</span>
                    Subir nueva versión
                    <input type="file" accept="application/pdf" className="hidden" onChange={manejarCargaDocumento(tipo)} />
                  </label>
                </div>
                {documentosPorTipo(tipo).length === 0 ? (
                  <p className="font-body-md text-body-md text-on-surface-variant text-sm">Sin documentos cargados todavía.</p>
                ) : (
                  <ul className="space-y-1">
                    {documentosPorTipo(tipo).map((documento) => (
                      <li key={documento.fechaCarga} className="flex justify-between items-center text-sm">
                        <span className="text-on-surface-variant">
                          {new Date(documento.fechaCarga).toLocaleDateString("es-MX", { year: "numeric", month: "long", day: "numeric" })}
                        </span>
                        <a href={documento.url} download={documento.nombreArchivo} className="text-primary hover:underline flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">download</span>
                          Descargar
                        </a>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            ))}
          </div>

          {/* Acciones */}
          <div className="flex items-center justify-between pt-4 border-t border-outline-variant/30">
            <button onClick={confirmarBaja} className="font-label-sm text-label-sm text-error hover:underline flex items-center gap-1">
              <span className="material-symbols-outlined text-[18px]">delete</span>
              Dar de baja unidad
            </button>
            <div className="flex gap-2">
              <button onClick={onCerrar} className="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface transition-colors">
                Cancelar
              </button>
              <button onClick={guardarCambios} className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-secondary transition-colors">
                Guardar cambios
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}

export default UnidadDetallePanel;
