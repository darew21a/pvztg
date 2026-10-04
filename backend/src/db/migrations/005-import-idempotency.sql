ALTER TABLE cargas_edenred
  ADD COLUMN IF NOT EXISTS archivo_hash CHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS contenido_hash CHAR(64) NULL,
  ADD COLUMN IF NOT EXISTS transacciones_hashes_json JSON NULL;

CREATE UNIQUE INDEX uq_cargas_edenred_archivo_hash
  ON cargas_edenred (archivo_hash);

CREATE UNIQUE INDEX uq_cargas_edenred_contenido_hash
  ON cargas_edenred (contenido_hash);

CREATE TABLE IF NOT EXISTS cargas_relacion_unidades (
  archivo_hash CHAR(64) PRIMARY KEY,
  contenido_hash CHAR(64) NULL,
  nombre_archivo VARCHAR(255) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE cargas_relacion_unidades
  ADD COLUMN IF NOT EXISTS contenido_hash CHAR(64) NULL;

CREATE UNIQUE INDEX uq_cargas_relacion_contenido_hash
  ON cargas_relacion_unidades (contenido_hash);
