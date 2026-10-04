import { useMemo } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import logoCfe from "../../assets/logo-cfe.png";
import { getNavItemsForRole, ROLE_LABELS, normalizeRole } from "../../config/roles.js";
import { useAuth } from "../../hooks/useAuth.js";
import { obtenerIniciales } from "../../utils/nombre.js";

function SideNavBar({ isMobileOpen = false, onClose = () => {} }) {
  const { usuario, logout, rol, interfaceTheme, setInterfaceTheme } = useAuth();
  const navigate = useNavigate();

  const links = useMemo(() => getNavItemsForRole(rol ?? usuario?.rol), [rol, usuario?.rol]);

  function handleCerrarSesion() {
    logout();
    onClose();
    navigate("/");
  }

  const rolNormalizado = normalizeRole(rol ?? usuario?.rol);

  return (
    <>
      <aside
        aria-label="Navegación principal"
        className={[
          "fixed left-0 top-0 z-50 flex h-screen w-[280px] flex-col border-r border-outline-variant bg-surface-container-lowest px-4 py-4 shadow-[8px_0_28px_-24px_rgba(15,52,39,0.45)] transition-transform duration-300 ease-out",
          "md:translate-x-0",
          isMobileOpen ? "translate-x-0" : "-translate-x-full md:translate-x-0",
        ].join(" " )}
      >
        <div className="absolute inset-x-0 top-0 h-1 bg-gradient-to-r from-primary-dark via-primary to-secondary-fixed-dim" />
        <div className="mb-6 flex items-center justify-between gap-3 px-2 pt-2 md:mb-8 md:mt-2">
          <div className="flex items-center gap-2">
            <img src={logoCfe} alt="Comisión Federal de Electricidad" className="h-10 w-auto" />
            <div className="border-l border-outline-variant/60 pl-3">
              <p className="text-[13px] font-semibold leading-tight text-on-surface">Transmisión</p>
              <p className="mt-1 text-xs leading-tight text-on-surface-variant">Zona Guerrero · PV-ZTG</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Cerrar menú"
            className="flex h-9 w-9 items-center justify-center rounded-full border border-outline-variant text-on-surface-variant transition hover:border-primary hover:text-primary md:hidden"
          >
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="mb-5 rounded-xl border border-outline-variant/60 bg-gradient-to-br from-surface-container-lowest to-surface-container-low px-3.5 py-3.5 shadow-sm">
          <p className="text-xs font-semibold uppercase tracking-[0.12em] text-on-surface-variant">Sesión activa</p>
          <p className="mt-1.5 truncate text-base font-semibold text-on-surface">{ROLE_LABELS[rolNormalizado] ?? "Usuario"}</p>
          <p className="mt-1 truncate text-sm text-on-surface-variant">{usuario?.nombre ?? "Administrador"}</p>
        </div>

        <p className="mb-2 px-3 text-xs font-semibold uppercase tracking-[0.14em] text-outline">Menú principal</p>
        <nav className="flex-1 space-y-1.5 overflow-y-auto pb-4">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              onClick={onClose}
              className={({ isActive }) =>
                `group flex min-h-12 items-center gap-3 rounded-lg border-l-[3px] px-3.5 py-3 transition-all duration-200 ${
                  isActive
                    ? "border-primary bg-primary/8 font-semibold text-primary shadow-sm"
                    : "border-transparent text-on-surface-variant hover:bg-surface-container-low hover:text-primary"
                }`
              }
            >
              <span className="material-symbols-outlined text-[21px]">{link.icon}</span>
              {link.to === "/auditoria-edenred" ? (
                <img src="/edenred.svg" alt="Edenred" className="h-7 max-w-28 object-contain" />
              ) : (
                <span className="text-[15px]">{link.label}</span>
              )}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto space-y-2 border-t border-outline-variant/40 pt-4">
          {rolNormalizado === "stt" && (
            <button
              type="button"
              onClick={() => setInterfaceTheme(interfaceTheme === "stt" ? "standard" : "stt")}
              className="flex min-h-12 w-full items-center gap-3 rounded-lg border border-outline-variant/60 px-3.5 py-3 text-left text-on-surface-variant transition hover:border-primary hover:text-primary"
            >
              <span className="material-symbols-outlined">{interfaceTheme === "stt" ? "light_mode" : "dark_mode"}</span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold">{interfaceTheme === "stt" ? "Interfaz estándar" : "Modo STT"}</span>
                <span className="mt-0.5 block text-xs opacity-75">Cambiar apariencia</span>
              </span>
            </button>
          )}
          <NavLink
            to="/perfil"
            onClick={onClose}
            className={({ isActive }) =>
              `flex min-h-12 items-center gap-3 rounded-lg px-3 py-2 transition-all duration-200 ${
                isActive ? "bg-primary/8" : "hover:bg-surface-container-low"
              }`
            }
          >
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary">
              {obtenerIniciales(usuario?.nombre)}
            </span>
            <div className="min-w-0">
              <p className="truncate font-body-md text-body-md text-on-surface">{usuario?.nombre ?? "Administrador"}</p>
              <p className="text-xs text-on-surface-variant">Ver mi perfil y preferencias</p>
            </div>
          </NavLink>

          <button
            type="button"
            onClick={handleCerrarSesion}
            className="flex min-h-12 w-full items-center gap-3 rounded-lg px-3.5 py-3 text-on-surface-variant transition hover:bg-error-container/30 hover:text-error"
          >
            <span className="material-symbols-outlined">logout</span>
            <span className="text-[15px] font-medium">Cerrar sesión</span>
          </button>
        </div>
      </aside>
    </>
  );
}

export default SideNavBar;
