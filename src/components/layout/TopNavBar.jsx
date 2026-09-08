const NAV_TABS = ["Resumen", "Operaciones", "Administrar Reportes-Edenred"];

/**
 * Header superior compartido (búsqueda, notificaciones, perfil).
 * `title` permite reutilizarlo con el título de cada página; `activeTab`
 * resalta el tab correspondiente, tal como el prototipo distinguía
 * "Alertas" activo en Auditoría vs. "Operaciones" en Flota, etc.
 */
function TopNavBar({ activeTab = "Resumen", searchPlaceholder = "Buscar..." }) {
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
          />
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
