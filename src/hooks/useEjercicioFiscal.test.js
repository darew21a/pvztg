import assert from "node:assert/strict";
import test from "node:test";
import { obtenerAniosDisponibles } from "./useEjercicioFiscal.js";

test("muestra el año actual y los años con datos, en orden descendente", () => {
  assert.deepEqual(
    obtenerAniosDisponibles([2020, 2025, 2026, 2026, Number.NaN], 2026),
    [2026, 2025, 2020],
  );
});

test("no agrega años vacíos y conserva cualquier año que tenga registros", () => {
  assert.deepEqual(obtenerAniosDisponibles([2018, 2030], 2026), [2030, 2026, 2018]);
});

test("al comenzar un año nuevo, lo agrega y conserva el histórico registrado", () => {
  assert.deepEqual(obtenerAniosDisponibles([], 2027), [2027, 2026]);
});

test("al iniciar sin historial, solo muestra el año actual", () => {
  assert.deepEqual(obtenerAniosDisponibles([], 2026), [2026]);
});
