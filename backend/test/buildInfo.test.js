import assert from "node:assert/strict";
import { test } from "node:test";
import { getBuildInfo } from "../src/utils/buildInfo.js";

test("la información de build no expone secretos", () => {
  process.env.APP_VERSION = "test-build";
  const info = getBuildInfo();
  assert.equal(info.service, "pvztg-backend");
  assert.equal(info.version, "test-build");
  assert.equal("JWT_SECRET" in info, false);
  assert.equal("DB_PASSWORD" in info, false);
});
