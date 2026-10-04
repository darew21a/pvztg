ALTER TABLE usuarios
  ADD COLUMN contactos_adicionales_json JSON NULL AFTER session_version;
