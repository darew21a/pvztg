import { useMemo, useState } from "react";
import TopNavBar from "../components/layout/TopNavBar.jsx";
import UnidadDetallePanel from "../components/flota/UnidadDetallePanel.jsx";
import UnidadFormNueva from "../components/flota/UnidadFormNueva.jsx";
import BarraFiltrosFlota from "../components/flota/BarraFiltrosFlota.jsx";
import TablaColumnasDinamicas from "../components/flota/TablaColumnasDinamicas.jsx";
import CargadorParqueVehicular from "../components/flota/CargadorParqueVehicular.jsx";
import { useUnidades } from "../hooks/useUnidades.js";
import { useReportes } from "../hooks/useReportes.js";
import { useFiltrosFlota, useEstadoFiltrosFlota } from "../hooks/useFiltrosFlota.js";
import { ESTADOS_UNIDAD } from "../data/unidadesStore.js";
import { agregarDepartamento, obtenerNombreDepartamento } from "../data/departamentosStore.js";
import { useDepartamentos } from "../hooks/useDepartamentos.js";
import { generarPdfFlotaVehicular } from "../utils/generarPdfFlotaVehicular.js";
import { useSearch } from "../context/SearchContext.jsx";
import { evaluarColorUnidad, CLASES_COLOR_UNIDAD } from "../utils/colorUnidad.js";

// Mapa estático obligatorio: Tailwind purga en build y no detecta clases
// armadas con template strings (`bg-${color}-container/20` no funcionaría).
const CLASES_ESTADO = {
  primary: "bg-primary-container/20 text-primary",
  secondary: "bg-secondary-container/40 text-secondary",
  tertiary: "bg-tertiary-container/20 text-tertiary",
  error: "bg-error-container/40 text-error",
};

function obtenerPlacaVigente(unidad) {
  const placaOriginal = (unidad?.placas ?? "").trim();
  const placa2025 = (unidad?.placas2025 ?? "").trim();

  if (!placaOriginal && !placa2025) return null;
  if (!placa2025) return placaOriginal;
  if (/^VENCE|^CADUCA|^EXPIRA|^VENC/i.test(placa2025) || /\bVENCE\b|\d{1,2}\/\d{1,2}\/\d{4}/i.test(placa2025)) {
    return placaOriginal || placa2025;
  }
  return placa2025 || placaOriginal;
}

function normalizarBusqueda(valor) {
  return String(valor ?? "").trim().toLowerCase();
}

function filtrarUnidadesPorBusqueda(unidades, texto) {
  const termino = normalizarBusqueda(texto);
  if (!termino) return unidades;

  return unidades.filter((unidad) => {
    const economico = normalizarBusqueda(unidad.economico);
    const placa = normalizarBusqueda(obtenerPlacaVigente(unidad));
    return economico.includes(termino) || placa.includes(termino);
  });
}

function ModuloFlotaPage({ vistaInicial = "flota" }) {
  const unidades = useUnidades();
  const departamentos = useDepartamentos();
  const reportes = useReportes();
  const { query } = useSearch();
  const [vistaActual, setVistaActual] = useState(vistaInicial);
  const [unidadSeleccionadaId, setUnidadSeleccionadaId] = useState(null);
  const [mostrarAltaUnidad, setMostrarAltaUnidad] = useState(false);

  const unidadesBuscadas = useMemo(() => filtrarUnidadesPorBusqueda(unidades, query), [unidades, query]);
  const unidadesConEconomico = useMemo(() => unidadesBuscadas.filter((unidad) => unidad.economico), [unidadesBuscadas]);

  const gruposPorDepartamento = useMemo(() => {
    const grupos = new Map();
    unidadesConEconomico.forEach((unidad) => {
      const clave = unidad.departamento ?? "sin-departamento";
      const lista = grupos.get(clave) ?? [];
      lista.push(unidad);
      grupos.set(clave, lista);
    });
    return grupos;
  }, [unidadesConEconomico]);

  function descargarFlotaVehicular() {
    const url = generarPdfFlotaVehicular({ departamentos, unidades: unidadesConEconomico });
    if (!url) return;
    const link = document.createElement("a");
    link.href = url;
    link.download = "flota-vehicular.pdf";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  }

  function handleAgregarDepartamento() {
    const nombre = window.prompt("Nombre del nuevo departamento:");
    if (!nombre || !nombre.trim()) return;
    agregarDepartamento({ nombre: nombre.trim() });
  }

  const unidadSeleccionada = unidades.find((unidad) => unidad.id === unidadSeleccionadaId) ?? null;

  return (
    <>
      <TopNavBar activeTab="Operaciones" searchPlaceholder={vistaActual === "indice" ? "Buscar placa o económico..." : "Buscar unidad, placa o conductor..."} />
      <main className="flex-1 overflow-auto custom-scrollbar p-margin-desktop bg-surface-container-low space-y-8">
        <div className="flex justify-between items-center gap-4">
          <div>
            <h1 className="font-headline-lg text-headline-lg text-on-surface">Flota Vehicular</h1>
            <p className="font-body-md text-body-md text-on-surface-variant">
              {vistaActual === "indice"
                ? `${unidadesBuscadas.length} unidades visibles en el índice`
                : `Total general: ${unidadesConEconomico.length} unidades en todos los departamentos`}
            </p>
          </div>
          <div className="flex flex-wrap justify-end gap-2">
            <div className="inline-flex rounded-lg border border-outline-variant overflow-hidden bg-surface-container-lowest">
              <button
                type="button"
                onClick={() => setVistaActual("flota")}
                className={`px-3 py-2 text-sm font-medium ${vistaActual === "flota" ? "bg-primary text-on-primary" : "text-on-surface-variant"}`}
              >
                Flota
              </button>
              <button
                type="button"
                onClick={() => setVistaActual("indice")}
                className={`px-3 py-2 text-sm font-medium ${vistaActual === "indice" ? "bg-primary text-on-primary" : "text-on-surface-variant"}`}
              >
                Índice de Unidades
              </button>
            </div>
            <CargadorParqueVehicular unidades={unidades} departamentos={departamentos} />
            <button
              type="button"
              onClick={handleAgregarDepartamento}
              className="px-4 py-2 bg-secondary text-on-secondary rounded-lg font-label-sm text-label-sm flex items-center gap-2 hover:bg-secondary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
               Nuevo departamento
            </button>
            <button
              type="button"
              onClick={descargarFlotaVehicular}
              className="px-4 py-2 border border-primary text-primary rounded-lg font-label-sm text-label-sm flex items-center gap-2 hover:bg-primary-container/20 transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">download</span>
              Descargar flota vehicular
            </button>
            <button
              onClick={() => setMostrarAltaUnidad(true)}
              className="px-4 py-2 bg-primary text-on-primary rounded-lg font-label-sm text-label-sm flex items-center gap-2 hover:bg-secondary transition-colors"
            >
              <span className="material-symbols-outlined text-[18px]">add_circle</span>
              Agregar unidad nueva
            </button>
          </div>
        </div>

        {vistaActual === "indice" ? (
          <IndiceUnidadesVista unidades={unidadesBuscadas} onSeleccionarUnidad={setUnidadSeleccionadaId} reportes={reportes} searchQuery={query} />
        ) : (
          <>
            {departamentos.map((departamento) => (
              <GrupoDepartamento
                key={departamento.id}
                nombreDepartamento={departamento.nombre}
                unidadesDelGrupo={gruposPorDepartamento.get(departamento.id) ?? []}
                onSeleccionarUnidad={setUnidadSeleccionadaId}
                searchQuery={query}
              />
            ))}
            {gruposPorDepartamento.has("sin-departamento") && (
              <GrupoDepartamento
                nombreDepartamento={obtenerNombreDepartamento(null)}
                unidadesDelGrupo={gruposPorDepartamento.get("sin-departamento")}
                onSeleccionarUnidad={setUnidadSeleccionadaId}
                searchQuery={query}
                destacarComoPendiente
              />
            )}
          </>
        )}
      </main>

      {unidadSeleccionada && (
        <UnidadDetallePanel unidad={unidadSeleccionada} onCerrar={() => setUnidadSeleccionadaId(null)} />
      )}
      {mostrarAltaUnidad && <UnidadFormNueva onCerrar={() => setMostrarAltaUnidad(false)} />}
    </>
  );
}

function IndiceUnidadesVista({ unidades, onSeleccionarUnidad, reportes, searchQuery }) {
  const unidadesEvaluadas = useMemo(
    () => unidades.map((unidad, indice) => ({ numero: indice + 1, unidad, ...evaluarColorUnidad(unidad, unidades, reportes) })),
    [unidades, reportes],
  );

  return (
    <div className="space-y-4">
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
                onClick={() => onSeleccionarUnidad(unidad.id)}
                data-search-match={JSON.stringify(unidad).toLowerCase().includes(String(searchQuery ?? "").toLowerCase()) ? "true" : undefined}
                title={razones.join(" · ") || "Sin alertas"}
                className={`cursor-pointer hover:brightness-95 transition-all ${color ? CLASES_COLOR_UNIDAD[color].fila : ""}`}
              >
                <td className="p-3 font-technical-mono text-technical-mono text-on-surface-variant">{numero}</td>
                <td className="p-3 font-technical-mono text-technical-mono">{unidad.economico ?? "Pendiente"}</td>
                <td className="p-3">{unidad.marca ?? ""} {unidad.submarca ?? ""}</td>
                <td className="p-3">{obtenerPlacaVigente(unidad) ?? "-"}</td>
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
    </div>
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

/**
 * Un departamento completo: encabezado, su propio filtro (Placa/Económico,
 * vía el núcleo centralizado) y su propia tabla filtrada. Cada instancia
 * de este componente maneja su estado de filtro de forma independiente -
 * filtrar el departamento de Líneas no afecta al de Subestaciones.
 */
function GrupoDepartamento({ nombreDepartamento, unidadesDelGrupo, onSeleccionarUnidad, searchQuery, destacarComoPendiente = false }) {
  const { filtros, setFiltro, limpiarFiltros } = useEstadoFiltrosFlota();

  const extractores = useMemo(
    () => ({
      obtenerPlaca: (unidad) => obtenerPlacaVigente(unidad),
      obtenerEconomico: (unidad) => unidad.economico,
    }),
    [],
  );
  const unidadesFiltradas = useFiltrosFlota(unidadesDelGrupo, filtros, extractores);
  const unidadesNumeradas = useMemo(
    () => unidadesFiltradas.map((unidad, indice) => ({ ...unidad, numeroDepartamento: indice + 1 })),
    [unidadesFiltradas],
  );

  function estadoInfo(valor) {
    return ESTADOS_UNIDAD.find((estado) => estado.value === valor) ?? ESTADOS_UNIDAD[1];
  }

  const columnas = useMemo(
    () => [
      { key: "numeroDepartamento", label: "No.", render: (u) => u.numeroDepartamento },
      { key: "economico", label: "Económico", render: (u) => u.economico ?? "Pendiente" },
      { key: "marcaSubmarca", label: "Marca / Submarca", render: (u) => `${u.marca ?? ""} ${u.submarca ?? ""}` },
      { key: "conductorAsignado", label: "Resguardante", render: (u) => u.conductorAsignado ?? "Sin asignar" },
      { key: "placas", label: "Placas 2025", render: (u) => obtenerPlacaVigente(u) ?? "-" },
      { key: "kilometraje", label: "Kilometraje", alinearDerecha: true, render: (u) => (u.kilometraje ? `${u.kilometraje.toLocaleString("es-MX")} km` : "Sin capturar") },
      { key: "tipoCombustible", label: "Combustible", render: (u) => u.tipoCombustible ?? "Sin capturar" },
      {
        key: "estado",
        label: "Estado",
        render: (u) => {
          const estado = estadoInfo(u.estado);
          return (
            <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium uppercase ${CLASES_ESTADO[estado.color]}`}>
              {estado.label}
            </span>
          );
        },
      },
    ],
    [],
  );

  return (
    <section className="space-y-3">
      <div className="flex items-center gap-2">
        <span className={`material-symbols-outlined ${destacarComoPendiente ? "text-tertiary" : "text-primary"}`}>
          {destacarComoPendiente ? "warning" : "corporate_fare"}
        </span>
        <h2 className="font-title-md text-title-md text-on-surface">{nombreDepartamento}</h2>
        <span className="font-label-sm text-label-sm text-on-surface-variant">
          ({unidadesDelGrupo.length} unidad{unidadesDelGrupo.length === 1 ? "" : "es"})
        </span>
      </div>

      {unidadesDelGrupo.length === 0 ? (
        <p className="font-body-md text-body-md text-on-surface-variant text-sm pl-8">Sin unidades asignadas a este departamento todavía.</p>
      ) : (
        <div className="pl-8 space-y-3">
          <BarraFiltrosFlota
            filtros={filtros}
            setFiltro={setFiltro}
            limpiarFiltros={limpiarFiltros}
            camposVisibles={["placa", "economico"]}
          />
          <TablaColumnasDinamicas
            filas={unidadesNumeradas}
            columnas={columnas}
            obtenerLlave={(unidad) => unidad.id}
            onFilaClick={(unidad) => onSeleccionarUnidad(unidad.id)}
            searchQuery={searchQuery}
            resaltarFilas={Object.values(filtros).some(Boolean)}
          />
        </div>
      )}
    </section>
  );
}

export default ModuloFlotaPage;
