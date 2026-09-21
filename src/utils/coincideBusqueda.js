function normalizarTexto(valor) {
	return String(valor ?? "")
		.normalize("NFD")
		.replace(/[\u0300-\u036f]/g, "")
		.toLowerCase()
		.replace(/a\.?\s*m\.?/g, "am")
		.replace(/p\.?\s*m\.?/g, "pm")
		.replace(/[^a-z0-9]/g, "");
}

function valoresBuscables(valor, visitados = new WeakSet()) {
	if (valor === null || valor === undefined) return [];
	if (valor instanceof Date) return [valor.toISOString(), valor.toLocaleString("es-MX"), valor.toLocaleDateString("es-MX")];
	if (typeof valor === "string") {
		const fecha = /^\d{4}-\d{2}-\d{2}(?:T|$)/.test(valor) ? new Date(valor) : null;
		return [valor, ...(fecha && !Number.isNaN(fecha.getTime()) ? valoresBuscables(fecha) : [])];
	}
	if (typeof valor !== "object") return [String(valor)];
	if (visitados.has(valor)) return [];
	visitados.add(valor);
	return Object.entries(valor).flatMap(([clave, contenido]) => [clave, ...valoresBuscables(contenido, visitados)]);
}

export function coincideBusqueda(fila, texto) {
	const termino = normalizarTexto(texto).trim();
	if (!termino) return false;
	return valoresBuscables(fila).some((valor) => normalizarTexto(valor).includes(termino));
}
