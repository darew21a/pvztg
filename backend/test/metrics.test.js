import assert from "node:assert/strict";
import { test } from "node:test";
import { getMetrics, recordRequest, resetMetrics } from "../src/utils/metrics.js";

test("las métricas agregan solicitudes, estados y percentiles", () => {
  resetMetrics();
  recordRequest({ path: "/api/test", status: 200, durationMs: 10 });
  recordRequest({ path: "/api/test", status: 500, durationMs: 30 });

  const metrics = getMetrics();
  assert.equal(metrics.totalRequests, 2);
  assert.equal(metrics.totalErrors, 1);
  assert.equal(metrics.byPath["/api/test"].statuses["200"], 1);
  assert.equal(metrics.byPath["/api/test"].statuses["500"], 1);
  assert.equal(metrics.byPath["/api/test"].latencyMs.p50, 10);
  assert.equal(metrics.byPath["/api/test"].latencyMs.p95, 30);
});
