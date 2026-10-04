CREATE TABLE IF NOT EXISTS notificaciones (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  usuario_id INT NOT NULL,
  tipo VARCHAR(40) NOT NULL,
  titulo VARCHAR(180) NOT NULL,
  detalle TEXT NOT NULL,
  entidad_tipo VARCHAR(40) NULL,
  entidad_id VARCHAR(120) NULL,
  creado_por INT NULL,
  leida TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_notificaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_notificaciones_creador FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);

CREATE INDEX idx_notificaciones_usuario_fecha
  ON notificaciones (usuario_id, created_at);

CREATE INDEX idx_notificaciones_usuario_leida
  ON notificaciones (usuario_id, leida, created_at);
