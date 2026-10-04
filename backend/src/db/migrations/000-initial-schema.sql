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
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_usuarios_departamento FOREIGN KEY (departamento_id) REFERENCES departamentos(id)
);

CREATE TABLE IF NOT EXISTS unidades (
  id INT AUTO_INCREMENT PRIMARY KEY,
  economico VARCHAR(30) NULL UNIQUE,
  placas VARCHAR(20) NULL,
  placas_2025 VARCHAR(20) NULL,
  marca VARCHAR(80) NULL,
  submarca VARCHAR(80) NULL,
  tipo VARCHAR(80) NULL,
  modelo VARCHAR(30) NULL,
  numero_serie VARCHAR(80) NOT NULL UNIQUE,
  departamento_id INT NULL,
  kilometraje DECIMAL(12,2) DEFAULT 0,
  tipo_combustible VARCHAR(30) NULL,
  estado VARCHAR(30) DEFAULT 'en-estacion',
  conductor_asignado VARCHAR(150) NULL,
  resguardante_2 VARCHAR(150) NULL,
  rpe_resguardante VARCHAR(80) NULL,
  centro_gestor VARCHAR(80) NULL,
  centro_costos VARCHAR(80) NULL,
  ubicacion_tecnica VARCHAR(180) NULL,
  arrendadora VARCHAR(120) NULL,
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
  eliminado TINYINT(1) NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
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

CREATE INDEX idx_usuarios_rol ON usuarios(rol);
CREATE INDEX idx_unidades_departamento ON unidades(departamento_id);
CREATE INDEX idx_tickets_unidad_fecha ON tickets_combustible(unidad_id, fecha_hora);
CREATE INDEX idx_reportes_departamento ON reportes(departamento_id);

CREATE TABLE IF NOT EXISTS recuperacion_password (
  id VARCHAR(64) PRIMARY KEY,
  usuario_id INT NOT NULL,
  otp_hash VARCHAR(255) NOT NULL,
  medio VARCHAR(20) NOT NULL,
  expira_at DATETIME NOT NULL,
  usado TINYINT(1) NOT NULL DEFAULT 0,
  token_hash VARCHAR(255) NULL,
  token_expira_at DATETIME NULL,
  created_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT fk_recuperacion_usuario FOREIGN KEY (usuario_id) REFERENCES usuarios(id) ON DELETE CASCADE
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
