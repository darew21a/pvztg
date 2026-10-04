CREATE TABLE IF NOT EXISTS unidad_documentos (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  unidad_id INT NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  nombre_archivo VARCHAR(255) NOT NULL,
  url_archivo TEXT NOT NULL,
  fecha_carga DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  creado_por INT NULL,
  CONSTRAINT fk_unidad_documentos_unidad FOREIGN KEY (unidad_id) REFERENCES unidades(id) ON DELETE CASCADE,
  CONSTRAINT fk_unidad_documentos_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_unidad_documentos_historial (unidad_id, tipo, fecha_carga)
);

CREATE INDEX idx_unidades_departamento_activo_id
  ON unidades (departamento_id, activo, id);

ALTER TABLE cargas_edenred
  ADD COLUMN IF NOT EXISTS aplicado_at DATETIME(6) NULL;

UPDATE cargas_edenred
SET aplicado_at = created_at
WHERE aplicado_at IS NULL;

ALTER TABLE cargas_edenred
  MODIFY COLUMN aplicado_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6);
