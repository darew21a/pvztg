import assert from "node:assert/strict";
import { test } from "node:test";
import {
  describirDependenciasDepartamento,
  extraerErrorEliminacionDepartamento,
} from "./departamentoDependencias.js";

test("describe las referencias API con conteos y una resolución compatible con el portal", () => {
  assert.deepEqual(
    describirDependenciasDepartamento([
      { tipo: "unidades", cantidad: 2, referencia: "unidades.departamento_id" },
      { tipo: "usuarios", cantidad: 1, referencia: "usuarios.departamento_id" },
      { tipo: "reportes", cantidad: 3, referencia: "reportes.departamento_id" },
    ]),
    [
      {
        tipo: "unidades",
        nombre: "Unidades",
        cantidad: 2,
        referencia: "unidades.departamento_id",
        resolucion: "En Flota, abre cada unidad y cambia su departamento. Sus tickets, pólizas y demás historial permanecen ligados a la unidad; no se eliminan.",
      },
      {
        tipo: "usuarios",
        nombre: "Usuarios",
        cantidad: 1,
        referencia: "usuarios.departamento_id",
        resolucion: "En Gestión de accesos, edita cada usuario y asígnale otro departamento activo. El rol de jefe de departamento requiere conservar un departamento.",
      },
      {
        tipo: "reportes",
        nombre: "Reportes",
        cantidad: 3,
        referencia: "reportes.departamento_id",
        resolucion: "El portal no permite cambiar el departamento de un reporte ni desvincularlo de forma segura. Conserva este departamento y solicita una reasignación administrativa aprobada; no borres el reporte.",
      },
    ],
  );
});

test("preserva el mensaje, código y dependencias de un error API", () => {
  const error = extraerErrorEliminacionDepartamento({
    mensaje: "No se puede borrar: hay referencias.",
    codigo: "DEPENDENCIAS_EXISTENTES",
    dependencias: [{ tipo: "usuarios", cantidad: 2 }],
  });

  assert.equal(error.mensaje, "No se puede borrar: hay referencias.");
  assert.equal(error.codigo, "DEPENDENCIAS_EXISTENTES");
  assert.equal(error.dependencias[0].referencia, "usuarios.departamento_id");
  assert.equal(error.dependencias[0].cantidad, 2);
});
