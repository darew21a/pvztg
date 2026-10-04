const DEPARTMENT_REFERENCES = {
  unidades: "unidades.departamento_id",
  usuarios: "usuarios.departamento_id",
  reportes: "reportes.departamento_id",
};

export function buildDepartmentDependencies(counts) {
  return Object.entries(DEPARTMENT_REFERENCES)
    .map(([tipo, referencia]) => ({
      tipo,
      cantidad: Number(counts[tipo] ?? 0),
      referencia,
    }))
    .filter((dependency) => dependency.cantidad > 0);
}

export function createDepartmentDependencyError(departmentName, dependencies) {
  return {
    mensaje: `No se puede borrar «${departmentName}»: hay registros que lo referencian directamente. No se borró ningún dato.`,
    codigo: "DEPENDENCIAS_EXISTENTES",
    dependencias: dependencies,
  };
}
