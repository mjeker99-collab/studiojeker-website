import { test } from "node:test";
import assert from "node:assert/strict";
import { socialSetup } from "../lib/social/config";
import { studiojekerOrganizations, readLinkedIn } from "../lib/social/linkedin";

test("readiness exposes only presence, preserves provider separation, and disables sandbox", () => {
  const env = {
    NODE_ENV: "test" as const,
    APP_URL: "https://studio.example.org",
    META_CLIENT_ID: "meta-id",
    META_CLIENT_SECRET: "secret-never-return",
    SOCIAL_TOKEN_ENCRYPTION_KEY: "a".repeat(64),
  };
  const setup = socialSetup(env);
  assert.equal(setup.meta.configured, true);
  assert.equal(setup.linkedin.configured, false);
  assert.equal(
    setup.meta.redirectUri,
    "https://studio.example.org/api/social/meta/callback",
  );
  assert.equal(JSON.stringify(setup).includes(env.META_CLIENT_SECRET), false);
  assert.equal(
    JSON.stringify(setup).includes(env.SOCIAL_TOKEN_ENCRYPTION_KEY),
    false,
  );
  assert.equal(
    socialSetup({ ...env, SOCIAL_TOKEN_ENCRYPTION_KEY: "invalid" }).meta
      .configured,
    false,
  );
  assert.equal(
    socialSetup({ ...env, STUDIOONE_TEST_SANDBOX: "true" }).meta.configured,
    false,
  );
});

test("only approved organic-content roles for the exact Studiojeker page are offered", async () => {
  const lookups: string[] = [];
  const result = await studiojekerOrganizations(async (path) => {
    lookups.push(path);
    if (path.startsWith("/organizationAcls"))
      return {
        elements: [
          {
            state: "APPROVED",
            role: "ADMINISTRATOR",
            organization: "urn:li:organization:1",
          },
          {
            state: "APPROVED",
            role: "CONTENT_ADMINISTRATOR",
            organizationTarget: "urn:li:organization:2",
          },
          {
            state: "APPROVED",
            role: "ANALYST",
            organization: "urn:li:organization:3",
          },
          {
            state: "REQUESTED",
            role: "ADMINISTRATOR",
            organization: "urn:li:organization:4",
          },
          {
            state: "REVOKED",
            role: "ADMINISTRATOR",
            organization: "urn:li:organization:5",
          },
          {
            state: "APPROVED",
            role: "DIRECT_SPONSORED_CONTENT_POSTER",
            organization: "urn:li:organization:6",
          },
        ],
      };
    assert.equal(path, "/organizationsLookup?ids=List(1,2)");
    return {
      results: {
        "1": {
          id: 1,
          vanityName: "not-studiojeker",
          localizedName: "Studiojeker",
        },
        "2": {
          id: 2,
          vanityName: "studiojeker",
          localizedName: "Studiojeker GmbH",
        },
        "3": {
          id: 3,
          vanityName: "studiojeker",
          localizedName: "Must not be accepted",
        },
      },
    };
  });
  assert.deepEqual(result, [
    {
      accountId: "urn:li:organization:2",
      accountName: "Studiojeker GmbH",
      url: "https://www.linkedin.com/company/studiojeker/",
    },
  ]);
  assert.equal(lookups.length, 2);
});

test("pagination follows numeric offsets, never provider-supplied hosts", async () => {
  const result = await studiojekerOrganizations(async (path) => {
    if (path.endsWith("start=0"))
      return {
        elements: [],
        paging: {
          links: [{ rel: "next", href: "https://evil.example/steal-token" }],
        },
      };
    if (path.endsWith("start=100"))
      return {
        elements: [
          {
            state: "APPROVED",
            role: "ADMINISTRATOR",
            organization: "urn:li:organization:7",
          },
        ],
      };
    assert.equal(path, "/organizationsLookup?ids=List(7)");
    return {
      results: {
        "7": { id: 7, vanityName: "studiojeker", localizedName: "Studiojeker" },
      },
    };
  });
  assert.equal(result[0].accountId, "urn:li:organization:7");
  await assert.rejects(
    () => studiojekerOrganizations(async () => ({})),
    /gültige Seitenliste/,
  );
});

test("provider failures are actionable and never expose response bodies or tokens", async () => {
  for (const [status, expected] of [
    [401, /erneut verbinden/],
    [403, /r_organization_admin/],
    [429, /später/],
    [500, /App-Konfiguration/],
  ] as const) {
    await assert.rejects(
      () =>
        readLinkedIn(
          "/organizationAcls?q=roleAssignee",
          "synthetic-token",
          async (url, init) => {
            assert.equal(
              String(url),
              "https://api.linkedin.com/rest/organizationAcls?q=roleAssignee",
            );
            assert.equal(init?.redirect, "error");
            assert.equal(
              new Headers(init?.headers).get("Authorization"),
              "Bearer synthetic-token",
            );
            return new Response("secret provider response", { status });
          },
        ),
      expected,
    );
  }
});
