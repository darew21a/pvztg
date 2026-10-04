UPDATE unidades
SET placas_vigentes_anio = YEAR(CURRENT_DATE)
WHERE placas_vigentes_anio IS NULL
  AND placas_2025 IS NOT NULL
  AND TRIM(placas_2025) <> '';
