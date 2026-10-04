import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildDepartmentDependencies,
  createDepartmentDependencyError,
} from "../src/policies/departmentDependencies.js";

test("la respuesta de bloqueo enumera solo las referencias directas al departamento", () => {
  assert.deepEqual(
    buildDepartmentDependencies({ unidades: 4, usuarios: 2, reportes: 1 }),
    [
      { tipo: "unidades", cantidad: 4, referencia: "unidades.departamento_id" },
      { tipo: "usuarios", cantidad: 2, referencia: "usuarios.departamento_id" },
      { tipo: "reportes", cantidad: 1, referencia: "reportes.departamento_id" },
    ],
  );
});

test("la respuesta omite tipos sin referencias y normaliza conteos numéricos", () => {
  assert.deepEqual(
    buildDepartmentDependencies({ unidades: "0", usuarios: "3", reportes: 0 }),
    [{ tipo: "usuarios", cantidad: 3, referencia: "usuarios.departamento_id" }],
  );
});

test("el error API conserva un contrato estable para la UI", () => {
  const dependencies = buildDepartmentDependencies({ unidades: 1, usuarios: 0, reportes: 2 });
  const response = createDepartmentDependencyError("Operación", dependencies);

  assert.deepEqual(response, {
    mensaje: "No se puede borrar «Operación»: hay registros que lo referencian directamente. No se borró ningún dato.",
    codigo: "DEPENDENCIAS_EXISTENTES",
    dependencias: [
      { tipo: "unidades", cantidad: 1, referencia: "unidades.departamento_id" },
      { tipo: "reportes", cantidad: 2, referencia: "reportes.departamento_id" },
    ],
  });
});
