import assert from "node:assert/strict";
import test from "node:test";
import { calcularTotalesEjercicio, normalizarMesesEjercicio } from "./normalizarMesesEjercicio.js";

test("normaliza los doce meses de enero a diciembre y rellena meses sin datos", () => {
  const meses = normalizarMesesEjercicio([
    { mes: "2026-12", km: 120, litros: 12, importe: 240 },
    { mes: "2026-03", km: 30, litros: 3, importe: 60 },
  ], 2026);

  assert.equal(meses.length, 12);
  assert.deepEqual(meses.map(({ nombre }) => nombre), [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
  ]);
  assert.deepEqual(meses[0], { mes: "2026-01", nombre: "Enero", km: 0, litros: 0, importe: 0 });
  assert.deepEqual(meses[2], { mes: "2026-03", nombre: "Marzo", km: 30, litros: 3, importe: 60 });
  assert.deepEqual(meses[11], { mes: "2026-12", nombre: "Diciembre", km: 120, litros: 12, importe: 240 });
});

test("acumula duplicados del mismo mes para preservar las contribuciones de varias unidades", () => {
  const meses = normalizarMesesEjercicio([
    { mes: "2026-01", km: 10, litros: 2, importe: 20 },
    { mes: "2026-01", km: 15, litros: 3, importe: 30 },
  ], 2026);

  assert.deepEqual(meses[0], { mes: "2026-01", nombre: "Enero", km: 25, litros: 5, importe: 50 });
});

test("calcula los totales anuales usando las mismas filas mensuales impresas", () => {
  const meses = normalizarMesesEjercicio([
    { mes: "2026-12", km: 120, litros: 12, importe: 240 },
    { mes: "2026-01", km: 10, litros: 2, importe: 20 },
  ], 2026);

  assert.deepEqual(calcularTotalesEjercicio(meses), { km: 130, litros: 14, importe: 260 });
});

test("rechaza datos fuera del ejercicio solicitado", () => {
  assert.throws(
    () => normalizarMesesEjercicio([{ mes: "2025-12", km: 1, litros: 1, importe: 1 }], 2026),
    /no pertenece al ejercicio 2026/,
  );
});

test("rechaza meses y valores numéricos inválidos", () => {
  assert.throws(
    () => normalizarMesesEjercicio([{ mes: "2026-13", km: 1, litros: 1, importe: 1 }], 2026),
    /no es válido/,
  );
  assert.throws(
    () => normalizarMesesEjercicio([{ mes: "2026-01", km: Number.NaN, litros: 1, importe: 1 }], 2026),
    /valor de km/,
  );
});
