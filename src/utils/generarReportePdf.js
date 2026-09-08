import { jsPDF } from "jspdf";
import { LOGO_CFE_BASE64 } from "../assets/logoCfeBase64.js";

/**
 * ============================================================================
 * GENERADOR DE REPORTES EN PDF
 * ============================================================================
 * Arma el documento formal que se descarga y se guarda como copia de cada
 * reporte (anomalía, mantenimiento o siniestro) que levanta un Jefe de
 * Departamento sobre una o varias unidades. Incluye: logo de CFE, marca de
 * agua, folio, fecha/hora exacta (día/mes/año, hora/minuto/segundo), texto
 * introductorio distinto según el tipo de caso, los datos de la(s)
 * unidad(es) y la descripción libre que escribió quien reporta.
 * ============================================================================
 */

const TEXTOS_POR_TIPO = {
  anomalia: {
    titulo: "REPORTE DE ANOMALÍA EN UNIDAD",
    introduccion:
      "Por conducto del presente instrumento, se hace de su formal conocimiento la detección de una irregularidad operativa o de datos en la unidad vehicular detallada a continuación, a efecto de que la Dirección de Administración de Flota proceda con la revisión y el seguimiento conducente.",
  },
  mantenimiento: {
    titulo: "SOLICITUD DE SERVICIO MECÁNICO",
    introduccion:
      "Se expide la presente orden para formalizar la solicitud de servicios de mantenimiento para la unidad vehicular que se especifica en el anexo, con el objetivo de garantizar la óptima operatividad del activo, de acuerdo con las especificaciones técnicas.",
  },
  siniestro: {
    titulo: "REPORTE DE SINIESTRO",
    introduccion:
      "A través del presente documento, se formaliza el reporte de un evento de siniestro que involucra a la unidad vehicular identificada en los anexos, solicitando la intervención inmediata de las áreas competentes para la debida atención y el cumplimiento de los protocolos establecidos.",
  },
};

const ETIQUETAS_SINIESTRO = { robo: "Robo", asalto: "Asalto", secuestro: "Secuestro" };

/**
 * Genera el PDF del reporte y regresa una URL de objeto (Blob) lista para
 * abrir o descargar. También se usa esa misma URL para que el reporte
 * quede guardado en el store y disponible para volver a descargarse.
 *
 * @param {Object} reporte  El reporte ya creado (con folio y fecha asignados por `reportesStore`).
 * @param {Array<Object>} unidades  Las unidades completas incluidas en el reporte (para imprimir sus datos).
 * @returns {string} URL del PDF generado.
 */
export function generarPdfReporte(reporte, unidades) {
  const documento = new jsPDF({ unit: "mm", format: "letter" });
  const anchoPagina = documento.internal.pageSize.getWidth();
  const altoPagina = documento.internal.pageSize.getHeight();
  const textoTipo = TEXTOS_POR_TIPO[reporte.tipoReporte];

  dibujarMarcaDeAgua(documento, anchoPagina, altoPagina);
  dibujarMembretado(documento, anchoPagina, reporte, textoTipo);

  let y = 55;
  y = escribirParrafo(documento, textoTipo.introduccion, y, anchoPagina);

  if (reporte.tipoReporte === "siniestro" && reporte.detalleSiniestro) {
    y += 4;
    documento.setFont("helvetica", "bold");
    documento.text(`Tipo de siniestro: ${ETIQUETAS_SINIESTRO[reporte.detalleSiniestro] ?? reporte.detalleSiniestro}`, 20, y);
    documento.setFont("helvetica", "normal");
    y += 8;
  }

  if (reporte.gravedad) {
    documento.setFont("helvetica", "bold");
    documento.text(`Nivel de gravedad: ${reporte.gravedad.toUpperCase()}`, 20, y);
    documento.setFont("helvetica", "normal");
    y += 10;
  }

  y += 4;
  documento.setFont("helvetica", "bold");
  documento.text("Unidad(es) reportada(s):", 20, y);
  documento.setFont("helvetica", "normal");
  y += 7;

  unidades.forEach((unidad) => {
    documento.text(
      `• Económico ${unidad.economico ?? "s/asignar"} — ${unidad.marca ?? ""} ${unidad.submarca ?? ""} — Placas: ${unidad.placas ?? "s/placa"}`,
      24,
      y,
    );
    y += 6;
  });

  y += 6;
  documento.setFont("helvetica", "bold");
  documento.text("Descripción del reportante:", 20, y);
  documento.setFont("helvetica", "normal");
  y += 7;
  y = escribirParrafo(documento, reporte.descripcion, y, anchoPagina);

  dibujarPieDeFirma(documento, reporte, altoPagina);

  return documento.output("bloburl").toString();
}

/** Membretado superior: logo, folio y fecha/hora exacta. */
function dibujarMembretado(documento, anchoPagina, reporte, textoTipo) {
  documento.addImage(LOGO_CFE_BASE64, "PNG", 20, 12, 28, 10);

  documento.setFontSize(9);
  documento.setFont("helvetica", "normal");
  documento.text("Comisión Federal de Electricidad — Transmisión Zona Guerrero", anchoPagina - 20, 15, { align: "right" });
  documento.text("Sistema PV-ZTG · Gestión de Flota Vehicular", anchoPagina - 20, 20, { align: "right" });

  documento.setDrawColor(0, 104, 71);
  documento.setLineWidth(0.5);
  documento.line(20, 26, anchoPagina - 20, 26);

  documento.setFontSize(15);
  documento.setFont("helvetica", "bold");
  documento.setTextColor(0, 104, 71);
  documento.text(textoTipo.titulo, anchoPagina / 2, 36, { align: "center" });
  documento.setTextColor(0, 0, 0);

  const fecha = new Date(reporte.fecha);
  const fechaFormateada = fecha.toLocaleDateString("es-MX", { day: "2-digit", month: "2-digit", year: "numeric" });
  const horaFormateada = fecha.toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false });

  documento.setFontSize(10);
  documento.setFont("helvetica", "normal");
  documento.text(`Folio: ${reporte.folio}`, 20, 44);
  documento.text(`Fecha: ${fechaFormateada}   Hora: ${horaFormateada}`, anchoPagina - 20, 44, { align: "right" });
  documento.text(`Reportado por: ${reporte.autorNombre} — Jefe de Departamento de ${reporte.autorDepartamento}`, 20, 50);
}

/** Marca de agua diagonal con el nombre del sistema, sobre toda la página. */
function dibujarMarcaDeAgua(documento, anchoPagina, altoPagina) {
  documento.saveGraphicsState();
  documento.setGState(new documento.GState({ opacity: 0.06 }));
  documento.setFontSize(60);
  documento.setFont("helvetica", "bold");
  documento.setTextColor(0, 104, 71);
  documento.text("CFE · PV-ZTG", anchoPagina / 2, altoPagina / 2, { align: "center", angle: 45 });
  documento.restoreGraphicsState();
  documento.setTextColor(0, 0, 0);
}

/** Escribe un párrafo con salto de línea automático y regresa la posición Y siguiente. */
function escribirParrafo(documento, texto, y, anchoPagina) {
  const lineas = documento.splitTextToSize(texto ?? "", anchoPagina - 40);
  documento.text(lineas, 20, y);
  return y + lineas.length * 5.5 + 4;
}

/** Pie de página con línea de firma y aviso de confidencialidad. */
function dibujarPieDeFirma(documento, reporte, altoPagina) {
  const yFirma = altoPagina - 40;
  documento.setDrawColor(150, 150, 150);
  documento.line(20, yFirma, 90, yFirma);
  documento.setFontSize(9);
  documento.text(reporte.autorNombre, 20, yFirma + 5);
  documento.text(`Jefe de Departamento — ${reporte.autorDepartamento}`, 20, yFirma + 10);

  documento.setFontSize(7.5);
  documento.setTextColor(120, 120, 120);
  documento.text(
    "Documento generado automáticamente por el Sistema PV-ZTG. Válido como constancia interna de reporte.",
    20,
    altoPagina - 12,
  );
}
