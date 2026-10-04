import crypto from "node:crypto";

const ENCRYPTION_KEY_ENV = "FLEET_CREDENTIALS_KEY";

function getEncryptionKey() {
  const configuredKey = String(process.env[ENCRYPTION_KEY_ENV] ?? "").trim();
  if (!/^[a-f0-9]{64}$/i.test(configuredKey)) {
    throw new Error(`${ENCRYPTION_KEY_ENV} debe configurarse como 64 caracteres hexadecimales (32 bytes).`);
  }
  return Buffer.from(configuredKey, "hex");
}

export function encryptFleetCredential(value) {
  if (value == null || String(value).trim() === "") return null;
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  const ciphertext = Buffer.concat([
    cipher.update(String(value), "utf8"),
    cipher.final(),
  ]);
  return [
    "v1",
    iv.toString("base64"),
    cipher.getAuthTag().toString("base64"),
    ciphertext.toString("base64"),
  ].join(":");
}

export function decryptFleetCredential(value) {
  if (value == null || value === "") return null;
  const [version, encodedIv, encodedTag, encodedCiphertext, ...extra] = String(value).split(":");
  if (version !== "v1" || !encodedIv || !encodedTag || !encodedCiphertext || extra.length) {
    throw new Error("El valor cifrado de credenciales Edenred tiene un formato no válido.");
  }
  const decipher = crypto.createDecipheriv("aes-256-gcm", getEncryptionKey(), Buffer.from(encodedIv, "base64"));
  decipher.setAuthTag(Buffer.from(encodedTag, "base64"));
  return Buffer.concat([
    decipher.update(Buffer.from(encodedCiphertext, "base64")),
    decipher.final(),
  ]).toString("utf8");
}
