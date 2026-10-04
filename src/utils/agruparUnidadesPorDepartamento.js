function normalizarClave(valor) {
  return String(valor ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLocaleLowerCase("es-MX");
}

export function agruparUnidadesPorDepartamento(departamentos = [], unidades = []) {
  const grupos = new Map();
  const aliasDepartamento = new Map();

  departamentos.forEach((departamento) => {
    const id = String(departamento.id);
    if (!grupos.has(id)) grupos.set(id, { id, nombre: departamento.nombre, unidades: [] });
    const grupo = grupos.get(id);
    [departamento.id, departamento.nombre].forEach((alias) => {
      const clave = normalizarClave(alias);
      if (clave) aliasDepartamento.set(clave, grupo);
    });
  });

  const grupoSinDepartamento = { id: "sin-departamento", nombre: "Sin departamento", unidades: [] };
  grupos.set(grupoSinDepartamento.id, grupoSinDepartamento);

  unidades.forEach((unidad) => {
    const departamentoAsignado = [unidad?.departamentoId, unidad?.departamento]
      .map((valor) => aliasDepartamento.get(normalizarClave(valor)))
      .find(Boolean);

    if (departamentoAsignado) {
      departamentoAsignado.unidades.push(unidad);
      return;
    }

    const valorDesconocido = [unidad?.departamento, unidad?.departamentoId]
      .find((valor) => valor !== null && valor !== undefined && String(valor).trim() !== "");
    if (valorDesconocido === undefined) {
      grupoSinDepartamento.unidades.push(unidad);
      return;
    }

    const nombre = String(valorDesconocido).trim();
    const clave = `sin-catalogo:${normalizarClave(nombre)}`;
    if (!grupos.has(clave)) grupos.set(clave, { id: clave, nombre: `Departamento sin catálogo: ${nombre}`, unidades: [] });
    grupos.get(clave).unidades.push(unidad);
  });

  return [...grupos.values()];
}
