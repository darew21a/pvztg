import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useSearch } from "../../context/useSearch.js";
import { useAuth } from "../../hooks/useAuth.js";
import { useUnidades } from "../../hooks/useUnidades.js";
import { useReportes } from "../../hooks/useReportes.js";
import { useTicketsCombustible } from "../../hooks/useTicketsCombustible.js";
import { useCargasEdenred } from "../../hooks/useTransaccionesEdenred.js";
import NotificationCenter from "../ui/NotificationCenter.jsx";
import { coincideBusqueda } from "../../utils/coincideBusqueda.js";
import { detectarAnomaliasFlota } from "../../utils/detectarAnomaliasFlota.js";
import { formatearFecha } from "../../utils/formatearFecha.js";
import { obtenerCamposBusquedaUnidad } from "../../utils/busquedaUnidad.js";
import { obtenerNombreDepartamento } from "../../data/departamentosStore.js";
import { getNavItemsForRole } from "../../config/roles.js";
import AvatarUsuario from "../perfil/AvatarUsuario.jsx";

/**
 * Header superior compartido para búsqueda, notificaciones y perfil.
 */
function TopNavBar({ searchPlaceholder = "Buscar..." }) {
  const { query, setQuery, mostrarResultados, setMostrarResultados, dismissSuggestions } = useSearch();
  const { usuario } = useAuth();
  const location = useLocation();
  const { pathname } = location;
  const navigate = useNavigate();
  const [textoBusqueda, setTextoBusqueda] = useState(query);
  const unidades = useUnidades();
  const reportes = useReportes();
  const tickets = useTicketsCombustible();
  const cargasEdenred = useCargasEdenred();
  const anomalias = useMemo(() => detectarAnomaliasFlota(unidades, cargasEdenred), [unidades, cargasEdenred]);
  const searchContainerRef = useRef(null);
  const pageTitles = {
    "/dashboard": "Panel de operación",
    "/flota": "Flota vehicular",
    "/indice-unidades": "Índice de unidades",
    "/auditoria-edenred": "Auditoría Edenred",
    "/analisis-combustible": "Análisis de combustible",
    "/tickets-combustible": "Tickets de combustible",
    "/reportes": "Reportes",
    "/accesos": "Gestión de accesos",
    "/perfil": "Mi perfil",
    "/jefe-departamento": "Mi departamento",
  };
  const pageTitle = pageTitles[pathname] ?? getNavItemsForRole(usuario?.rol).find((item) => item.to === pathname)?.label ?? "Portal";

  useEffect(() => {
    const timer = window.setTimeout(() => setQuery(textoBusqueda), 250);
    return () => window.clearTimeout(timer);
  }, [setQuery, textoBusqueda]);

  useEffect(() => {
    if (!new URLSearchParams(location.search).has("anomaly")) return;
    // Route actions invalidate the previously active global search term.
    // oxlint-disable-next-line react/set-state-in-effect
    setTextoBusqueda("");
    setQuery("");
    setMostrarResultados(false);
  }, [location.key, location.search, setQuery, setMostrarResultados]);

  useEffect(() => {
    function cerrarResultados(event) {
      if (!searchContainerRef.current?.contains(event.target)) setMostrarResultados(false);
    }
    document.addEventListener("mousedown", cerrarResultados);
    return () => document.removeEventListener("mousedown", cerrarResultados);
  }, [setMostrarResultados]);

  const resultados = useMemo(() => {
    if (!query.trim()) return [];
    const resultadosEncontrados = [];
    const unidadesPorId = new Map(unidades.map((unidad) => [unidad.id, unidad]));
    const termino = query.trim().toLowerCase();
    const agregar = (apartado, ruta, elemento, detalle, campos = elemento, parametro = null, resultadoId = null) => {
      if (!coincideBusqueda(campos, query)) return;
      const valores = Object.values(campos).filter((valor) => typeof valor === "string").map((valor) => valor.toLowerCase());
      const coincidenciaExacta = valores.some((valor) => valor.trim() === termino);
      const coincidenciaInicial = valores.some((valor) => valor.trim().startsWith(termino));
      resultadosEncontrados.push({ id: resultadoId ?? `${apartado}-${elemento.id ?? detalle}`, apartado, ruta, detalle, parametro, targetId: elemento.id, coincidenciaExacta, coincidenciaInicial });
    };
    unidades.forEach((unidad) => {
      const detalle = `${unidad.economico ?? unidad.numeroSerie?.slice(-6) ?? "Unidad"} - ${unidad.marca ?? ""} ${unidad.submarca ?? ""}`.trim();
      const camposBuscables = obtenerCamposBusquedaUnidad(unidad, obtenerNombreDepartamento);
      agregar("Unidad", "/flota", unidad, detalle, camposBuscables);
    });
    tickets.forEach((ticket) => {
      const unidad = unidadesPorId.get(ticket.unidadId);
      agregar("Ticket Bomba", "/tickets-combustible", ticket, `Recarga ${unidad?.economico ?? ticket.id}`, {
        id: ticket.id,
        economico: unidad?.economico,
        placa: unidad?.placas,
        fecha: ticket.fechaHora,
        subidoPor: ticket.subidoPor,
      }, "ticket");
    });
    reportes.forEach((reporte) => agregar("Reporte", "/reportes", reporte, reporte.folio ?? `Reporte ${reporte.id}`, {
      id: reporte.id,
      folio: reporte.folio,
      estado: reporte.estado,
    }, "reporte"));
    cargasEdenred.forEach((carga) => agregar("Edenred", "/auditoria-edenred", carga, `Periodo ${(carga.periodo ?? []).join(", ")}`, {
      id: carga.id,
      periodo: (carga.periodo ?? []).join(" "),
    }, "carga"));
    cargasEdenred.forEach((carga) => {
      (carga.transacciones ?? []).forEach((transaccion, indice) => {
        const placa = transaccion.Placa ?? "";
        const unidad = unidades.find((item) => String(item.placas ?? "").trim().toUpperCase() === String(placa).trim().toUpperCase()
          || String(item.placas2025 ?? "").trim().toUpperCase() === String(placa).trim().toUpperCase());
        const economico = transaccion["Id Vehículo"]
          ?? transaccion["Id Vehiculo"]
          ?? transaccion["Número Económico"]
          ?? transaccion["Numero Economico"]
          ?? unidad?.economico;
        const fecha = transaccion["Fecha transacción"];
        const fechaTexto = fecha ? formatearFecha(fecha) : "";
        agregar(
          "Transacción Edenred",
          "/auditoria-edenred",
          { id: `${carga.id}-${indice}` },
          `Económico ${economico || "s/e"} · Placa ${placa || "s/p"} · ${fechaTexto || "Sin fecha"}`,
          {
            economico,
            placa,
            fecha,
            comprobante: transaccion["No Comprobante"],
          },
          "carga",
          `${carga.id}-transaccion-${indice}`,
        );
      });
    });
    return resultadosEncontrados
      .sort((a, b) => Number(b.coincidenciaExacta) - Number(a.coincidenciaExacta) || Number(b.coincidenciaInicial) - Number(a.coincidenciaInicial) || a.detalle.localeCompare(b.detalle))
      .slice(0, 30);
  }, [cargasEdenred, query, reportes, tickets, unidades]);

  function abrirResultado(resultado) {
    setMostrarResultados(false);
    const parametro = resultado.apartado === "Unidad" ? "unidad" : resultado.parametro;
    const destino = parametro ? `${resultado.ruta}?${parametro}=${encodeURIComponent(resultado.targetId)}` : resultado.ruta;
    navigate(destino);
  }

  return (
    <header className="portal-topbar sticky top-0 z-40 border-b border-outline-variant/60">
      <div className="portal-topbar__row mx-auto flex w-full max-w-[1800px] items-center justify-between gap-3 px-margin-mobile md:px-margin-desktop">
        <div className="hidden min-w-0 items-center gap-3 md:flex">
          <div className="portal-topbar__marker" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <div className="min-w-0">
            <p className="truncate text-[11px] font-semibold uppercase tracking-[0.12em] text-on-surface-variant">PV-ZTG · CFE Transmisión</p>
            <p className="truncate text-base font-semibold text-on-surface" aria-current="page">{pageTitle}</p>
          </div>
        </div>

        <div className="flex min-w-0 flex-1 items-center justify-end gap-2 md:gap-3">
          <div ref={searchContainerRef} className="relative w-full max-w-[320px] md:max-w-[420px]">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-on-surface-variant">
              <span className="material-symbols-outlined text-[18px]">search</span>
            </span>
            <input
              aria-label="Buscar en el portal"
              aria-expanded={Boolean(textoBusqueda.trim() && mostrarResultados)}
              aria-controls="portal-search-results"
              className="min-h-12 w-full rounded-lg border border-outline-variant/80 bg-surface-container-lowest px-10 py-2.5 text-sm text-on-surface outline-none transition placeholder:text-on-surface-variant/80 focus:border-primary focus:ring-2 focus:ring-primary/10"
              placeholder={searchPlaceholder}
              type="text"
              value={textoBusqueda}
              onFocus={() => textoBusqueda.trim() && setMostrarResultados(true)}
              onChange={(event) => {
                setTextoBusqueda(event.target.value);
                setMostrarResultados(true);
              }}
              onKeyDown={(event) => {
                if (event.key === "Enter") {
                  if (resultados[0]) abrirResultado(resultados[0]);
                  return;
                }
                if (event.key === "Escape") dismissSuggestions();
              }}
            />
            {textoBusqueda.trim() && mostrarResultados && (
              <div id="portal-search-results" className="absolute right-0 top-full z-50 mt-2 max-h-80 w-[min(28rem,calc(100vw-2rem))] overflow-y-auto rounded-xl border border-outline-variant bg-surface-container-lowest shadow-xl">
                <div className="flex items-center justify-between border-b border-outline-variant/40 bg-surface-container-low px-4 py-2.5">
                  <span className="text-xs font-semibold uppercase tracking-[0.1em] text-primary">{resultados.length} resultados</span>
                  <button type="button" onClick={dismissSuggestions} className="min-h-9 px-2 text-sm font-medium text-on-surface-variant hover:text-primary">Cerrar</button>
                </div>
                {resultados.length === 0 ? (
                  <p className="p-3 text-sm text-on-surface-variant">No se encontraron coincidencias.</p>
                ) : (
                  resultados.map((resultado) => (
                    <button
                      key={resultado.id}
                      type="button"
                      onClick={() => abrirResultado(resultado)}
                      className="w-full border-b border-outline-variant/30 px-4 py-3 text-left last:border-b-0 transition hover:bg-surface-container-low"
                    >
                      <span className="block text-xs font-semibold uppercase tracking-[0.1em] text-primary">{resultado.apartado}</span>
                      <span className="mt-1 block text-sm leading-5 text-on-surface">{resultado.detalle}</span>
                    </button>
                  ))
                )}
              </div>
            )}
          </div>

          <NotificationCenter anomalies={anomalias} />

          <button
            type="button"
            onClick={() => navigate("/perfil")}
            className="flex min-h-11 items-center gap-2 rounded-lg border border-outline-variant/80 bg-surface-container-lowest px-2 py-1.5 text-left transition hover:border-primary hover:text-primary"
            aria-label="Ir a mi perfil"
          >
            <AvatarUsuario nombre={usuario?.nombre} className="h-9 w-9" />
            <span className="hidden sm:block">
              <span className="block text-xs font-medium text-on-surface-variant">Sesión</span>
              <span className="block max-w-[120px] truncate text-sm font-medium text-on-surface">{usuario?.nombre ?? "Usuario"}</span>
            </span>
          </button>
        </div>
      </div>
      <div className="flex min-h-10 items-center gap-2 border-t border-outline-variant/30 bg-surface-container-low px-4 md:hidden">
        <span className="h-2 w-2 shrink-0 rounded-sm bg-primary" aria-hidden="true" />
        <span className="text-xs font-medium uppercase tracking-wide text-on-surface-variant">Sección</span>
        <span className="truncate text-sm font-semibold text-on-surface" aria-current="page">{pageTitle}</span>
      </div>
    </header>
  );
}

export default TopNavBar;
