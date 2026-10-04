import assert from "node:assert/strict";
import test from "node:test";
import { detectarAnomaliasFlota } from "./detectarAnomaliasFlota.js";

const unidadCompleta = {
  id: "completa",
  estado: "activa",
  kilometraje: 120,
  tipoCombustible: "Gasolina",
  departamentoId: 4,
  economico: "E-10",
  conductorAsignado: "Resguardante",
  marca: "Marca",
  submarca: "Submarca",
  tipo: "Sedán",
  modelo: "2024",
  placas: "ABC-123",
  placas2025: "XYZ-789",
  placasVigentesAnio: new Date().getFullYear(),
  numeroSerie: "VIN-10",
  rpeResguardante: "RPE-10",
  centroGestor: "CG-10",
  centroCostos: "CC-10",
  ubicacionTecnica: "UT-10",
  arrendadora: "Propia",
};

const unidades = [
  { ...unidadCompleta, id: "1", economico: "E-10", numeroSerie: "VIN-1" },
  { ...unidadCompleta, id: "2", economico: "E-20", numeroSerie: "VIN-2", placas: "abc-123" },
];

test("flags shared current plates without merging their separate units", () => {
  const duplicados = detectarAnomaliasFlota(unidades, [])
    .filter((anomalia) => anomalia.camposDuplicados && anomalia.campoUnidad === "placas");

  assert.equal(duplicados.length, 1);
  assert.equal(duplicados[0].campoUnidad, "placas");
  assert.deepEqual(duplicados[0].unidadIds, ["1", "2"]);
});

test("continues to identify duplicated economic numbers", () => {
  const duplicados = detectarAnomaliasFlota([
    { ...unidades[0], economico: "E-10" },
    { ...unidades[1], economico: "E-10", placas: "DIFFERENT-PLATE", placas2025: "DIFFERENT-CURRENT-PLATE" },
  ], []).filter((anomalia) => anomalia.camposDuplicados && anomalia.campoUnidad === "economico");

  assert.equal(duplicados.length, 1);
  assert.equal(duplicados[0].campoUnidad, "economico");
  assert.deepEqual(duplicados[0].unidadIds, ["1", "2"]);
});

test("detects duplicates in current-year plates and VINs as separate identity-field findings", () => {
  const duplicados = detectarAnomaliasFlota([
    { ...unidadCompleta, id: "1", economico: "E-1", placas: "PLATE-1", placas2025: "VIG-100", numeroSerie: "VIN-SAME" },
    { ...unidadCompleta, id: "2", economico: "E-2", placas: "PLATE-2", placas2025: "vig100", numeroSerie: "VIN-SAME" },
    { ...unidadCompleta, id: "3", economico: "E-3", placas: "PLATE-3", placas2025: "VIG100", numeroSerie: "VIN-3" },
  ], []).filter((anomalia) => anomalia.camposDuplicados);

  assert.deepEqual(
    duplicados.map((anomalia) => anomalia.campoUnidad).sort(),
    ["numeroSerie", "placas2025"],
  );
  assert.deepEqual(duplicados.find((anomalia) => anomalia.campoUnidad === "placas2025").unidadIds, ["1", "2", "3"]);
  assert.deepEqual(duplicados.find((anomalia) => anomalia.campoUnidad === "numeroSerie").unidadIds, ["1", "2"]);
});

test("normalizes punctuation and spacing in VINs before detecting duplicates", () => {
  const duplicados = detectarAnomaliasFlota([
    { ...unidadCompleta, id: "1", numeroSerie: "1HG-CM826-33A004352" },
    { ...unidadCompleta, id: "2", numeroSerie: "1HG CM826 33A004352" },
  ], []).filter((finding) => finding.campoUnidad === "numeroSerie" && finding.camposDuplicados);

  assert.equal(duplicados.length, 1);
  assert.deepEqual(duplicados[0].unidadIds, ["1", "2"]);
});

test("extracts current-year plate serials from free text and ignores punctuation and expiration years", () => {
  const findings = detectarAnomaliasFlota([
    { ...unidadCompleta, id: "1", economico: "E-1", numeroSerie: "VIN-1", placas2025: "VENCE EN 2029 · HDC824H" },
    { ...unidadCompleta, id: "2", economico: "E-2", numeroSerie: "VIN-2", placas2025: "HDC-824-H" },
    { ...unidadCompleta, id: "3", economico: "E-3", numeroSerie: "VIN-3", placas2025: "HDC 824 H" },
  ], []);
  const duplicate = findings.find((finding) => finding.campoUnidad === "placas2025" && finding.camposDuplicados);

  assert.ok(duplicate);
  assert.equal(duplicate.valorDuplicado, "HDC824H");
  assert.deepEqual(duplicate.unidadIds, ["1", "2", "3"]);

  const expiryTextOnly = detectarAnomaliasFlota([
    { ...unidadCompleta, id: "4", economico: "E-4", numeroSerie: "VIN-4", placas2025: "VENCE EN 2029" },
    { ...unidadCompleta, id: "5", economico: "E-5", numeroSerie: "VIN-5", placas2025: "VENCE EN 2029" },
    { ...unidadCompleta, id: "6", economico: "E-6", numeroSerie: "VIN-6", placas2025: "VENCE EN 2029" },
  ], []);
  assert.ok(!expiryTextOnly.some((finding) => finding.campoUnidad === "placas2025" && finding.camposDuplicados));
});

test("allows the same current-year plate on two units but flags it from the third unit onward", () => {
  const year = new Date().getFullYear();
  const twoUnits = detectarAnomaliasFlota([
    { ...unidadCompleta, id: "1", economico: "E-1", numeroSerie: "VIN-1", placas2025: "ABC-123", placasVigentesAnio: year },
    { ...unidadCompleta, id: "2", economico: "E-2", numeroSerie: "VIN-2", placas2025: "ABC123", placasVigentesAnio: year },
  ], []);
  const threeUnits = detectarAnomaliasFlota([
    { ...unidadCompleta, id: "1", economico: "E-1", numeroSerie: "VIN-1", placas2025: "ABC-123", placasVigentesAnio: year },
    { ...unidadCompleta, id: "2", economico: "E-2", numeroSerie: "VIN-2", placas2025: "ABC123", placasVigentesAnio: year },
    { ...unidadCompleta, id: "3", economico: "E-3", numeroSerie: "VIN-3", placas2025: "ABC 123", placasVigentesAnio: year },
  ], []);

  assert.ok(!twoUnits.some((finding) => finding.campoUnidad === "placas2025" && finding.camposDuplicados));
  assert.ok(threeUnits.some((finding) => finding.campoUnidad === "placas2025" && finding.camposDuplicados));
});

test("normalizes different state plate layouts to the same serial", () => {
  const findings = detectarAnomaliasFlota([
    { ...unidadCompleta, id: "1", economico: "E-1", numeroSerie: "VIN-1", placas2025: "AB-1234" },
    { ...unidadCompleta, id: "2", economico: "E-2", numeroSerie: "VIN-2", placas2025: "AB 1234" },
    { ...unidadCompleta, id: "3", economico: "E-3", numeroSerie: "VIN-3", placas2025: "AB/1234" },
  ], []);

  const duplicate = findings.find((finding) => finding.campoUnidad === "placas2025" && finding.camposDuplicados);
  assert.equal(duplicate.valorDuplicado, "AB1234");
  assert.deepEqual(duplicate.unidadIds, ["1", "2", "3"]);
});

test("detects five-digit plate formats across free-form current-year plate text", () => {
  const year = new Date().getFullYear();
  const findings = detectarAnomaliasFlota([
    { ...unidadCompleta, id: "1", economico: "E-1", numeroSerie: "VIN-1", placas2025: "VENCE EN 2029 · ABC-12345", placasVigentesAnio: year },
    { ...unidadCompleta, id: "2", economico: "E-2", numeroSerie: "VIN-2", placas2025: "ABC 12345", placasVigentesAnio: year },
    { ...unidadCompleta, id: "3", economico: "E-3", numeroSerie: "VIN-3", placas2025: "A.B.C/12345 · observación", placasVigentesAnio: year },
  ], []);
  const duplicate = findings.find((finding) => finding.campoUnidad === "placas2025" && finding.camposDuplicados);

  assert.ok(duplicate);
  assert.equal(duplicate.valorDuplicado, "ABC12345");
  assert.deepEqual(duplicate.unidadIds, ["1", "2", "3"]);
});

test("requires and detects duplicates only for plates verified for the current year", () => {
  const year = new Date().getFullYear();
  const stale = detectarAnomaliasFlota([
    { ...unidadCompleta, id: "1", economico: "E-1", numeroSerie: "VIN-1", placas2025: "ABC123", placasVigentesAnio: year - 1 },
    { ...unidadCompleta, id: "2", economico: "E-2", numeroSerie: "VIN-2", placas2025: "ABC123", placasVigentesAnio: year - 1 },
    { ...unidadCompleta, id: "3", economico: "E-3", numeroSerie: "VIN-3", placas2025: "ABC123", placasVigentesAnio: year - 1 },
  ], []);
  const current = detectarAnomaliasFlota([
    { ...unidadCompleta, id: "1", economico: "E-1", numeroSerie: "VIN-1", placas2025: "ABC123", placasVigentesAnio: year },
    { ...unidadCompleta, id: "2", economico: "E-2", numeroSerie: "VIN-2", placas2025: "ABC123", placasVigentesAnio: year },
    { ...unidadCompleta, id: "3", economico: "E-3", numeroSerie: "VIN-3", placas2025: "ABC123", placasVigentesAnio: year },
  ], []);

  assert.equal(
    stale.filter((finding) => finding.tipo === "dato-incompleto" && finding.campoUnidad === "placas2025").length,
    3,
  );
  assert.ok(!stale.some((finding) => finding.campoUnidad === "placas2025" && finding.camposDuplicados));
  assert.ok(current.some((finding) => finding.campoUnidad === "placas2025" && finding.camposDuplicados));
});

test("requires current-year metadata while allowing arbitrary text in the plate field", () => {
  const fields = detectarAnomaliasFlota([
    { ...unidadCompleta, id: "1", placas2025: "VENCE 2032", placasVigentesAnio: null },
    { ...unidadCompleta, id: "2", placas2025: "CUALQUIER NOTA DE VENCIMIENTO", placasVigentesAnio: new Date().getFullYear() - 1 },
    { ...unidadCompleta, id: "3", placas2025: "VENCE EN 2029", placasVigentesAnio: new Date().getFullYear() },
  ], []).filter((finding) => finding.tipo === "dato-incompleto" && finding.campoUnidad === "placas2025");

  assert.deepEqual(fields.map((finding) => finding.unidadIds[0]), ["1", "2"]);
  assert.match(fields[0].titulo, new RegExp(String(new Date().getFullYear())));
});

test("creates one actionable case per missing economic number or plate", () => {
  const incompleta = detectarAnomaliasFlota([
    { ...unidadCompleta, id: "9", economico: "", placas: "BLANCA", numeroSerie: "VIN-9" },
  ], []).filter((anomalia) => anomalia.tipo === "dato-incompleto");

  assert.equal(incompleta.length, 2);
  assert.deepEqual(incompleta.map((anomalia) => anomalia.camposIncompletos[0]), ["economico", "placas"]);
  assert.ok(incompleta.every((anomalia) => anomalia.unidadIds[0] === "9" && anomalia.departamentoIds[0] === 4));
  assert.ok(incompleta.every((anomalia) => anomalia.targetId === "9" && anomalia.ruta === "/flota"));
});

test("treats no-plate markers as missing and keeps duplicate and missing findings distinct", () => {
  const findings = detectarAnomaliasFlota([
    { ...unidadCompleta, id: "1", economico: "E-1", numeroSerie: "VIN-1", placas: "S/P", placas2025: "VIG-100" },
    { ...unidadCompleta, id: "2", economico: "E-2", numeroSerie: "VIN-2", placas: "S/P", placas2025: "vig100" },
    { ...unidadCompleta, id: "3", economico: "E-3", numeroSerie: "VIN-3", placas: "OTRA-PLACA", placas2025: "VIG100" },
  ], []);
  const missing = findings.filter((finding) => finding.tipo === "dato-incompleto");
  const duplicates = findings.filter((finding) => finding.camposDuplicados);

  assert.deepEqual(missing.map((finding) => finding.campoUnidad), ["placas", "placas"]);
  assert.deepEqual(
    duplicates.map((finding) => finding.campoUnidad).sort(),
    ["placas2025"],
  );
});

test("detects current-year plate series inside long free-form text without treating expiry years as plates", () => {
  const year = new Date().getFullYear();
  const findings = detectarAnomaliasFlota([
    { ...unidadCompleta, id: "1", economico: "E-1", numeroSerie: "VIN-1", placas2025: "VENCE EN 2029 - HDC.824.H; observación administrativa", placasVigentesAnio: year },
    { ...unidadCompleta, id: "2", economico: "E-2", numeroSerie: "VIN-2", placas2025: "HDC 824 H", placasVigentesAnio: year },
    { ...unidadCompleta, id: "3", economico: "E-3", numeroSerie: "VIN-3", placas2025: "HDC/824/H", placasVigentesAnio: year },
  ], []);
  const duplicate = findings.find((finding) => finding.tipo === "placas-vigentes-duplicadas");

  assert.ok("VENCE EN 2029 - HDC.824.H; observación administrativa".length > 20);
  assert.equal(duplicate.valorDuplicado, "HDC824H");
  assert.deepEqual(duplicate.unidadIds, ["1", "2", "3"]);
});

test("detects every required fleet field while leaving the optional second custodian alone", () => {
  const fields = [
    "estado", "kilometraje", "tipoCombustible", "departamentoId", "economico",
    "conductorAsignado", "marca", "submarca", "tipo", "modelo", "placas",
    "placas2025", "numeroSerie", "rpeResguardante", "centroGestor", "centroCostos",
    "ubicacionTecnica", "arrendadora",
  ];
  const incompleta = { ...unidadCompleta, id: "incompleta", resguardante2: "" };
  fields.forEach((field) => {
    incompleta[field] = field === "kilometraje" ? 0 : "";
  });

  const findings = detectarAnomaliasFlota([incompleta], [])
    .filter((finding) => finding.tipo === "dato-incompleto");

  assert.deepEqual(new Set(findings.map((finding) => finding.campoUnidad)), new Set(fields));
  assert.equal(findings.length, fields.length);
  assert.ok(findings.every((finding) => finding.unidadIds[0] === "incompleta"));
  assert.ok(!findings.some((finding) => finding.campoUnidad === "resguardante2"));
});

test("requires a second custodian only when the explicit requirement flag is enabled", () => {
  const unit = { ...unidadCompleta, id: "custodian-2", resguardante2: "" };
  const optional = detectarAnomaliasFlota([{ ...unit, requiereResguardante2: false }], [])
    .filter((finding) => finding.campoUnidad === "resguardante2");
  const required = detectarAnomaliasFlota([{ ...unit, requiereResguardante2: true }], [])
    .filter((finding) => finding.campoUnidad === "resguardante2");
  const completed = detectarAnomaliasFlota([{
    ...unit,
    requiereResguardante2: true,
    resguardante2: "Segundo resguardante",
  }], []).filter((finding) => finding.campoUnidad === "resguardante2");

  assert.deepEqual(optional, []);
  assert.equal(required.length, 1);
  assert.deepEqual(required[0].camposIncompletos, ["resguardante2"]);
  assert.deepEqual(completed, []);
});

test("clears missing-field findings as soon as all required values are corrected", () => {
  const findings = detectarAnomaliasFlota([{ ...unidadCompleta, resguardante2: "" }], [])
    .filter((finding) => finding.tipo === "dato-incompleto");

  assert.deepEqual(findings, []);
});

test("uses stable rule identities and ignores inactive units", () => {
  const activos = [
    { id: "1", economico: "E-01", placas: "A-1", numeroSerie: "VIN-1" },
    { id: "2", economico: "E-01", placas: "A-2", numeroSerie: "VIN-2" },
    { id: "3", economico: "E-01", placas: "A-3", numeroSerie: "VIN-3", activo: false },
  ];
  const first = detectarAnomaliasFlota(activos, []).find((item) => item.tipo === "economico-duplicado");
  const second = detectarAnomaliasFlota(activos, []).find((item) => item.tipo === "economico-duplicado");

  assert.equal(first.id, second.id);
  assert.equal(first.versionRegla, 8);
  assert.deepEqual(first.unidadIds, ["1", "2"]);
});

test("turns Edenred summary evidence into a persisted-rule finding", () => {
  const [finding] = detectarAnomaliasFlota(
    [{ id: "1", economico: "E-1", placas: "ABC", departamentoId: 3 }],
    [{
      id: "carga-1",
      resumenAplicado: [{ unidadId: "1", mes: "2027-01", anomalias: ["Capacidad: se cargaron 70 L y el tanque admite 60 L"] }],
    }],
  ).filter((item) => item.tipo === "edenred-detectada");

  assert.equal(finding.regla, "edenred-resumen-anomalo");
  assert.deepEqual(finding.departamentoIds, [3]);
  assert.match(finding.detalle, /Capacidad/);
});

test("does not promote ordinary fuel-efficiency deviation to an anomaly", () => {
  const findings = detectarAnomaliasFlota(
    [{ id: "1", economico: "E-1", placas: "ABC", departamentoId: 3 }],
    [{
      id: "carga-1",
      resumenAplicado: [{
        unidadId: "1",
        mes: "2027-01",
        anomalias: [
          "Rendimiento: 3.79 km/L frente a 7.00 km/L esperados (46% de diferencia)",
          "Capacidad: se cargaron 70 L y el tanque admite 60 L",
          "Capacidad: se cargaron 63 L y el tanque admite 60 L",
          "Odómetro: la lectura reportada es 1,200,000 km; revisar posible captura atípica",
        ],
      }],
    }],
  ).filter((item) => item.categoria === "edenred");

  assert.equal(findings.length, 2);
  assert.ok(findings.every((item) => !item.detalle.includes("Rendimiento:")));
  assert.ok(findings.some((item) => item.detalle.includes("Capacidad:")));
  assert.ok(findings.some((item) => item.detalle.includes("Odómetro:")));
});

test("flags implausible fuel transaction values with a stable transaction reference", () => {
  const [finding] = detectarAnomaliasFlota(
    [{ id: "1", economico: "E-1", placas: "ABC", departamentoId: 3 }],
    [{
      id: "carga-1",
      transacciones: [{
        "Estado Transacción": "APROBADA",
        Placa: "ABC",
        "Fecha transacción": "2027-01-15",
        "Cantidad Mercancía": 0,
        "Importe Transacción": 1200,
        "Km Transacción": 100,
      }],
    }],
  ).filter((item) => item.tipo === "transaccion-atipica");

  assert.equal(finding.regla, "edenred-cifra-atipica");
  assert.match(finding.detalle, /litros 0/);
  assert.deepEqual(finding.unidadIds, ["1"]);
});

test("matches Edenred by economic number before a plate shared by several units", () => {
  const finding = detectarAnomaliasFlota([
    { id: "1", economico: "E-1", placas: "SHARED-PLATE", departamentoId: 3 },
    { id: "2", economico: "E-2", placas: "SHARED-PLATE", departamentoId: 4 },
  ], [{
    id: "carga-shared-plate",
    transacciones: [{
      "Estado Transacción": "APROBADA",
      "Id Vehículo": "E-2",
      Placa: "SHARED-PLATE",
      "Fecha transacción": "2027-01-15",
      "Cantidad Mercancía": 0,
      "Importe Transacción": 1200,
      "Km Transacción": 100,
    }],
  }]).find((item) => item.tipo === "transaccion-atipica");

  assert.deepEqual(finding.unidadIds, ["2"]);
});

test("does not arbitrarily associate an Edenred transaction to a shared plate", () => {
  const finding = detectarAnomaliasFlota([
    { id: "1", economico: "E-1", placas: "SHARED-PLATE", departamentoId: 3 },
    { id: "2", economico: "E-2", placas: "SHARED-PLATE", departamentoId: 4 },
  ], [{
    id: "carga-ambiguous-plate",
    transacciones: [{
      "Estado Transacción": "APROBADA",
      Placa: "SHARED-PLATE",
      "Fecha transacción": "2027-01-15",
      "Cantidad Mercancía": 0,
      "Importe Transacción": 1200,
      "Km Transacción": 100,
    }],
  }]).find((item) => item.tipo === "transaccion-atipica");

  assert.deepEqual(finding.unidadIds, []);
});

test("ignores rejected transactions even when their exported values are extreme", () => {
  const findings = detectarAnomaliasFlota(
    [{ id: "1", economico: "E-1", placas: "ABC", departamentoId: 3 }],
    [{
      id: "carga-1",
      transacciones: [{
        "Estado Transacción": "RECHAZADA",
        Placa: "ABC",
        "Cantidad Mercancía": 10000,
        "Importe Transacción": 0,
        "Km Transacción": 4000030,
      }],
    }],
  ).filter((item) => item.tipo === "transaccion-atipica");

  assert.equal(findings.length, 0);
});

test("does not duplicate an odometer finding already represented by the Edenred summary", () => {
  const findings = detectarAnomaliasFlota(
    [{ id: "1", economico: "E-1", placas: "ABC", departamentoId: 3 }],
    [{
      id: "carga-1",
      resumenAplicado: [{
        unidadId: "1",
        mes: "2027-01",
        anomalias: ["Odómetro: la lectura reportada es 1,200,000 km; revisar posible captura atípica"],
      }],
      transacciones: [{
        "Estado Transacción": "APROBADA",
        Placa: "ABC",
        "Fecha transacción": "15/01/2027",
        "Cantidad Mercancía": 20,
        "Importe Transacción": 1000,
        "Km Transacción": 1200000,
      }],
    }],
  );

  assert.equal(findings.filter((item) => item.tipo === "transaccion-atipica").length, 0);
  assert.equal(findings.filter((item) => item.tipo === "edenred-detectada").length, 1);
});
