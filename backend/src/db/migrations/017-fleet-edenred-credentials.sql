ALTER TABLE unidades
  ADD COLUMN cilindros VARCHAR(30) NULL AFTER submarca,
  ADD COLUMN tarjeta_edenred_cifrada TEXT NULL AFTER arrendadora,
  ADD COLUMN nip_edenred_cifrado TEXT NULL AFTER tarjeta_edenred_cifrada;
