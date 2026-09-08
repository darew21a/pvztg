import TopNavBar from "../components/layout/TopNavBar.jsx";

/**
 * Gestión de Accesos. Portado del prototipo HTML (líneas 1216-1684 del
 * original). Los toggles de estado de usuario quedan como checkboxes no
 * controlados (defaultChecked) — conectar a estado/API es un TODO.
 */
function GestionAccesosPage() {
  return (
    <>
      <TopNavBar activeTab="Operaciones" searchPlaceholder="Buscar usuarios..." />
      <div className="flex-1 flex flex-col relative overflow-hidden">
{/* Bento Layout Content */}
<div className="flex-1 p-gutter overflow-y-auto pb-48 flex flex-col gap-bento-gap">
{/* Page Header & Actions */}
<div className="flex justify-between items-end mb-4">
<div>
<h2 className="font-headline-lg text-headline-lg text-surface-lowest dark:text-white mb-2">Gestión de Accesos</h2>
<p className="font-body-md text-body-md text-outline">Administración de credenciales (RBAC) y roles operativos.</p>
</div>
<button className="bg-primary-container text-white px-6 py-2.5 rounded-lg font-label-sm text-label-sm hover:-translate-y-1 hover:shadow-[0_10px_25px_-5px_rgba(0,104,71,0.4)] transition-all duration-300 flex items-center gap-2" id="btnNewUser">
<span className="material-symbols-outlined" style={{fontSize: '18px'}}>person_add</span>
                    NUEVO USUARIO
                </button>
</div>
{/* Main Data Module: User Table */}
<div className="bg-[#1e1e1e]/60 backdrop-blur-sm border border-outline-variant/20 rounded-xl overflow-hidden flex-1 flex flex-col shadow-sm">
<div className="p-4 border-b border-outline-variant/20 bg-[#1a1a1a] flex justify-between items-center">
<h3 className="font-title-md text-title-md text-white">Directorio de Credenciales</h3>
<div className="flex gap-2">
<button className="p-1.5 rounded bg-[#2a2a2a] text-outline hover:text-primary-fixed transition-colors"><span className="material-symbols-outlined" style={{fontSize: '20px'}}>filter_list</span></button>
<button className="p-1.5 rounded bg-[#2a2a2a] text-outline hover:text-primary-fixed transition-colors"><span className="material-symbols-outlined" style={{fontSize: '20px'}}>download</span></button>
</div>
</div>
<div className="overflow-x-auto">
<table className="w-full text-left border-collapse">
<thead>
<tr className="border-b border-outline-variant/20 text-outline font-label-sm text-label-sm uppercase tracking-wider bg-[#1a1a1a]/50">
<th className="p-4 py-3 font-medium">Usuario</th>
<th className="p-4 py-3 font-medium">Rol Asignado</th>
<th className="p-4 py-3 font-medium">Último Acceso</th>
<th className="p-4 py-3 font-medium">Zona / División</th>
<th className="p-4 py-3 font-medium text-right">Estado</th>
</tr>
</thead>
<tbody className="font-body-md text-[14px]">
{/* Row 1: Active Superadmin */}
<tr className="border-b border-outline-variant/10 hover:bg-[#252525] transition-colors group">
<td className="p-4">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-full bg-primary-container text-white flex items-center justify-center font-bold text-xs">ER</div>
<div>
<div className="text-white font-medium">Elena Rodríguez</div>
<div className="text-outline text-xs font-technical-mono">ID: SYS-0982</div>
</div>
</div>
</td>
<td className="p-4">
<span className="inline-block px-3 py-1 rounded-full bg-primary/20 text-primary-fixed border border-primary/30 font-label-sm text-[10px] uppercase tracking-wider">Superadmin</span>
</td>
<td className="p-4 text-outline-variant font-technical-mono text-xs">2023-10-24 08:15:22</td>
<td className="p-4 text-outline-variant">Centro / CDMX</td>
<td className="p-4 text-right">
<label className="relative inline-flex items-center cursor-pointer">
<input defaultChecked className="sr-only peer" type="checkbox"/>
<div className="w-11 h-6 bg-[#333] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container shadow-inner"></div>
</label>
</td>
</tr>
{/* Row 2: Inactive Auditor */}
<tr className="border-b border-outline-variant/10 hover:bg-[#252525] transition-colors group opacity-50">
<td className="p-4">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-full bg-[#333] text-outline flex items-center justify-center font-bold text-xs">CM</div>
<div>
<div className="text-white font-medium">Carlos Mendoza</div>
<div className="text-outline text-xs font-technical-mono">ID: AUD-4412</div>
</div>
</div>
</td>
<td className="p-4">
<span className="inline-block px-3 py-1 rounded-full bg-[#904340]/20 text-[#ffb3ae] border border-[#904340]/30 font-label-sm text-[10px] uppercase tracking-wider">Auditor</span>
</td>
<td className="p-4 text-outline-variant font-technical-mono text-xs">2023-10-15 14:32:01</td>
<td className="p-4 text-outline-variant">Occidente / Jalisco</td>
<td className="p-4 text-right">
<label className="relative inline-flex items-center cursor-pointer">
<input className="sr-only peer" type="checkbox"/>
<div className="w-11 h-6 bg-[#333] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container shadow-inner"></div>
</label>
</td>
</tr>
{/* Row 3: Active Conductor */}
<tr className="border-b border-outline-variant/10 hover:bg-[#252525] transition-colors group">
<td className="p-4">
<div className="flex items-center gap-3">
<div className="w-8 h-8 rounded-full bg-[#333] text-outline flex items-center justify-center font-bold text-xs">JG</div>
<div>
<div className="text-white font-medium">Javier Gómez</div>
<div className="text-outline text-xs font-technical-mono">ID: OPE-8821</div>
</div>
</div>
</td>
<td className="p-4">
<span className="inline-block px-3 py-1 rounded-full bg-[#444]/40 text-outline-variant border border-[#555] font-label-sm text-[10px] uppercase tracking-wider">Conductor</span>
</td>
<td className="p-4 text-outline-variant font-technical-mono text-xs">2023-10-24 07:05:44</td>
<td className="p-4 text-outline-variant">Norte / Monterrey</td>
<td className="p-4 text-right">
<label className="relative inline-flex items-center cursor-pointer">
<input defaultChecked className="sr-only peer" type="checkbox"/>
<div className="w-11 h-6 bg-[#333] rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-primary-container shadow-inner"></div>
</label>
</td>
</tr>
</tbody>
</table>
</div>
</div>
</div>
{/* Terminal Module (Bottom Fixed) */}
<div className="absolute bottom-0 left-0 w-full h-40 bg-[#0a0a0a] border-t border-primary/20 p-4 font-technical-mono text-[12px] flex flex-col z-30">
<div className="flex justify-between items-center mb-2 text-primary-fixed-dim/70">
<span className="uppercase tracking-widest text-[10px] flex items-center gap-2">
<span className="w-2 h-2 rounded-full bg-primary-fixed animate-pulse"></span>
                    Audit Log // Real-time
                </span>
<span className="material-symbols-outlined text-[16px] cursor-pointer hover:text-primary-fixed">expand_less</span>
</div>
<div className="flex-1 overflow-y-auto text-primary-fixed/80 space-y-1" id="terminal-output">
<div><span className="text-outline">[10:45:02]</span> SYSTEM: Connection established to Identity Server (WSS).</div>
<div><span className="text-outline">[10:45:05]</span> AUTH: Token refreshed for user SYS-0982.</div>
<div><span className="text-outline">[10:46:12]</span> AUDIT: Role 'Conductor' verified for OPE-8821 in Region Norte.</div>
<div><span className="text-outline">[10:47:33]</span> SEC: Policy sync completed. 0 anomalies detected.</div>
</div>
</div>
      </div>
    </>
  );
}

export default GestionAccesosPage;
