import assert from "node:assert/strict";
import { test } from "node:test";
import { getStoredFileUrl } from "../src/utils/storedFileUrl.js";

test("los comprobantes sólo aceptan rutas de archivos generadas por el servidor", () => {
  assert.equal(
    getStoredFileUrl(null, "/api/uploads/11111111-1111-4111-8111-111111111111.pdf"),
    "/api/uploads/11111111-1111-4111-8111-111111111111.pdf",
  );
  assert.equal(getStoredFileUrl(null, "javascript:alert(document.cookie)"), undefined);
  assert.equal(getStoredFileUrl(null, "data:text/html,<script>alert(1)</script>"), undefined);
  assert.equal(getStoredFileUrl(null, "https://example.test/fixture.pdf"), undefined);
});

test("un archivo subido por el servidor tiene prioridad sobre valores del cliente", () => {
  assert.equal(
    getStoredFileUrl("/api/uploads/22222222-2222-4222-8222-222222222222.png", "javascript:alert(1)"),
    "/api/uploads/22222222-2222-4222-8222-222222222222.png",
  );
});
