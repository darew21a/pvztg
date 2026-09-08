import { NavLink, useNavigate } from "react-router-dom";
import logoCfe from "../../assets/logo-cfe.png";
import { useAuth } from "../../hooks/useAuth.js";
import { obtenerIniciales } from "../../utils/nombre.js";

const MAIN_LINKS = [
  { to: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { to: "/flota", icon: "local_shipping", label: "Unidades" },
  { to: "/auditoria-edenred", icon: "fact_check", label: "Edenred" },
  { to: "/reportes", icon: "analytics", label: "Reportes" },
];

/**
 * Sidebar de navegación principal, compartida por todas las páginas del
 * panel administrativo. Unifica las 5 variantes casi idénticas que traía
 * el prototipo HTML (auditoría, flota, accesos, dashboard, reportes) en
 * un solo componente con estado activo dirigido por la ruta (NavLink).
 */
function SideNavBar() {
  const { usuario, logout } = useAuth();
  const navigate = useNavigate();

  function handleCerrarSesion() {
    logout();
    navigate("/");
  }

  return (
    <aside className="bg-surface border-r border-outline-variant shadow-sm flex flex-col h-screen w-64 fixed left-0 top-0 py-unit px-4 z-50">
      <div className="mb-8 mt-4 flex items-center gap-2 px-2">
        <img src={logoCfe} alt="Comisión Federal de Electricidad" className="h-9 w-auto" />
        <div className="border-l border-outline-variant/40 pl-2">
          <p className="font-label-sm text-label-sm text-on-surface-variant leading-tight">Transmisión</p>
          <p className="font-label-sm text-label-sm text-on-surface-variant leading-tight">Guerrero</p>
        </div>
      </div>

      <nav className="flex-1 space-y-2">
        {MAIN_LINKS.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg transition-all duration-300 ${
                isActive
                  ? "text-primary bg-secondary-container/30 font-bold scale-[0.98]"
                  : "text-on-surface-variant hover:text-primary hover:bg-surface-container-high"
              }`
            }
          >
            <span className="material-symbols-outlined">{link.icon}</span>
            <span className="font-title-md text-title-md text-[16px]">{link.label}</span>
          </NavLink>
        ))}
      </nav>

      <div className="mt-auto border-t border-outline-variant/30 pt-4 space-y-2">
        <NavLink
          to="/perfil"
          className={({ isActive }) =>
            `flex items-center gap-3 px-3 py-2 rounded-lg transition-all duration-300 ${
              isActive ? "bg-secondary-container/30" : "hover:bg-surface-container-high"
            }`
          }
        >
          <span className="w-9 h-9 rounded-full bg-primary text-on-primary flex items-center justify-center font-label-sm text-label-sm shrink-0">
            {obtenerIniciales(usuario?.nombre)}
          </span>
          <div className="min-w-0">
            <p className="font-body-md text-body-md text-on-surface truncate">{usuario?.nombre ?? "Administrador"}</p>
            <p className="font-label-sm text-label-sm text-on-surface-variant">Ver mi perfil</p>
          </div>
        </NavLink>
        <NavLink
          to="/accesos"
          className="flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:text-primary hover:bg-surface-container-high transition-all duration-300"
        >
          <span className="material-symbols-outlined">settings</span>
          <span className="font-title-md text-title-md text-[16px]">Configuración</span>
        </NavLink>
        <button
          onClick={handleCerrarSesion}
          className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-on-surface-variant hover:text-error hover:bg-error-container/20 transition-all duration-300"
        >
          <span className="material-symbols-outlined">logout</span>
          <span className="font-title-md text-title-md text-[16px]">Cerrar Sesión</span>
        </button>
      </div>
    </aside>
  );
}

export default SideNavBar;
