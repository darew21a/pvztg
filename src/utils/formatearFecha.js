export function convertirAFecha(valor) {
  if (valor instanceof Date) return Number.isNaN(valor.getTime()) ? null : valor;
  if (valor === null || valor === undefined || valor === "") return null;
  if (typeof valor === "number" && Number.isFinite(valor)) {
    const dias = Math.trunc(valor);
    const milisegundos = Math.round((valor - dias) * 86400000);
    const fechaExcel = new Date(1899, 11, 30);
    fechaExcel.setDate(fechaExcel.getDate() + dias);
    fechaExcel.setMilliseconds(fechaExcel.getMilliseconds() + milisegundos);
    return Number.isNaN(fechaExcel.getTime()) ? null : fechaExcel;
  }

  const texto = String(valor).trim();
  if (/^\d+(?:\.\d+)?$/.test(texto)) {
    const serial = Number(texto);
    if (serial >= 1 && serial <= 100000) return convertirAFecha(serial);
  }
  const fechaLatina = texto.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})(.*)$/);
  if (fechaLatina) {
    const [, dia, mes, anio, resto] = fechaLatina;
    const hora = resto.match(/(\d{1,2}):(\d{2})(?::(\d{2}))?/);
    const fecha = new Date(Number(anio), Number(mes) - 1, Number(dia), hora ? Number(hora[1]) : 0, hora ? Number(hora[2]) : 0, hora?.[3] ? Number(hora[3]) : 0);
    return Number.isNaN(fecha.getTime()) ? null : fecha;
  }

  const fecha = new Date(texto);
  return Number.isNaN(fecha.getTime()) ? null : fecha;
}

export function formatearFecha(valor) {
  const fecha = convertirAFecha(valor);
  if (!fecha) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  }).format(fecha);
}

export function formatearFechaHora(valor) {
  const fecha = convertirAFecha(valor);
  if (!fecha) return "Fecha no disponible";
  return new Intl.DateTimeFormat("es-MX", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(fecha);
}
