const MESES_DEL_ANIO = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export function normalizarMesesEjercicio(mesesDelAnio, anio) {
  if (!Number.isInteger(anio)) throw new Error("El año del cierre fiscal no es válido.");
  if (!Array.isArray(mesesDelAnio)) throw new Error("No se recibió el desglose mensual del ejercicio fiscal.");

  const meses = MESES_DEL_ANIO.map((nombre, indice) => ({
    mes: `${anio}-${String(indice + 1).padStart(2, "0")}`,
    nombre,
    km: 0,
    litros: 0,
    importe: 0,
  }));

  mesesDelAnio.forEach((registro) => {
    const coincidencia = /^(\d{4})-(\d{2})$/.exec(registro?.mes ?? "");
    if (!coincidencia || Number(coincidencia[1]) !== anio) {
      throw new Error(`El mes "${registro?.mes ?? ""}" no pertenece al ejercicio ${anio}.`);
    }

    const indice = Number(coincidencia[2]) - 1;
    if (indice < 0 || indice >= MESES_DEL_ANIO.length) {
      throw new Error(`El mes "${registro.mes}" no es válido.`);
    }

    ["km", "litros", "importe"].forEach((campo) => {
      if (!Number.isFinite(registro[campo])) {
        throw new Error(`El valor de ${campo} para ${registro.mes} no es válido.`);
      }
      meses[indice][campo] += registro[campo];
    });
  });

  return meses;
}

export function calcularTotalesEjercicio(mesesDelAnio) {
  return mesesDelAnio.reduce(
    (acumulado, registro) => ({
      km: acumulado.km + registro.km,
      litros: acumulado.litros + registro.litros,
      importe: acumulado.importe + registro.importe,
    }),
    { km: 0, litros: 0, importe: 0 },
  );
}
