const DETALLES_DEPENDENCIAS_DEPARTAMENTO = {
  unidades: {
    nombre: "Unidades",
    referencia: "unidades.departamento_id",
    resolucion: "En Flota, abre cada unidad y cambia su departamento. Sus tickets, pólizas y demás historial permanecen ligados a la unidad; no se eliminan.",
  },
  usuarios: {
    nombre: "Usuarios",
    referencia: "usuarios.departamento_id",
    resolucion: "En Gestión de accesos, edita cada usuario y asígnale otro departamento activo. El rol de jefe de departamento requiere conservar un departamento.",
  },
  reportes: {
    nombre: "Reportes",
    referencia: "reportes.departamento_id",
    resolucion: "El portal no permite cambiar el departamento de un reporte ni desvincularlo de forma segura. Conserva este departamento y solicita una reasignación administrativa aprobada; no borres el reporte.",
  },
};

export function describirDependenciasDepartamento(dependencias = []) {
  return dependencias.map((dependencia) => {
    const detalle = DETALLES_DEPENDENCIAS_DEPARTAMENTO[dependencia.tipo];
    return {
      tipo: dependencia.tipo,
      nombre: detalle?.nombre ?? dependencia.tipo,
      cantidad: Number(dependencia.cantidad) || 0,
      referencia: dependencia.referencia ?? detalle?.referencia ?? null,
      resolucion: detalle?.resolucion ?? "Revisa los registros que referencian directamente este departamento antes de volver a intentar.",
    };
  }).filter((dependencia) => dependencia.cantidad > 0);
}

export function extraerErrorEliminacionDepartamento(body) {
  return {
    mensaje: body?.mensaje ?? "No fue posible eliminar el departamento.",
    codigo: body?.codigo ?? null,
    dependencias: describirDependenciasDepartamento(body?.dependencias),
  };
}
