import { obtenerIniciales } from "../../utils/nombre.js";

function AvatarUsuario({ nombre, className = "" }) {
  return (
    <span className={`flex items-center justify-center rounded-full bg-primary text-sm font-semibold text-on-primary ${className}`}>
      {obtenerIniciales(nombre)}
    </span>
  );
}

export default AvatarUsuario;
