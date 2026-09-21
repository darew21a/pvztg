import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useSearch } from "../../context/SearchContext.jsx";
import { useUnidades } from "../../hooks/useUnidades.js";
import { useReportes } from "../../hooks/useReportes.js";
import { useTicketsCombustible } from "../../hooks/useTicketsCombustible.js";
import { useCargasEdenred } from "../../hooks/useTransaccionesEdenred.js";
import { coincideBusqueda } from "../../utils/coincideBusqueda.js";

const NAV_TABS = ["Resumen", "Operaciones", "Administrar Reportes-Edenred"];

/**
 * Header superior compartido (búsqueda, notificaciones, perfil).
 * `title` permite reutilizarlo con el título de cada página; `activeTab`
 * resalta el tab correspondiente, tal como el prototipo distinguía
 * "Alertas" activo en Auditoría vs. "Operaciones" en Flota, etc.
 */
function TopNavBar({ activeTab = "Resumen", searchPlaceholder = "Buscar..." }) {
  const { query, setQuery, mostrarResultados, setMostrarResultados } = useSearch();
  const navigate = useNavigate();
  const unidades = useUnidades();
  const reportes = useReportes();
  const tickets = useTicketsCombustible();
  const cargasEdenred = useCargasEdenred();

  const resultados = useMemo(() => {
    if (!query.trim()) return [];
    const resultadosEncontrados = [];
    const unidadesPorId = new Map(unidades.map((unidad) => [unidad.id, unidad]));
    const agregar = (apartado, ruta, elemento, detalle) => {
      if (coincideBusqueda(elemento, query)) resultadosEncontrados.push({ id: `${apartado}-${elemento.id ?? detalle}`, apartado, ruta, detalle });
    };
    unidades.forEach((unidad) => {
      const detalle = `${unidad.economico ?? unidad.numeroSerie?.slice(-6) ?? "Unidad"} - ${unidad.marca ?? ""} ${unidad.submarca ?? ""}`.trim();
      agregar("Dashboard", "/dashboard", unidad, detalle);
      agregar("Unidades", "/flota", unidad, detalle);
      agregar("Índice de unidades", "/indice-unidades", unidad, detalle);
      agregar("Análisis de combustible", "/analisis-combustible", unidad, detalle);
    });
    tickets.forEach((ticket) => agregar("Tickets Bomba", "/tickets-combustible", { ...ticket, unidad: unidadesPorId.get(ticket.unidadId) }, `Recarga ${unidadesPorId.get(ticket.unidadId)?.economico ?? ticket.id}`));
    reportes.forEach((reporte) => agregar("Reportes", "/reportes", { ...reporte, unidades: (reporte.unidadesIds ?? []).map((id) => unidadesPorId.get(id)) }, reporte.folio ?? `Reporte ${reporte.id}`));
    cargasEdenred.forEach((carga) => agregar("Edenred", "/auditoria-edenred", carga, `Periodo ${(carga.periodo ?? []).join(", ")}`));
    return resultadosEncontrados.slice(0, 30);
  }, [cargasEdenred, query, reportes, tickets, unidades]);

  function abrirResultado(resultado) {
    setMostrarResultados(false);
    navigate(resultado.ruta);
  }

  return (
    <header className="bg-white/80 backdrop-blur-md border-b border-outline-variant/30 shadow-sm sticky top-0 z-40 flex justify-between items-center w-full px-margin-desktop h-16">
      <div className="flex items-center gap-8">
        <h2 className="font-title-md text-title-md font-bold text-primary hidden md:block">
          Sistema de Gestión de Flota
        </h2>
        <nav className="hidden md:flex gap-6 h-full items-center">
          {NAV_TABS.map((tab) => (
            <a
              key={tab}
              href="#"
              className={
                tab === activeTab
                  ? "text-primary border-b-2 border-primary pb-1 font-body-md text-body-md translate-y-[1px]"
                  : "text-on-surface-variant hover:text-primary transition-colors font-body-md text-body-md"
              }
            >
              {tab}
            </a>
          ))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <span className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <span className="material-symbols-outlined text-outline">search</span>
          </span>
          <input
            className="pl-10 pr-4 py-2 border-none border-b border-outline-variant focus:border-b-2 focus:border-secondary-container bg-surface-container-lowest rounded-t-md font-body-md text-body-md text-on-surface focus:ring-0 transition-colors w-64"
            placeholder={searchPlaceholder}
            type="text"
            value={query}
            onFocus={() => query.trim() && setMostrarResultados(true)}
            onChange={(event) => {
              setQuery(event.target.value);
              setMostrarResultados(true);
            }}
            onKeyDown={(event) => event.key === "Enter" && resultados[0] && abrirResultado(resultados[0])}
          />
          {query.trim() && mostrarResultados && (
            <div className="absolute right-0 top-full mt-2 w-[min(28rem,calc(100vw-2rem))] max-h-80 overflow-y-auto rounded-lg border border-outline-variant bg-surface-container-lowest shadow-xl z-50">
              {resultados.length === 0 ? <p className="p-3 text-sm text-on-surface-variant">No se encontraron coincidencias.</p> : resultados.map((resultado) => (
                <button key={resultado.id} type="button" onClick={() => abrirResultado(resultado)} className="w-full text-left px-3 py-2 border-b border-outline-variant/20 last:border-b-0 hover:bg-green-100 transition-colors">
                  <span className="block text-xs font-semibold uppercase text-primary">{resultado.apartado}</span>
                  <span className="block text-sm text-on-surface truncate">{resultado.detalle}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button className="w-10 h-10 rounded-full hover:bg-surface-container transition-colors flex items-center justify-center text-on-surface-variant relative">
          <span className="material-symbols-outlined">notifications</span>
        </button>
        <div className="w-8 h-8 rounded-full bg-primary-container text-on-primary-container flex items-center justify-center overflow-hidden border border-outline-variant cursor-pointer">
          <span className="material-symbols-outlined text-[20px]">account_circle</span>
        </div>
      </div>
    </header>
  );
}

export default TopNavBar;
