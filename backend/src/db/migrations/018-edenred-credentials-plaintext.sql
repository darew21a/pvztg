ALTER TABLE unidades
  ADD COLUMN tarjeta_edenred TEXT NULL AFTER nip_edenred_cifrado,
  ADD COLUMN nip_edenred TEXT NULL AFTER tarjeta_edenred;
