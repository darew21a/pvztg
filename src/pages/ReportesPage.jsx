import { useState } from "react";
import TopNavBar from "../components/layout/TopNavBar.jsx";

/**
 * Módulo de Reportes. Portado del prototipo HTML (líneas 2446-2757 del
 * original). El "loading" que el script vanilla simulaba en los filtros
 * (opacity 0.3 -> 1 al cambiar un <select>) se maneja aquí con un estado
 * `isRefreshing`.
 */
function ReportesPage() {
  const [isRefreshing, setIsRefreshing] = useState(false);

  function handleFilterChange() {
    setIsRefreshing(true);
    // TODO: disparar la consulta real de datos aquí.
    setTimeout(() => setIsRefreshing(false), 600);
  }

  return (
    <>
      <TopNavBar activeTab="Alertas" searchPlaceholder="Buscar..." />
      <main className="flex-1 overflow-y-auto p-gutter w-full">
{/* Page Header & Actions */}
<div className="flex justify-between items-end mb-8 w-full max-w-7xl mx-auto">
<div>
<h1 className="font-headline-lg text-headline-lg text-primary mb-1">Módulo de Reportes e Impresiones</h1>
<p className="font-body-md text-body-md text-on-surface-variant">Configure los parámetros para generar el informe operativo de la flota.</p>
</div>
<div className="flex gap-4">
<button className="flex items-center gap-2 px-6 py-3 bg-error text-on-error font-title-md text-[14px] rounded-lg shadow-sm hover:shadow-md hover:-translate-y-[1px] transition-all duration-300">
<span className="material-symbols-outlined" data-icon="picture_as_pdf">picture_as_pdf</span>
                        Exportar PDF
                    </button>
<button className="flex items-center gap-2 px-6 py-3 bg-primary-container text-on-primary font-title-md text-[14px] rounded-lg shadow-sm hover:shadow-md hover:-translate-y-[1px] hover:bg-secondary transition-all duration-300">
<span className="material-symbols-outlined" data-icon="table_view">table_view</span>
                        Exportar Excel
                    </button>
</div>
</div>
{/* Bento Grid Layout */}
<div className="w-full max-w-7xl mx-auto grid grid-cols-1 gap-bento-gap">
{/* Filter Interface Module */}
<div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm p-6 relative overflow-hidden">
<div className="absolute inset-0 bg-gradient-to-r from-surface-container-lowest to-surface-container-low opacity-50 pointer-events-none"></div>
<div className="relative z-10">
<h2 className="font-title-md text-title-md text-primary mb-6 flex items-center gap-2">
<span className="material-symbols-outlined text-secondary" data-icon="filter_alt">filter_alt</span>
                            Parámetros de Filtrado
                        </h2>
<div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-end">
{/* Date Range */}
<div className="flex flex-col gap-2">
<label className="font-label-sm text-label-sm text-on-surface-variant uppercase">Fecha Inicio</label>
<input className="w-full bg-transparent border-0 border-b border-outline-variant focus:border-secondary focus:ring-0 px-0 py-2 font-body-md text-on-surface transition-colors" type="date" value="2023-10-01" onChange={handleFilterChange}/>
</div>
<div className="flex flex-col gap-2">
<label className="font-label-sm text-label-sm text-on-surface-variant uppercase">Fecha Fin</label>
<input className="w-full bg-transparent border-0 border-b border-outline-variant focus:border-secondary focus:ring-0 px-0 py-2 font-body-md text-on-surface transition-colors" type="date" value="2023-10-31" onChange={handleFilterChange}/>
</div>
{/* Department Selector */}
<div className="flex flex-col gap-2 md:col-span-2">
<label className="font-label-sm text-label-sm text-on-surface-variant uppercase">Departamento / Zona</label>
<div className="relative">
<select className="w-full bg-transparent border-0 border-b border-outline-variant focus:border-secondary focus:ring-0 px-0 py-2 font-body-md text-on-surface appearance-none transition-colors" onChange={handleFilterChange}>
<option>Todas las Zonas</option>
<option selected>CFE Transmisión Zona Guerrero</option>
<option>CFE Transmisión Zona Centro</option>
<option>CFE Transmisión Zona Norte</option>
</select>
<span className="material-symbols-outlined absolute right-0 top-1/2 -translate-y-1/2 text-outline pointer-events-none" data-icon="expand_more">expand_more</span>
</div>
</div>
</div>
</div>
</div>
{/* Real-time Preview Table Module */}
<div className="bg-surface-container-lowest border border-outline-variant rounded-xl shadow-sm flex flex-col overflow-hidden min-h-[500px]">
{/* Branding Header for Print Preview */}
<div className="bg-surface-container-low border-b border-outline-variant p-6 flex justify-between items-center">
<div className="flex items-center gap-4">
<div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
<span className="material-symbols-outlined text-white icon-fill" data-icon="bolt">bolt</span>
</div>
<div>
<h3 className="font-title-md text-title-md text-primary leading-tight">CFE Transmisión Zona Guerrero</h3>
<p className="font-technical-mono text-technical-mono text-on-surface-variant text-[12px]">REPORTE OFICIAL DE OPERACIONES - V.2023.10</p>
</div>
</div>
<div className="flex items-center gap-2 text-secondary font-label-sm text-label-sm bg-secondary-container/20 px-3 py-1.5 rounded-full border border-secondary-container">
<span className="relative flex h-2 w-2">
<span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-secondary opacity-75"></span>
<span className="relative inline-flex rounded-full h-2 w-2 bg-secondary"></span>
</span>
                            PREVISUALIZACIÓN EN TIEMPO REAL
                        </div>
</div>
{/* Table Area */}
<div className="flex-1 overflow-auto p-0">
<table className="w-full text-left border-collapse">
<thead className="sticky top-0 bg-surface-container-lowest z-10 shadow-[0_1px_0_rgba(229,231,235,1)]">
<tr>
<th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">ID Unidad</th>
<th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Fecha / Hora</th>
<th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Tipo de Vehículo</th>
<th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Operador</th>
<th className="py-4 px-6 font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Estado</th>
<th className="py-4 px-6 text-right font-label-sm text-label-sm text-on-surface-variant uppercase tracking-wider">Kilometraje</th>
</tr>
</thead>
{/* Table Body with opacity transition for 'real-time' feel */}
<tbody className={`font-body-md text-body-md text-on-surface transition-opacity duration-500 ease-in-out ${isRefreshing ? "opacity-30" : "opacity-100"}`}>
<tr className="border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors">
<td className="py-3 px-6 font-technical-mono text-technical-mono text-primary font-semibold">V-4092</td>
<td className="py-3 px-6">24/10/2023 08:30</td>
<td className="py-3 px-6">Grúa Articulada</td>
<td className="py-3 px-6">Ramírez, J.</td>
<td className="py-3 px-6">
<span className="inline-flex items-center px-2 py-1 rounded-full bg-primary-container/10 text-primary border border-primary-container/30 font-label-sm text-[10px] uppercase">Operativo</span>
</td>
<td className="py-3 px-6 text-right font-technical-mono">145,230 km</td>
</tr>
<tr className="border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors">
<td className="py-3 px-6 font-technical-mono text-technical-mono text-primary font-semibold">V-3105</td>
<td className="py-3 px-6">24/10/2023 09:15</td>
<td className="py-3 px-6">Camioneta 4x4</td>
<td className="py-3 px-6">López, M.</td>
<td className="py-3 px-6">
<span className="inline-flex items-center px-2 py-1 rounded-full bg-error-container/20 text-error border border-error-container/50 font-label-sm text-[10px] uppercase">Mantenimiento</span>
</td>
<td className="py-3 px-6 text-right font-technical-mono">89,400 km</td>
</tr>
<tr className="border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors">
<td className="py-3 px-6 font-technical-mono text-technical-mono text-primary font-semibold">V-8821</td>
<td className="py-3 px-6">24/10/2023 11:00</td>
<td className="py-3 px-6">Camión Ligero</td>
<td className="py-3 px-6">García, A.</td>
<td className="py-3 px-6">
<span className="inline-flex items-center px-2 py-1 rounded-full bg-primary-container/10 text-primary border border-primary-container/30 font-label-sm text-[10px] uppercase">Operativo</span>
</td>
<td className="py-3 px-6 text-right font-technical-mono">210,050 km</td>
</tr>
<tr className="border-b border-outline-variant/30 hover:bg-surface-container-low/50 transition-colors">
<td className="py-3 px-6 font-technical-mono text-technical-mono text-primary font-semibold">V-2004</td>
<td className="py-3 px-6">24/10/2023 13:45</td>
<td className="py-3 px-6">Camioneta 4x4</td>
<td className="py-3 px-6">Hernández, C.</td>
<td className="py-3 px-6">
<span className="inline-flex items-center px-2 py-1 rounded-full bg-primary-container/10 text-primary border border-primary-container/30 font-label-sm text-[10px] uppercase">Operativo</span>
</td>
<td className="py-3 px-6 text-right font-technical-mono">45,120 km</td>
</tr>
<tr className="hover:bg-surface-container-low/50 transition-colors">
<td className="py-3 px-6 font-technical-mono text-technical-mono text-primary font-semibold">V-5519</td>
<td className="py-3 px-6">24/10/2023 15:20</td>
<td className="py-3 px-6">Plataforma</td>
<td className="py-3 px-6">Martínez, R.</td>
<td className="py-3 px-6">
<span className="inline-flex items-center px-2 py-1 rounded-full bg-tertiary-container/10 text-tertiary border border-tertiary-container/30 font-label-sm text-[10px] uppercase">En Ruta</span>
</td>
<td className="py-3 px-6 text-right font-technical-mono">112,890 km</td>
</tr>
</tbody>
</table>
</div>
{/* Table Footer / Pagination */}
<div className="bg-surface border-t border-outline-variant p-4 flex justify-between items-center">
<span className="font-body-md text-body-md text-on-surface-variant text-[14px]">Mostrando 5 de 142 registros</span>
<div className="flex gap-2">
<button className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center text-outline hover:border-primary hover:text-primary transition-colors disabled:opacity-50">
<span className="material-symbols-outlined" data-icon="chevron_left" style={{fontSize: '18px'}}>chevron_left</span>
</button>
<button className="w-8 h-8 rounded bg-primary-container text-on-primary flex items-center justify-center font-label-sm">1</button>
<button className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center text-on-surface hover:border-primary hover:text-primary transition-colors font-label-sm">2</button>
<button className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center text-on-surface hover:border-primary hover:text-primary transition-colors font-label-sm">3</button>
<button className="w-8 h-8 rounded border border-outline-variant flex items-center justify-center text-on-surface hover:border-primary hover:text-primary transition-colors">
<span className="material-symbols-outlined" data-icon="chevron_right" style={{fontSize: '18px'}}>chevron_right</span>
</button>
</div>
</div>
</div>
</div>
{/* Spacer for bottom */}
<div className="h-12"></div>
      </main>
    </>
  );
}

export default ReportesPage;
