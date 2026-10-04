CREATE DATABASE IF NOT EXISTS pvztg CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE pvztg;

CREATE TABLE IF NOT EXISTS schema_migrations (
  version VARCHAR(120) PRIMARY KEY,
  applied_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS departamentos (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL UNIQUE,
  icono VARCHAR(50) NULL,
  orden INT NOT NULL DEFAULT 999,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS usuarios (
  id INT AUTO_INCREMENT PRIMARY KEY,
  nombre VARCHAR(150) NOT NULL,
  usuario VARCHAR(80) NOT NULL UNIQUE,
  email VARCHAR(150) NULL,
  password_hash VARCHAR(255) NOT NULL,
  rol ENUM('stt', 'apv', 'jefe-departamento') NOT NULL,
  departamento_id INT NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  celular VARCHAR(30) NULL,
  debe_cambiar_password TINYINT(1) NOT NULL DEFAULT 0,
  password_changed_at DATETIME NULL,
  session_version INT NOT NULL DEFAULT 0,
  contactos_adicionales_json JSON NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_departamento FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
);

CREATE TABLE IF NOT EXISTS unidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  economico VARCHAR(30) NULL,
  placas VARCHAR(20) NULL,
  placas_2025 TEXT NULL,
  placas_vigentes_anio SMALLINT UNSIGNED NULL,
  marca VARCHAR(80) NULL,
  submarca VARCHAR(80) NULL,
  cilindros VARCHAR(30) NULL,
  tipo VARCHAR(80) NULL,
  modelo VARCHAR(30) NULL,
  numero_serie VARCHAR(80) NOT NULL,
  departamento_id INT NULL,
  kilometraje DECIMAL(12,2) DEFAULT 0,
  tipo_combustible VARCHAR(30) NULL,
  estado VARCHAR(30) DEFAULT 'en-estacion',
  conductor_asignado VARCHAR(150) NULL,
  resguardante_2 VARCHAR(150) NULL,
  requiere_resguardante_2 TINYINT(1) NOT NULL DEFAULT 0,
  rpe_resguardante VARCHAR(80) NULL,
  centro_gestor VARCHAR(80) NULL,
  centro_costos VARCHAR(80) NULL,
  ubicacion_tecnica VARCHAR(180) NULL,
  arrendadora VARCHAR(120) NULL,
  tarjeta_edenred_cifrada TEXT NULL,
  nip_edenred_cifrado TEXT NULL,
  tarjeta_edenred TEXT NULL,
  nip_edenred TEXT NULL,
  imagen_url TEXT NULL,
  historial_json JSON NULL,
  activo TINYINT(1) NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_unidades_departamento FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
);

CREATE TABLE IF NOT EXISTS cargas_edenred (
  id VARCHAR(64) PRIMARY KEY,
  periodo_json JSON NOT NULL,
  transacciones_json JSON NOT NULL,
  resumen_json JSON NOT NULL,
  archivo_hash CHAR(64) NULL UNIQUE,
  contenido_hash CHAR(64) NULL UNIQUE,
  transacciones_hashes_json JSON NULL,
  eliminado TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS cargas_relacion_unidades (
  archivo_hash CHAR(64) PRIMARY KEY,
  contenido_hash CHAR(64) NULL,
  nombre_archivo VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS tickets_combustible (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unidad_id INT NOT NULL,
  fecha_hora DATETIME NOT NULL,
  litros DECIMAL(10,2) NOT NULL,
  importe DECIMAL(12,2) NOT NULL,
  url_ticket_bomba TEXT NOT NULL,
  url_ticket_edenred TEXT NULL,
  url_pdf_fusionado TEXT NULL,
  subido_por INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_tickets_unidad FOREIGN KEY (unidad_id) REFERENCES unidades(id),
  CONSTRAINT fk_tickets_usuario FOREIGN KEY (subido_por) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS polizas_seguro (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unidad_id INT NOT NULL,
  anio_vigencia INT NOT NULL,
  url_archivo TEXT NOT NULL,
  fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_poliza_unidad_anio (unidad_id, anio_vigencia),
  CONSTRAINT fk_poliza_unidad FOREIGN KEY (unidad_id) REFERENCES unidades(id)
);

CREATE TABLE IF NOT EXISTS tarjetas_circulacion (
  id INT AUTO_INCREMENT PRIMARY KEY,
  unidad_id INT NOT NULL,
  anio_vigencia INT NOT NULL,
  url_archivo TEXT NOT NULL,
  fecha_carga TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_tarjeta_unidad_anio (unidad_id, anio_vigencia),
  CONSTRAINT fk_tarjeta_unidad FOREIGN KEY (unidad_id) REFERENCES unidades(id)
);

CREATE TABLE IF NOT EXISTS reportes (
  id INT AUTO_INCREMENT PRIMARY KEY,
  folio VARCHAR(80) NOT NULL UNIQUE,
  titulo VARCHAR(200) NOT NULL,
  descripcion TEXT NULL,
  estado VARCHAR(50) NOT NULL DEFAULT 'abierto',
  tipo_reporte VARCHAR(50) NULL,
  autor_nombre VARCHAR(150) NULL,
  autor_departamento VARCHAR(150) NULL,
  gravedad VARCHAR(30) NULL,
  detalle_siniestro VARCHAR(150) NULL,
  involucrados TEXT NULL,
  fecha_hechos DATE NULL,
  lugar_hechos VARCHAR(250) NULL,
  horario_hechos VARCHAR(100) NULL,
  pdf_url TEXT NULL,
  departamento_id INT NULL,
  creado_por INT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_reportes_departamento FOREIGN KEY (departamento_id) REFERENCES departamentos(id),
  CONSTRAINT fk_reportes_usuario FOREIGN KEY (creado_por) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS reporte_unidades (
  reporte_id INT NOT NULL,
  unidad_id INT NOT NULL,
  PRIMARY KEY (reporte_id, unidad_id),
  CONSTRAINT fk_reporte_unidad_reporte FOREIGN KEY (reporte_id) REFERENCES reportes(id) ON DELETE CASCADE,
  CONSTRAINT fk_reporte_unidad_unidad FOREIGN KEY (unidad_id) REFERENCES unidades(id)
);

CREATE TABLE IF NOT EXISTS reporte_seguimiento (
  id INT AUTO_INCREMENT PRIMARY KEY,
  reporte_id INT NOT NULL,
  usuario_id INT NOT NULL,
  mensaje TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_seguimiento_reporte FOREIGN KEY (reporte_id) REFERENCES reportes(id) ON DELETE CASCADE,
  CONSTRAINT fk_seguimiento_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id)
);

CREATE TABLE IF NOT EXISTS anomalias_estados (
  usuario_id INT NOT NULL,
  anomalia_id VARCHAR(255) NOT NULL,
  estado VARCHAR(20) NOT NULL DEFAULT 'abierta',
  actualizado_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  visto TINYINT(1) NOT NULL DEFAULT 0,
  PRIMARY KEY (usuario_id, anomalia_id),
  CONSTRAINT fk_anomalia_estado_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS notificaciones_estados (
  usuario_id INT NOT NULL,
  notificacion_id VARCHAR(255) NOT NULL,
  visto TINYINT(1) NOT NULL DEFAULT 0,
  actualizado_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (usuario_id, notificacion_id),
  CONSTRAINT fk_notificacion_estado_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
);

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
  dedupe_key VARCHAR(255) NULL,
  action_url VARCHAR(255) NULL,
  CONSTRAINT fk_notificaciones_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE,
  CONSTRAINT fk_notificaciones_creador FOREIGN KEY (creado_por) REFERENCES usuarios(id) ON DELETE SET NULL
);
CREATE INDEX idx_notificaciones_usuario_fecha ON notificaciones (usuario_id, created_at);
CREATE INDEX idx_notificaciones_usuario_leida ON notificaciones (usuario_id, leida, created_at);
CREATE UNIQUE INDEX uq_notificaciones_usuario_dedupe ON notificaciones(usuario_id, dedupe_key);

CREATE TABLE IF NOT EXISTS anomaly_cases (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  case_key CHAR(64) NOT NULL UNIQUE,
  rule_key VARCHAR(80) NOT NULL,
  rule_version SMALLINT UNSIGNED NOT NULL,
  type VARCHAR(80) NOT NULL,
  category VARCHAR(40) NOT NULL,
  severity VARCHAR(20) NOT NULL,
  title VARCHAR(180) NOT NULL,
  detail TEXT NOT NULL,
  evidence_json JSON NOT NULL,
  entity_type VARCHAR(40) NULL,
  entity_id VARCHAR(120) NULL,
  department_ids_json JSON NOT NULL,
  action_url VARCHAR(255) NOT NULL,
  target_id VARCHAR(120) NULL,
  present TINYINT(1) NOT NULL DEFAULT 1,
  status VARCHAR(24) NOT NULL DEFAULT 'nueva',
  generation INT UNSIGNED NOT NULL DEFAULT 1,
  acknowledged_generation INT UNSIGNED NULL,
  acknowledged_at DATETIME NULL,
  acknowledged_by INT NULL,
  assigned_to INT NULL,
  resolution_note TEXT NULL,
  first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_anomaly_cases_assignee FOREIGN KEY (assigned_to) REFERENCES usuarios(id) ON DELETE SET NULL,
  CONSTRAINT fk_anomaly_cases_acknowledged_by FOREIGN KEY (acknowledged_by) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_anomaly_cases_active_status (present, status, severity),
  INDEX idx_anomaly_cases_rule (rule_key, rule_version),
  INDEX idx_anomaly_cases_entity (entity_type, entity_id)
);

CREATE TABLE IF NOT EXISTS anomaly_case_events (
  id BIGINT AUTO_INCREMENT PRIMARY KEY,
  case_id BIGINT NOT NULL,
  actor_id INT NULL,
  event_type VARCHAR(40) NOT NULL,
  previous_status VARCHAR(24) NULL,
  next_status VARCHAR(24) NULL,
  note TEXT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_anomaly_events_case FOREIGN KEY (case_id) REFERENCES anomaly_cases(id) ON DELETE CASCADE,
  CONSTRAINT fk_anomaly_events_actor FOREIGN KEY (actor_id) REFERENCES usuarios(id) ON DELETE SET NULL,
  INDEX idx_anomaly_events_case_date (case_id, created_at)
);

CREATE TABLE IF NOT EXISTS anomaly_reconciliation (
  id TINYINT UNSIGNED PRIMARY KEY,
  initialized TINYINT(1) NOT NULL DEFAULT 0,
  last_run_at DATETIME NULL
);
INSERT INTO anomaly_reconciliation (id, initialized)
VALUES (1, 0)
ON DUPLICATE KEY UPDATE id = VALUES(id);

CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_unidades_departamento ON unidades(departamento_id);
CREATE INDEX idx_unidades_departamento_activo ON unidades(departamento_id, activo);
CREATE INDEX idx_tickets_unidad_fecha ON tickets_combustible(unidad_id, fecha_hora);
CREATE INDEX idx_tickets_unidad_fecha_created ON tickets_combustible(unidad_id, fecha_hora, created_at);
CREATE INDEX idx_reportes_departamento ON reportes(departamento_id);
CREATE INDEX idx_reportes_departamento_created ON reportes(departamento_id, created_at);
CREATE INDEX idx_usuarios_rol_activo ON usuarios(rol, activo);

CREATE INDEX idx_anomalias_usuario_visto ON anomalias_estados(usuario_id, visto);
CREATE INDEX idx_notificaciones_usuario_visto ON notificaciones_estados(usuario_id, visto);
