import assert from "node:assert/strict";
import { test } from "node:test";
import { isDepartmentAllowed, parsePositiveId } from "../src/policies/accessPolicy.js";

test("un jefe sólo puede operar dentro de su departamento", () => {
  const auth = { role: "jefe-departamento", departmentId: 4 };

  assert.equal(isDepartmentAllowed(auth, 4), true);
  assert.equal(isDepartmentAllowed(auth, "4"), true);
  assert.equal(isDepartmentAllowed(auth, 5), false);
  assert.equal(isDepartmentAllowed({ role: "jefe-departamento" }, 4), false);
});

test("roles administrativos no quedan limitados por departamento", () => {
  assert.equal(isDepartmentAllowed({ role: "stt", departmentId: 1 }, 99), true);
  assert.equal(isDepartmentAllowed({ role: "apv", departmentId: 1 }, 99), true);
});

test("parsePositiveId rechaza identificadores inválidos", () => {
  assert.equal(parsePositiveId("12"), 12);
  assert.equal(parsePositiveId(12), 12);
  assert.equal(parsePositiveId("0"), null);
  assert.equal(parsePositiveId("-1"), null);
  assert.equal(parsePositiveId("abc"), null);
  assert.equal(parsePositiveId("1.5"), null);
});
