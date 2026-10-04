import assert from "node:assert/strict";
import { test } from "node:test";
import { decryptFleetCredential, encryptFleetCredential } from "../src/utils/fleetCredentialsCrypto.js";

test("cifra y descifra las credenciales Edenred sin guardarlas como texto plano", () => {
  const previousKey = process.env.FLEET_CREDENTIALS_KEY;
  process.env.FLEET_CREDENTIALS_KEY = "ab".repeat(32);
  try {
    const card = encryptFleetCredential("6363180031864901");
    const nip = encryptFleetCredential("0477");

    assert.notEqual(card, "6363180031864901");
    assert.notEqual(nip, "0477");
    assert.equal(decryptFleetCredential(card), "6363180031864901");
    assert.equal(decryptFleetCredential(nip), "0477");
    assert.notEqual(card, encryptFleetCredential("6363180031864901"));
  } finally {
    if (previousKey === undefined) delete process.env.FLEET_CREDENTIALS_KEY;
    else process.env.FLEET_CREDENTIALS_KEY = previousKey;
  }
});

test("no permite cifrar credenciales si no hay una clave válida", () => {
  const previousKey = process.env.FLEET_CREDENTIALS_KEY;
  delete process.env.FLEET_CREDENTIALS_KEY;
  try {
    assert.throws(() => encryptFleetCredential("0477"), /FLEET_CREDENTIALS_KEY/);
    assert.equal(encryptFleetCredential(""), null);
  } finally {
    if (previousKey !== undefined) process.env.FLEET_CREDENTIALS_KEY = previousKey;
  }
});

test("rechaza credenciales cifradas alteradas", () => {
  const previousKey = process.env.FLEET_CREDENTIALS_KEY;
  process.env.FLEET_CREDENTIALS_KEY = "cd".repeat(32);
  try {
    const encrypted = encryptFleetCredential("0477");
    const [version, iv, tag, encodedCiphertext] = encrypted.split(":");
    const ciphertext = Buffer.from(encodedCiphertext, "base64");
    ciphertext[0] ^= 1;
    const tampered = [version, iv, tag, ciphertext.toString("base64")].join(":");
    assert.throws(() => decryptFleetCredential(tampered));
  } finally {
    if (previousKey === undefined) delete process.env.FLEET_CREDENTIALS_KEY;
    else process.env.FLEET_CREDENTIALS_KEY = previousKey;
  }
});
