import { Outlet } from "react-router-dom";
import SideNavBar from "./SideNavBar.jsx";

/**
 * Layout compartido por todas las páginas del panel administrativo
 * (todo excepto Login y Captura Móvil, que son pantallas standalone
 * sin navegación global, tal como especificaba el prototipo).
 */
function AppLayout() {
  return (
    <div className="min-h-screen flex bg-background text-on-surface">
      <SideNavBar />
      <div className="flex-1 flex flex-col ml-64 min-h-screen">
        <Outlet />
      </div>
    </div>
  );
}

export default AppLayout;
