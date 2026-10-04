/**
 * Abre la pestaña durante el gesto del usuario y la dirige al PDF ya generado.
 * Si el navegador bloquea ventanas emergentes, descarga el archivo directamente.
 */
export async function mostrarPdfGenerado(generarPdf, nombreArchivo) {
  const pestaña = window.open("about:blank", "_blank");

  try {
    const urlPdf = await generarPdf();
    if (typeof urlPdf !== "string" || !urlPdf.startsWith("blob:")) {
      throw new Error("El generador no devolvió un PDF válido.");
    }

    if (pestaña && !pestaña.closed) {
      pestaña.location.href = urlPdf;
      return;
    }

    const enlace = document.createElement("a");
    enlace.href = urlPdf;
    enlace.download = nombreArchivo;
    document.body.appendChild(enlace);
    enlace.click();
    enlace.remove();
  } catch (error) {
    if (pestaña && !pestaña.closed) pestaña.close();
    window.alert(`No fue posible generar o abrir el PDF: ${error.message}`);
  }
}
