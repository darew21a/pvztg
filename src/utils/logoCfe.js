import logoCfeUrl from "../assets/logo-cfe.png";

let logoCfeBase64Promise;

export function obtenerLogoCfeBase64() {
  if (!logoCfeBase64Promise) {
    logoCfeBase64Promise = fetch(logoCfeUrl)
      .then((respuesta) => {
        if (!respuesta.ok) throw new Error("No se pudo cargar el logo institucional.");
        return respuesta.blob();
      })
      .then((blob) => new Promise((resolve, reject) => {
        const lector = new FileReader();
        lector.onload = () => resolve(lector.result);
        lector.onerror = () => reject(new Error("No se pudo convertir el logo institucional."));
        lector.readAsDataURL(blob);
      }));
  }
  return logoCfeBase64Promise;
}
