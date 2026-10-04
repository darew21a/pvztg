CREATE INDEX idx_unidades_departamento_activo
  ON unidades (departamento_id, activo);

CREATE INDEX idx_reportes_departamento_created
  ON reportes (departamento_id, created_at);

CREATE INDEX idx_tickets_unidad_fecha_created
  ON tickets_combustible (unidad_id, fecha_hora, created_at);

CREATE INDEX idx_usuarios_rol_activo
  ON usuarios (rol, activo);

CREATE INDEX idx_recuperacion_usuario_expira
  ON recuperacion_password (usuario_id, expira_at);

CREATE INDEX idx_anomalias_usuario_visto
  ON anomalias_estados (usuario_id, visto);

CREATE INDEX idx_notificaciones_usuario_visto
  ON notificaciones_estados (usuario_id, visto);
