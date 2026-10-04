import { jsPDF } from "jspdf";
import { formatearFechaHora } from "./formatearFecha.js";
import { obtenerLogoCfeBase64 } from "./logoCfe.js";
import { calcularTotalesEjercicio, normalizarMesesEjercicio } from "./normalizarMesesEjercicio.js";

/**
 * PDF de cierre de ejercicio fiscal - pensado para generarse el 31 de
 * diciembre como cierre del año, aunque puede descargarse en cualquier
 * momento con el corte de datos que exista hasta ese día.
 *
 * @param {{
 *   anio: number,
 *   titulo: string,            "Flota Vehicular Completa" o "Económico 23002762 - NISSAN FRONTIER".
 *   mesesDelAnio: Array<{ mes: string, km: number, litros: number, importe: number }>,
 * }} datos
 * @returns {string} URL del PDF generado, lista para descargar.
 */
export async function generarPdfCierreAnual({ anio, titulo, mesesDelAnio }) {
  const mesesOrdenados = normalizarMesesEjercicio(mesesDelAnio, anio);
  const totales = calcularTotalesEjercicio(mesesOrdenados);
  const logoCfeBase64 = await obtenerLogoCfeBase64();
  const documento = new jsPDF({ unit: "mm", format: "letter" });
  const anchoPagina = documento.internal.pageSize.getWidth();

  documento.addImage(logoCfeBase64, "PNG", 20, 12, 28, 10);
  documento.setFontSize(9);
  documento.text("Comisión Federal de Electricidad - Transmisión Zona Guerrero", anchoPagina - 20, 15, { align: "right" });
  documento.text("Sistema PV-ZTG · Cierre de Ejercicio Fiscal", anchoPagina - 20, 20, { align: "right" });

  documento.setDrawColor(0, 104, 71);
  documento.line(20, 26, anchoPagina - 20, 26);

  documento.setFontSize(16);
  documento.setFont("helvetica", "bold");
  documento.setTextColor(0, 104, 71);
  documento.text(`Cierre de Ejercicio Fiscal ${anio}`, anchoPagina / 2, 36, { align: "center" });
  documento.setTextColor(0, 0, 0);
  documento.setFontSize(11);
  documento.setFont("helvetica", "normal");
  documento.text(titulo, anchoPagina / 2, 43, { align: "center" });

  // Totales del año, destacados.
  let y = 56;
  documento.setFont("helvetica", "bold");
  documento.text("Totales del ejercicio:", 20, y);
  documento.setFont("helvetica", "normal");
  y += 7;
  documento.text(`Km recorridos: ${totales.km.toLocaleString("es-MX")} km`, 24, y);
  y += 6;
  documento.text(`Litros consumidos: ${totales.litros.toLocaleString("es-MX")} L`, 24, y);
  y += 6;
  documento.text(`Importe total: $${totales.importe.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 24, y);

  // Desglose anual completo, normalizado de enero a diciembre.
  y += 12;
  documento.setFont("helvetica", "bold");
  documento.text("Mes", 20, y);
  documento.text("Km", 90, y, { align: "right" });
  documento.text("Litros", 130, y, { align: "right" });
  documento.text("Importe", 180, y, { align: "right" });
  documento.setFont("helvetica", "normal");
  y += 3;
  documento.line(20, y, anchoPagina - 20, y);
  y += 6;

  mesesOrdenados.forEach((registro) => {
    documento.text(registro.nombre, 20, y);
    documento.text(registro.km.toLocaleString("es-MX"), 90, y, { align: "right" });
    documento.text(registro.litros.toLocaleString("es-MX"), 130, y, { align: "right" });
    documento.text(`$${registro.importe.toLocaleString("es-MX", { minimumFractionDigits: 2 })}`, 180, y, { align: "right" });
    y += 6;
  });

  documento.setFontSize(7.5);
  documento.setTextColor(120, 120, 120);
  documento.text(
    `Generado automáticamente por el Sistema PV-ZTG el ${formatearFechaHora(new Date())}.`,
    20,
    documento.internal.pageSize.getHeight() - 12,
  );

  return documento.output("bloburl").toString();
}
