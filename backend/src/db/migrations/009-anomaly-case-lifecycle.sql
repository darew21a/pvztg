ALTER TABLE notificaciones
  ADD COLUMN dedupe_key VARCHAR(255) NULL,
  ADD COLUMN action_url VARCHAR(255) NULL;

CREATE UNIQUE INDEX uq_notificaciones_usuario_dedupe
  ON notificaciones (usuario_id, dedupe_key);

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
  assigned_to INT NULL,
  resolution_note TEXT NULL,
  first_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_seen_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  resolved_at DATETIME NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  CONSTRAINT fk_anomaly_cases_assignee FOREIGN KEY (assigned_to) REFERENCES usuarios(id) ON DELETE SET NULL,
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
