import assert from "node:assert/strict";
import { test } from "node:test";
import {
  analizarParqueVehicular,
  buscarHojaOficialConEncabezados,
  buscarIndicePlacasVigentes,
  leerFilasHojaOficial,
  prepararCambiosPlacasVigentes,
} from "./parqueVehicularParser.js";

test("reads exactly 52 vehicles across repeated headers and excludes section headings", () => {
  const encabezados = [null, null, "ECONOMICO", "MARCA", "R.P.E RESGUARDANTE", "ARRENDADORA", "NOMBRE RESGUARDANTE SAP"];
  const filas = [encabezados];
  let siguienteEconomico = 1;

  for (let seccion = 0; seccion < 9; seccion += 1) {
    if (seccion > 0) filas.push([null, null, `Sección ${seccion}`], encabezados);
    const cantidadEnSeccion = seccion < 7 ? 6 : 5;
    for (let fila = 0; fila < cantidadEnSeccion; fila += 1) {
      filas.push([null, null, String(siguienteEconomico++), "Marca", "RPE", "Arrendadora", "Resguardante"]);
    }
  }
  filas.push([], [], ["", "VIN-FUERA-DE-LA-RELACION"]);

  const resultado = leerFilasHojaOficial(
    { filas, indice: 0, nombre: "RECEPCION DE VEHICULOS" },
    () => null,
  );

  assert.equal(resultado.filas.length, 52);
  assert.equal(resultado.filasInvalidas, 0);
  assert.equal(resultado.filas.some(({ economico }) => economico.startsWith("Sección")), false);
  assert.equal(resultado.filas.every(({ cambios }) => !cambios.numeroSerie), true);
});

test("selects only RECEPCION DE VEHICULOS, not similarly named worksheets", () => {
  const encabezados = ["ECONOMICO", "NO. SERIE"];
  const hoja = buscarHojaOficialConEncabezados([
    { sheet: "RECEPCION DE VEHI", data: [encabezados, ["ERRONEA", "VIN-1"]] },
    { sheet: "RECEPCION DE VEHICULOS", data: [encabezados, ["FIEL", "VIN-2"]] },
  ]);

  assert.equal(hoja.nombre, "RECEPCION DE VEHICULOS");
  assert.deepEqual(hoja.filas[1], ["FIEL", "VIN-2"]);
});

test("fails clearly when the authoritative reception worksheet is missing", () => {
  assert.throws(
    () => buscarHojaOficialConEncabezados([
      { sheet: "RECEPCION DE VEHI", data: [["ECONOMICO", "NO. SERIE"]] },
    ]),
    /No se encontró la hoja oficial "RECEPCION DE VEHICULOS"/,
  );
});

test("inherits the department heading before the first table header and updates it at section changes", () => {
  const filas = [
    ["JEFATURA"],
    ["ECONOMICO", "NO. SERIE"],
    ["100", "VIN-100"],
    ["LINEAS"],
    ["101", "VIN-101"],
  ];
  const departamentos = new Map([["JEFATURA", "1"], ["LINEAS", "2"]]);
  const resultado = leerFilasHojaOficial(
    { filas, indice: 1, nombre: "RECEPCION DE VEHICULOS" },
    (nombre) => departamentos.get(String(nombre).trim().toUpperCase()) ?? null,
  );

  assert.deepEqual(resultado.filas.map(({ jefatura }) => jefatura), ["JEFATURA", "LINEAS"]);
});

test("selects current-year plate columns and never treats a previous year as current", () => {
  assert.equal(buscarIndicePlacasVigentes(["ECONOMICO", "PLACAS 2026", "PLACAS 2025"], 2026), 1);
  assert.equal(buscarIndicePlacasVigentes(["ECONOMICO", "PLACAS VIGENTES AÑO ACTUAL"], 2026), 1);
  assert.equal(buscarIndicePlacasVigentes(["ECONOMICO", "PLACAS 2025"], 2026), -1);
  assert.equal(buscarIndicePlacasVigentes(["ECONOMICO", "PLACAS 2025"], 2025), 1);
});

test("records the year attached to imported current plates and rejects stale year columns", () => {
  const currentYear = new Date().getFullYear();
  const current = leerFilasHojaOficial({
    nombre: "RECEPCION DE VEHICULOS",
    indice: 0,
    filas: [
      ["ECONOMICO", "NO. SERIE", `PLACAS ${currentYear}`],
      ["E-1", "VIN-1", "ABC-123"],
    ],
  });
  const stale = leerFilasHojaOficial({
    nombre: "RECEPCION DE VEHICULOS",
    indice: 0,
    filas: [
      ["ECONOMICO", "NO. SERIE", `PLACAS ${currentYear - 1}`],
      ["E-1", "VIN-1", "OLD-123"],
    ],
  });

  assert.equal(current.filas[0].cambios.placas2025, "ABC-123");
  assert.equal(current.filas[0].cambios.placasVigentesAnio, currentYear);
  assert.equal(stale.filas[0].cambios.placas2025, "OLD-123");
  assert.equal(stale.filas[0].cambios.placasVigentesAnio, currentYear);
  assert.equal(stale.filas[0].anioPlacasVigentesFuente, currentYear - 1);

  const existing = analizarParqueVehicular(stale, [{
    id: "1",
    economico: "E-1",
    placas2025: "OLD-123",
    placasVigentesAnio: currentYear - 1,
  }], () => null);
  assert.equal(existing.actualizaciones[0].cambios.placasVigentesAnio, currentYear);
  assert.equal(existing.actualizaciones[0].anioPlacasVigentesFuente, currentYear - 1);
});

test("requires a decision before reusing stale plate values and preserves them exactly when confirmed", () => {
  const currentYear = new Date().getFullYear();
  const candidate = { placas2025: "VENCE EN 2029 - HDC.824.H", placasVigentesAnio: currentYear };
  const ignored = prepararCambiosPlacasVigentes(candidate, currentYear - 1, false, currentYear);
  const confirmed = prepararCambiosPlacasVigentes(candidate, currentYear - 1, true, currentYear);

  assert.equal(Object.hasOwn(ignored, "placas2025"), false);
  assert.equal(Object.hasOwn(ignored, "placasVigentesAnio"), false);
  assert.equal(confirmed.placas2025, "VENCE EN 2029 - HDC.824.H");
  assert.equal(confirmed.placasVigentesAnio, currentYear);
});

test("maps cylinders, Edenred card, and NIP values from the official relation", () => {
  const parsed = leerFilasHojaOficial({
    nombre: "RECEPCION DE VEHICULOS",
    indice: 0,
    filas: [[
      "ECONOMICO", "NO. SERIE", "CILINDROS", "NO. TARJETA EDENRED", "NIP", "NOMBRE RESGUARDANTE SAP",
    ], [
      "E-1", "VIN-1", 8, "6363180031864901", 4777, "Nombre del resguardante",
    ]],
  });

  assert.equal(parsed.filas[0].cambios.cilindros, "8");
  assert.equal(parsed.filas[0].cambios.tarjetaEdenred, "6363180031864901");
  assert.equal(parsed.filas[0].cambios.nip, "4777");
  assert.equal(parsed.filas[0].cambios.conductorAsignado, "Nombre del resguardante");
});

test("only treats new rows with a serial number as valid unit registrations", () => {
  const resultado = analizarParqueVehicular({
    nombreHoja: "Flota",
    filas: [
      {
        filaExcel: 8,
        economico: "E-008",
        jefatura: "Departamento no catalogado",
        cambios: { numeroSerie: "VIN-008", marca: "Marca" },
      },
      {
        filaExcel: 9,
        economico: "E-009",
        jefatura: "Departamento no catalogado",
        cambios: { placas: "ABC-009", marca: "Marca" },
      },
    ],
    filasInvalidas: 0,
  }, [], () => null);

  assert.equal(resultado.altasValidas.length, 1);
  assert.equal(resultado.altasValidas[0].economico, "E-008");
  assert.equal(resultado.altasSinNumeroSerie.length, 1);
  assert.equal(resultado.altasSinNumeroSerie[0].filaExcel, 9);
  assert.deepEqual(resultado.jefaturasNoEncontradas.map((fila) => fila.filaExcel), [8, 9]);
});

test("allows an existing unit to be updated by its economic number when the row lacks a serial", () => {
  const resultado = analizarParqueVehicular({
    nombreHoja: "Flota",
    filas: [{
      filaExcel: 12,
      economico: "E-012",
      jefatura: "",
      cambios: { marca: "Nueva marca" },
    }],
    filasInvalidas: 0,
  }, [{ id: "12", economico: "E-012", marca: "Marca anterior" }], () => null);

  assert.equal(resultado.actualizaciones.length, 1);
  assert.equal(resultado.actualizaciones[0].unidad.id, "12");
  assert.equal(resultado.altasSinNumeroSerie.length, 0);
});

test("uses VIN only as a fallback when an economic number is not yet registered", () => {
  const resultado = analizarParqueVehicular({
    nombreHoja: "Flota",
    filas: [{
      filaExcel: 13,
      economico: "E-013-NUEVO",
      jefatura: "Operación",
      cambios: { numeroSerie: "VIN-013", marca: "Marca actualizada" },
    }],
    filasInvalidas: 0,
  }, [{ id: "13", economico: "E-013-ANTERIOR", numeroSerie: "VIN-013", marca: "Marca anterior" }], () => 1);

  assert.equal(resultado.actualizaciones.length, 1);
  assert.equal(resultado.actualizaciones[0].unidad.id, "13");
  assert.equal(resultado.actualizaciones[0].cambios.economico, "E-013-NUEVO");
});

test("keeps separate official vehicles when the relation assigns them the same plate", () => {
  const resultado = analizarParqueVehicular({
    nombreHoja: "Flota",
    filas: [
      {
        filaExcel: 14,
        economico: "E-014",
        jefatura: "Operación",
        cambios: { numeroSerie: "VIN-014", placas: "COMPARTIDA-01", marca: "Marca" },
      },
      {
        filaExcel: 15,
        economico: "E-015",
        jefatura: "Operación",
        cambios: { numeroSerie: "VIN-015", placas: "COMPARTIDA-01", marca: "Marca" },
      },
    ],
    filasInvalidas: 0,
  }, [], () => 1);

  assert.equal(resultado.altasValidas.length, 2);
  assert.equal(resultado.duplicados.length, 0);
  assert.equal(resultado.conflictos.length, 0);
});

test("matches an existing unit by VIN even when another unit shares its plate", () => {
  const resultado = analizarParqueVehicular({
    nombreHoja: "Flota",
    filas: [{
      filaExcel: 18,
      economico: "E-018",
      jefatura: "Operación",
      cambios: { numeroSerie: "VIN-018", placas: "COMPARTIDA-01", marca: "Marca actualizada" },
    }],
    filasInvalidas: 0,
  }, [
    { id: "18", economico: "E-018", numeroSerie: "VIN-018", placas: "COMPARTIDA-01", marca: "Marca anterior" },
    { id: "19", economico: "E-019", numeroSerie: "VIN-019", placas: "COMPARTIDA-01", marca: "Otra marca" },
  ], () => 1);

  assert.equal(resultado.actualizaciones.length, 1);
  assert.equal(resultado.actualizaciones[0].unidad.id, "18");
  assert.equal(resultado.conflictos.length, 0);
});

test("uses the economic number as the authoritative identity when VIN points elsewhere", () => {
  const resultado = analizarParqueVehicular({
    nombreHoja: "Flota",
    filas: [{
      filaExcel: 22,
      economico: "E-022",
      jefatura: "Operación",
      cambios: { numeroSerie: "VIN-NUEVO", placas: "COMPARTIDA-01", marca: "Marca actualizada" },
    }],
    filasInvalidas: 0,
  }, [
    { id: "22", economico: "E-022", numeroSerie: "VIN-ANTERIOR", placas: "COMPARTIDA-01", marca: "Marca anterior" },
    { id: "23", economico: "E-023", numeroSerie: "VIN-NUEVO", placas: "COMPARTIDA-01", marca: "Otra marca" },
  ], () => 1);

  assert.equal(resultado.actualizaciones.length, 1);
  assert.equal(resultado.actualizaciones[0].unidad.id, "22");
  assert.equal(resultado.actualizaciones[0].cambios.numeroSerie, "VIN-NUEVO");
  assert.equal(resultado.conflictos.length, 0);
});

test("reports repeated economic numbers in the source instead of silently importing two units", () => {
  const resultado = analizarParqueVehicular({
    nombreHoja: "Flota",
    filas: [
      {
        filaExcel: 30,
        economico: "E-030",
        jefatura: "Operación",
        cambios: { numeroSerie: "VIN-030", marca: "Marca" },
      },
      {
        filaExcel: 31,
        economico: "E-030",
        jefatura: "Operación",
        cambios: { numeroSerie: "VIN-031", marca: "Marca" },
      },
    ],
    filasInvalidas: 0,
  }, [], () => 1);

  assert.equal(resultado.altasValidas.length, 1);
  assert.equal(resultado.conflictos.length, 1);
  assert.match(resultado.conflictos[0].motivo, /número económico/);
});
