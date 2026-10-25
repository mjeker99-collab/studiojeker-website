import { test } from "node:test";
import assert from "node:assert/strict";
import { deployIdentity } from "../lib/deploy-identity";

test("deployIdentity exposes truncated commit and branch without secrets", () => {
  assert.deepEqual(
    deployIdentity({
      RENDER_GIT_COMMIT: "bf32f407859d1e9da35617b42f412a8481241d0b",
      RENDER_GIT_BRANCH: "feat/akquise-production-readiness",
      RENDER_SERVICE_NAME: "studiojeker-akquise",
      DATABASE_URL: "postgresql://should-not-leak",
    }),
    {
      service: "studiojeker-akquise",
      branch: "feat/akquise-production-readiness",
      commit: "bf32f407859d",
    },
  );
  assert.deepEqual(deployIdentity({}), {
    service: null,
    branch: null,
    commit: null,
  });
});
