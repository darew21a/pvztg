import assert from "node:assert/strict";
import test from "node:test";
import { analizarTransacciones } from "./edenredParser.js";

test("no marca diferencias regulares de rendimiento como anomalía", () => {
  const resultado = analizarTransacciones([{
    "Estado Transacción": "APROBADA",
    "Fecha transacción": "15/01/2027",
    Placa: "ABC-123",
    "Id Vehículo": "E-1",
    "Km Transacción": 12000,
    Recorrido: 100,
    "Rendimiento Vehículo": 7,
    "Rendimiento Real": 3.79,
    "Capacidad de Tanque": 100,
    "Cantidad Mercancía": 20,
    "Importe Transacción": 500,
  }], [{
    id: "1",
    economico: "E-1",
    placas: "ABC-123",
  }]);

  assert.deepEqual(resultado.resumenPorUnidad[0].anomalias, []);
});

test("conserva alertas de capacidad y odómetro con evidencia objetiva", () => {
  const resultado = analizarTransacciones([{
    "Estado Transacción": "APROBADA",
    "Fecha transacción": "15/01/2027",
    Placa: "ABC-123",
    "Id Vehículo": "E-1",
    "Km Transacción": 4000030,
    Recorrido: 100,
    "Rendimiento Vehículo": 7,
    "Rendimiento Real": 3.79,
    "Capacidad de Tanque": 50,
    "Cantidad Mercancía": 60,
    "Importe Transacción": 1500,
  }], [{
    id: "1",
    economico: "E-1",
    placas: "ABC-123",
  }]);
  const alerts = resultado.resumenPorUnidad[0].anomalias;

  assert.equal(alerts.length, 2);
  assert.ok(alerts.some((alert) => alert.startsWith("Capacidad:")));
  assert.ok(alerts.some((alert) => alert.startsWith("Odómetro:")));
  assert.ok(alerts.every((alert) => !alert.startsWith("Rendimiento:")));
});

test("aplica una tolerancia del diez por ciento a la capacidad del tanque", () => {
  const resultado = analizarTransacciones([{
    "Estado Transacción": "APROBADA",
    "Fecha transacción": "15/01/2027",
    Placa: "ABC-123",
    "Id Vehículo": "E-1",
    "Km Transacción": 12000,
    Recorrido: 100,
    "Capacidad de Tanque": 60,
    "Cantidad Mercancía": 63,
    "Importe Transacción": 1500,
  }], [{
    id: "1",
    economico: "E-1",
    placas: "ABC-123",
  }]);

  assert.deepEqual(resultado.resumenPorUnidad[0].anomalias, []);
});
