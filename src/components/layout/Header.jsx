import { Link } from "react-router-dom";

/**
 * Header institucional compartido.
 * TODO: portar la navegación exacta del prototipo (líneas ~930, ~1390,
 * ~2243, ~2504 del HTML original) — cada página tenía una variante
 * ligeramente distinta que aquí se debe unificar.
 */
function Header() {
  return (
    <header className="bg-surface-container-lowest border-b border-outline-variant px-margin-mobile md:px-margin-desktop py-4 flex items-center justify-between">
      <Link to="/dashboard" className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-primary flex items-center justify-center">
          <span className="material-symbols-outlined text-white icon-fill">bolt</span>
        </div>
        <span className="font-title-md text-title-md text-primary">Portal PV-ZTG</span>
      </Link>
      {/* TODO: navegación / usuario / notificaciones */}
    </header>
  );
}

export default Header;
