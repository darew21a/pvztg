import { jsPDF } from "jspdf";
import { LOGO_CFE_BASE64 } from "../assets/logoCfeBase64.js";

function obtenerPlacaParaPdf(unidad) {
  const placaOriginal = (unidad?.placas ?? "").trim();
  const placa2025 = (unidad?.placas2025 ?? "").trim();

  if (!placaOriginal && !placa2025) return "Sin placa";
  if (!placa2025) return placaOriginal;
  if (/^VENCE|^CADUCA|^EXPIRA|^VENC/i.test(placa2025) || /\bVENCE\b|\d{1,2}\/\d{1,2}\/\d{4}/i.test(placa2025)) {
    return placaOriginal || placa2025;
  }
  return placa2025 || placaOriginal;
}

function escribirCabeceraDepartamento(documento, anchoPagina, nombreDepartamento, yInicio) {
  documento.addImage(LOGO_CFE_BASE64, "PNG", 18, 12, 32, 12);
  documento.setFontSize(12);
  documento.setFont("helvetica", "bold");
  documento.setTextColor(0, 104, 71);
  documento.text("Flota Vehicular", anchoPagina / 2, 18, { align: "center" });
  documento.setTextColor(0, 0, 0);
  documento.setFontSize(9);
  documento.text("Comisión Federal de Electricidad - Transmisión Zona Guerrero", anchoPagina - 18, 14, { align: "right" });
  documento.setDrawColor(0, 104, 71);
  documento.line(18, 28, anchoPagina - 18, 28);
  documento.setFontSize(11);
  documento.setFont("helvetica", "bold");
  documento.text(nombreDepartamento, 18, yInicio);
  documento.setFont("helvetica", "normal");
}

export function generarPdfFlotaVehicular({ departamentos = [], unidades = [] }) {
  const documento = new jsPDF({ unit: "mm", format: "a4" });
  const anchoPagina = documento.internal.pageSize.getWidth();
  const altoPagina = documento.internal.pageSize.getHeight();
  const margen = 18;

  const unidadesPorDepartamento = new Map();
  departamentos.forEach((departamento) => unidadesPorDepartamento.set(departamento.id, []));
  unidadesPorDepartamento.set("sin-departamento", []);

  unidades.forEach((unidad) => {
    const clave = unidad?.departamento ?? "sin-departamento";
    const lista = unidadesPorDepartamento.get(clave) ?? [];
    lista.push(unidad);
    unidadesPorDepartamento.set(clave, lista);
  });

  const departamentosOrdenados = [...departamentos, { id: "sin-departamento", nombre: "Sin departamento" }];
  let y = 36;

  departamentosOrdenados.forEach((departamento, indice) => {
    const nombreDepartamento = departamento?.nombre ?? "Sin departamento";
    const unidadesDelDepartamento = unidadesPorDepartamento.get(departamento.id) ?? [];

    if (indice > 0 && y > altoPagina - 35) {
      documento.addPage();
      y = 20;
    }

    if (indice > 0 && y < 25) {
      documento.addPage();
      y = 20;
    }

    escribirCabeceraDepartamento(documento, anchoPagina, nombreDepartamento, y);
    y += 8;

    if (unidadesDelDepartamento.length === 0) {
      documento.setFontSize(9);
      documento.text("No hay unidades registradas en este departamento.", margen, y + 4);
      y += 18;
      return;
    }

    documento.setFontSize(8.5);
    documento.setFont("helvetica", "bold");
    documento.text("Económico", margen, y + 7);
    documento.text("Placas", 45, y + 7);
    documento.text("Marca/Submarca", 76, y + 7);
    documento.text("Resguardante", 126, y + 7);
    documento.text("Comb.", 164, y + 7);
    documento.text("Km", 180, y + 7);
    documento.setFont("helvetica", "normal");
    documento.setDrawColor(200, 200, 200);
    documento.line(margen, y + 9, anchoPagina - margen, y + 9);
    y += 12;

    unidadesDelDepartamento.forEach((unidad) => {
      if (y > altoPagina - 22) {
        documento.addPage();
        y = 20;
        escribirCabeceraDepartamento(documento, anchoPagina, nombreDepartamento, y);
        y += 8;
        documento.setFontSize(8.5);
        documento.setFont("helvetica", "bold");
        documento.text("Económico", margen, y + 7);
        documento.text("Placas", 45, y + 7);
        documento.text("Marca/Submarca", 76, y + 7);
        documento.text("Resguardante", 126, y + 7);
        documento.text("Comb.", 164, y + 7);
        documento.text("Km", 180, y + 7);
        documento.setFont("helvetica", "normal");
        documento.line(margen, y + 9, anchoPagina - margen, y + 9);
        y += 12;
      }

      const economico = unidad?.economico ?? "s/e";
      const marca = `${unidad?.marca ?? ""} ${unidad?.submarca ?? ""}`.trim() || "Sin marca";
      const placa = obtenerPlacaParaPdf(unidad);
      const resguardante = unidad?.conductorAsignado || "Sin asignar";
      const combustible = unidad?.tipoCombustible || "Sin capturar";
      const kilometraje = unidad?.kilometraje ? `${unidad.kilometraje.toLocaleString("es-MX")}` : "Sin capturar";

      documento.text(String(economico), margen, y + 5, { maxWidth: 24 });
      documento.text(String(placa), 45, y + 5, { maxWidth: 27 });
      documento.text(String(marca), 76, y + 5, { maxWidth: 44 });
      documento.text(String(resguardante), 126, y + 5, { maxWidth: 34 });
      documento.text(String(combustible), 164, y + 5, { maxWidth: 16 });
      documento.text(String(kilometraje), 180, y + 5, { maxWidth: 14 });
      y += 6;
    });

    y += 10;
  });

  documento.setFontSize(8);
  documento.setTextColor(120, 120, 120);
  documento.text("Documento generado automáticamente por PV-ZTG.", margen, altoPagina - 10);

  return documento.output("bloburl");
}
