import { useMemo } from "react";
import TopNavBar from "../components/layout/TopNavBar.jsx";
import BarraFiltrosFlota from "../components/flota/BarraFiltrosFlota.jsx";
import TablaColumnasDinamicas from "../components/flota/TablaColumnasDinamicas.jsx";
import { useUnidades } from "../hooks/useUnidades.js";
import { useTicketsCombustible } from "../hooks/useTicketsCombustible.js";
import { useFiltrosFlota, useEstadoFiltrosFlota } from "../hooks/useFiltrosFlota.js";
import { obtenerNombreDepartamento } from "../data/departamentosStore.js";
import { useSearch } from "../context/SearchContext.jsx";

/**
 * ============================================================================
 * AUDITORÍA GLOBAL DE TICKETS BOMBA (Administrador)
 * ============================================================================
 * Central de control de gasto de combustible: TODAS las recargas que los
 * Jefes de Departamento han subido, sin importar de qué departamento ni
 * de qué unidad, en una sola tabla cruzable con el núcleo centralizado de
 * filtros (Placa, Económico, Departamento dinámico, Año, Mes, Día, Hora).
 * Desde aquí se descargan directamente los 3 comprobantes de cualquier
 * recarga (Ticket Bomba, Comprobante Edenred, PDF fusionado).
 * ============================================================================
 */
function AuditoriaTicketsBombaPage() {
  const unidades = useUnidades();
  const tickets = useTicketsCombustible();
  const { query } = useSearch();
  const { filtros, setFiltro, limpiarFiltros } = useEstadoFiltrosFlota();

  // Índice rápido unidadId -> unidad, para no buscar en el arreglo por cada ticket.
  const unidadesPorId = useMemo(() => new Map(unidades.map((unidad) => [unidad.id, unidad])), [unidades]);

  // Extractores: le enseñan al núcleo centralizado cómo leer placa/económico/departamento/fecha de UN ticket de combustible.
  const extractores = useMemo(
    () => ({
      obtenerPlaca: (ticket) => unidadesPorId.get(ticket.unidadId)?.placas,
      obtenerEconomico: (ticket) => unidadesPorId.get(ticket.unidadId)?.economico,
      obtenerDepartamento: (ticket) => unidadesPorId.get(ticket.unidadId)?.departamento,
      obtenerFecha: (ticket) => new Date(ticket.fechaHora),
    }),
    [unidadesPorId],
  );

  const ticketsFiltrados = useFiltrosFlota(tickets, filtros, extractores);

  const aniosDisponibles = useMemo(
    () => [...new Set(tickets.map((ticket) => new Date(ticket.fechaHora).getFullYear()))].sort(),
    [tickets],
  );

  const columnas = useMemo(
    () => [
      { key: "economico", label: "Económico", render: (t) => unidadesPorId.get(t.unidadId)?.economico ?? "s/e" },
      { key: "placa", label: "Placa", render: (t) => unidadesPorId.get(t.unidadId)?.placas ?? "-" },
      {
        key: "departamento",
        label: "Departamento",
        render: (t) => obtenerNombreDepartamento(unidadesPorId.get(t.unidadId)?.departamento),
      },
      { key: "fechaHora", label: "Fecha y hora", render: (t) => new Date(t.fechaHora).toLocaleString("es-MX") },
      { key: "litros", label: "Litros", alinearDerecha: true, render: (t) => t.litros.toLocaleString("es-MX") },
      { key: "importe", label: "Importe", alinearDerecha: true, render: (t) => `$${t.importe.toLocaleString("es-MX", { minimumFractionDigits: 2 })}` },
      { key: "subidoPor", label: "Subido por" },
      {
        key: "comprobantes",
        label: "Comprobantes",
        render: (t) => (
          <div className="flex gap-2">
            <EnlaceDescarga url={t.urlTicketBomba} etiqueta="Bomba" />
            <EnlaceDescarga url={t.urlTicketEdenred} etiqueta="Edenred" />
            <EnlaceDescarga url={t.urlPdfFusionado} etiqueta="PDF" />
          </div>
        ),
      },
    ],
    [unidadesPorId],
  );

  return (
    <>
      <TopNavBar activeTab="Alertas" searchPlaceholder="Buscar recarga..." />
      <div className="p-margin-desktop flex-1 space-y-6">
        <div>
          <h1 className="font-headline-lg text-headline-lg text-on-surface">Auditoría Global de Tickets Bomba</h1>
          <p className="font-body-md text-body-md text-on-surface-variant mt-1">
            {tickets.length} recarga(s) registradas por todos los departamentos.
          </p>
        </div>

        <BarraFiltrosFlota
          filtros={filtros}
          setFiltro={setFiltro}
          limpiarFiltros={limpiarFiltros}
          camposVisibles={["placa", "economico", "departamento", "anio", "mes", "dia", "hora"]}
          aniosDisponibles={aniosDisponibles}
        />

        <p className="font-label-sm text-label-sm text-on-surface-variant">
          {ticketsFiltrados.length} de {tickets.length} recargas
        </p>

        <TablaColumnasDinamicas filas={ticketsFiltrados} columnas={columnas} obtenerLlave={(ticket) => ticket.id} searchQuery={query} resaltarFilas={Object.values(filtros).some(Boolean)} />
      </div>
    </>
  );
}

function EnlaceDescarga({ url, etiqueta }) {
  if (!url) {
    return <span className="text-outline-variant text-xs">{etiqueta}</span>;
  }
  return (
    <a href={url} download className="text-primary hover:underline text-xs flex items-center gap-0.5">
      <span className="material-symbols-outlined text-[14px]">download</span>
      {etiqueta}
    </a>
  );
}

export default AuditoriaTicketsBombaPage;
