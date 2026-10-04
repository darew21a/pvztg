ALTER TABLE cargas_relacion_unidades
  ADD COLUMN IF NOT EXISTS contenido_hash CHAR(64) NULL;
