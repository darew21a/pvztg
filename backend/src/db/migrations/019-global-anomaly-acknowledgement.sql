ALTER TABLE anomaly_cases
  ADD COLUMN acknowledged_generation INT UNSIGNED NULL AFTER generation,
  ADD COLUMN acknowledged_at DATETIME NULL AFTER acknowledged_generation,
  ADD COLUMN acknowledged_by INT NULL AFTER acknowledged_at,
  ADD CONSTRAINT fk_anomaly_cases_acknowledged_by
    FOREIGN KEY (acknowledged_by) REFERENCES usuarios(id) ON DELETE SET NULL;
