import { NavLink } from "react-router-dom";

const TABS = [
  { to: "/dashboard", icon: "dashboard", label: "Dashboard" },
  { to: "/flota", icon: "local_shipping", label: "Flota" },
  { to: "/captura-movil", icon: "photo_camera", label: "Captura" },
  { to: "/reportes", icon: "bar_chart", label: "Reportes" },
  { to: "/accesos", icon: "admin_panel_settings", label: "Accesos" },
];

/**
 * Barra de navegación inferior (patrón "Footer Tabs" del prototipo,
 * ver líneas ~971, ~1425, ~2271 del HTML original).
 * TODO: confirmar si esto se queda fijo abajo solo en mobile (patrón típico
 * de estas apps) o se convierte en sidebar en desktop.
 */
function FooterTabs() {
  return (
    <nav className="sticky bottom-0 bg-surface-container-lowest border-t border-outline-variant flex justify-around py-2">
      {TABS.map((tab) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          className={({ isActive }) =>
            `flex flex-col items-center gap-1 px-3 py-1 font-label-sm text-label-sm transition-colors ${
              isActive ? "text-primary" : "text-on-surface-variant"
            }`
          }
        >
          <span className="material-symbols-outlined">{tab.icon}</span>
          {tab.label}
        </NavLink>
      ))}
    </nav>
  );
}

export default FooterTabs;
