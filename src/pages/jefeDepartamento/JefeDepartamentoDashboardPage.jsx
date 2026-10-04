import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import logoCfe from "../../assets/logo-cfe.png";
import { useAuth } from "../../hooks/useAuth.js";
import { useUnidades } from "../../hooks/useUnidades.js";
import { obtenerNombreDepartamento } from "../../data/departamentosStore.js";
import { ESTADOS_UNIDAD } from "../../data/unidadesStore.js";
import ModalLevantarReporte from "../../components/jefeDepartamento/ModalLevantarReporte.jsx";
import ModalCargarCombustible from "../../components/jefeDepartamento/ModalCargarCombustible.jsx";
import PanelDocumentosSoloLectura from "../../components/jefeDepartamento/PanelDocumentosSoloLectura.jsx";
import NumeroEconomico from "../../components/flota/NumeroEconomico.jsx";
import AvatarUsuario from "../../components/perfil/AvatarUsuario.jsx";
import SeguimientoReportes from "../../components/reportes/SeguimientoReportes.jsx";
import { useReportes } from "../../hooks/useReportes.js";

// Mismo mapa estático que usa Flota - Tailwind no puede purgar clases armadas con template strings.
const CLASES_ESTADO = {
  primary: "bg-primary-container/20 text-primary",
  secondary: "bg-secondary-container/40 text-secondary",
  tertiary: "bg-tertiary-container/20 text-tertiary",
  error: "bg-error-container/40 text-error",
};

/**
 * ============================================================================
 * PANEL DEL JEFE DE DEPARTAMENTO
 * ============================================================================
 * Vista de solo lectura de las unidades de su departamento (asignadas por
 * el Administrador desde el Expediente en Flota). No puede editar nada -
 * solo confirmar que sus datos están correctos, levantar reportes formales
 * y descargar documentos históricos.
 * ============================================================================
 */
function JefeDepartamentoDashboardPage() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();
  const todasLasUnidades = useUnidades();
  const reportes = useReportes();
  const [mostrarReporte, setMostrarReporte] = useState(false);
  const [mostrarCombustible, setMostrarCombustible] = useState(false);
  const [unidadDocumentos, setUnidadDocumentos] = useState(null);

  const unidadesDelDepartamento = useMemo(
    () => {
      const departamentoId = usuario?.departamentoId;
      const departamentoNombre = usuario?.departamento;
      if (departamentoId !== null && departamentoId !== undefined && String(departamentoId).trim() !== "") {
        return todasLasUnidades.filter((unidad) => String(unidad.departamentoId ?? "") === String(departamentoId));
      }
      if (departamentoNombre) {
        return todasLasUnidades.filter((unidad) => unidad.departamento === departamentoNombre);
      }
      return [];
    },
    [todasLasUnidades, usuario?.departamento, usuario?.departamentoId],
  );

  function estadoInfo(valor) {
    return ESTADOS_UNIDAD.find((estado) => estado.value === valor) ?? ESTADOS_UNIDAD[1];
  }

  function handleCerrarSesion() {
    logout();
    navigate("/");
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header propio del Jefe de Departamento - no usa el SideNavBar del Administrador (alcance distinto). */}
      <header className="bg-surface-container-lowest border-b border-outline-variant px-margin-mobile md:px-margin-desktop py-3 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <img src={logoCfe} alt="Comisión Federal de Electricidad" className="h-8 w-auto" />
          <div>
            <p className="font-title-md text-title-md text-on-surface leading-tight">{obtenerNombreDepartamento(usuario.departamentoId ?? usuario.departamento)}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Jefe de Departamento {usuario.nombre}</p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigate("/perfil")}
            className="flex items-center gap-2 rounded-full border border-outline-variant bg-surface-container px-2 py-1.5 text-left transition hover:border-primary hover:text-primary"
            aria-label="Ir a mi perfil"
          >
            <AvatarUsuario nombre={usuario?.nombre} className="h-9 w-9" />
            <span className="hidden sm:block text-sm font-medium text-on-surface">Mi perfil</span>
          </button>
          <button onClick={handleCerrarSesion} className="px-3 py-2 text-on-surface-variant hover:text-error font-label-sm text-label-sm flex items-center gap-1 transition-colors">
            <span className="material-symbols-outlined text-[18px]">logout</span>
            Cerrar sesión
          </button>
        </div>
      </header>

      <main className="p-margin-mobile md:p-margin-desktop space-y-6">
        <div className="flex flex-wrap justify-between items-center gap-3">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Unidades de mi departamento</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {unidadesDelDepartamento.length} unidad(es) verifica que tus datos estén correctos.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => setMostrarCombustible(true)}
              className="px-4 py-2 border border-outline-variant text-on-surface-variant rounded-lg font-label-sm text-label-sm hover:bg-surface transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">local_gas_station</span>
              Cargar combustible
            </button>
            <button
              onClick={() => setMostrarReporte(true)}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm hover:bg-secondary transition-colors flex items-center gap-1"
            >
              <span className="material-symbols-outlined text-[18px]">report</span>
              Levantar reporte
            </button>
          </div>
        </div>

        {unidadesDelDepartamento.length === 0 ? (
          <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-8 text-center">
            <span className="material-symbols-outlined text-5xl text-outline-variant">directions_car_filled</span>
            <p className="font-body-md text-body-md text-on-surface-variant mt-2">
              Todavía no hay unidades asignadas a tu departamento. Pide al Administrador que las asigne desde el Expediente en Flota.
            </p>
          </div>
        ) : (
          <div className="table-scroll custom-scrollbar" role="region" tabIndex={0} aria-label="Unidades asignadas desplazables">
            <table className="fleet-unit-assignment-table w-full text-left">
              <thead className="bg-surface-container-high">
                <tr className="font-label-sm text-label-sm text-on-surface-variant uppercase">
                  <th>Económico</th>
                  <th>Marca / Submarca</th>
                  <th>Tipo</th>
                  <th>Modelo</th>
                  <th>No. Serie</th>
                  <th>Placas</th>
                  <th>Placas vigentes ({new Date().getFullYear()})</th>
                  <th>Centro Gestor</th>
                  <th>Centro Costos</th>
                  <th>Arrendadora</th>
                  <th>Resguardante(s)</th>
                  <th>Kilometraje</th>
                  <th>Combustible</th>
                  <th>Estado</th>
                  <th>Documentos</th>
                </tr>
              </thead>
              <tbody className="font-body-md text-body-md text-on-surface divide-y divide-outline-variant/30">
                {unidadesDelDepartamento.map((unidad) => {
                  const estado = estadoInfo(unidad.estado);
                  return (
                    <tr key={unidad.id} className="hover:bg-surface-container-low transition-colors">
                      <td><NumeroEconomico valor={unidad.economico} /></td>
                      <td>{unidad.marca} {unidad.submarca}</td>
                      <td>{unidad.tipo ?? "-"}</td>
                      <td>{unidad.modelo ?? "-"}</td>
                      <td className="font-technical-mono text-technical-mono">{unidad.numeroSerie}</td>
                      <td>{unidad.placas ?? "-"}</td>
                      <td>{unidad.placas2025 ?? "-"}</td>
                      <td>{unidad.centroGestor ?? "-"}</td>
                      <td>{unidad.centroCostos ?? "-"}</td>
                      <td>{unidad.arrendadora ?? "-"}</td>
                      <td>
                        {[unidad.conductorAsignado, unidad.conductorAsignado2].filter(Boolean).join(" y ") || "Sin asignar"}
                      </td>
                      <td>{unidad.kilometraje ? `${unidad.kilometraje.toLocaleString("es-MX")} km` : "Sin capturar"}</td>
                      <td>{unidad.tipoCombustible ?? "Sin capturar"}</td>
                      <td>
                        <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium uppercase ${CLASES_ESTADO[estado.color]}`}>
                          {estado.label}
                        </span>
                      </td>
                      <td>
                        <button onClick={() => setUnidadDocumentos(unidad)} className="text-primary hover:underline text-xs flex items-center gap-1">
                          <span className="material-symbols-outlined text-[16px]">folder_open</span>
                          Ver
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <SeguimientoReportes reportes={reportes} usuario={usuario} soloDepartamento />
      </main>

      {mostrarReporte && (
        <ModalLevantarReporte usuario={usuario} unidadesDelDepartamento={unidadesDelDepartamento} onCerrar={() => setMostrarReporte(false)} />
      )}
      {mostrarCombustible && (
        <ModalCargarCombustible usuario={usuario} unidadesDelDepartamento={unidadesDelDepartamento} onCerrar={() => setMostrarCombustible(false)} />
      )}
      {unidadDocumentos && <PanelDocumentosSoloLectura unidad={unidadDocumentos} onCerrar={() => setUnidadDocumentos(null)} />}
    </div>
  );
}

export default JefeDepartamentoDashboardPage;
