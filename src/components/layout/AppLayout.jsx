import { useEffect, useState } from "react";
import { Outlet } from "react-router-dom";
import SideNavBar from "./SideNavBar.jsx";
import { SearchProvider } from "../../context/SearchContext.jsx";
import { useAuth } from "../../hooks/useAuth.js";

/**
 * Layout compartido por todas las páginas del panel administrativo. En móvil se
 * convierte en una navegación tipo drawer para mantener legibilidad sin perder
 * el espacio funcional requerido por una plataforma operativa de flota.
 */
function AppLayout() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false);
  const { rol, interfaceTheme } = useAuth();
  const isSttTheme = rol === "stt" && interfaceTheme === "stt";

  useEffect(() => {
    document.body.dataset.interface = isSttTheme ? "stt" : "standard";
    return () => {
      delete document.body.dataset.interface;
    };
  }, [isSttTheme]);

  return (
    <SearchProvider>
      <div data-interface={isSttTheme ? "stt" : "standard"} className="app-shell min-h-screen text-on-surface">
        <SideNavBar isMobileOpen={isMobileNavOpen} onClose={() => setIsMobileNavOpen(false)} />

        {isMobileNavOpen && (
          <button
            type="button"
            aria-label="Cerrar menú de navegación"
            onClick={() => setIsMobileNavOpen(false)}
            className="fixed inset-0 z-40 bg-surface/60 backdrop-blur-sm md:hidden"
          />
        )}

        <div className="flex min-h-screen min-w-0 flex-col md:ml-[280px]">
          <header className="sticky top-0 z-30 border-b border-outline-variant bg-surface-container-lowest/95 shadow-sm backdrop-blur-xl md:hidden">
            <div className="flex items-center justify-between px-4 py-3">
              <button
                type="button"
                onClick={() => setIsMobileNavOpen(true)}
                aria-label="Abrir menú"
                className="flex h-10 w-10 items-center justify-center rounded-full border border-outline-variant bg-surface-container text-on-surface-variant transition hover:border-primary hover:text-primary"
              >
                <span className="material-symbols-outlined">menu</span>
              </button>

              <div className="flex items-center gap-2">
                <div className="h-2.5 w-2.5 rounded-full bg-primary" />
                <span className="font-label-sm text-label-sm text-on-surface-variant uppercase tracking-[0.12em]">
                  PV-ZTG
                </span>
              </div>
            </div>
          </header>

          <Outlet />
        </div>
      </div>
    </SearchProvider>
  );
}

export default AppLayout;
