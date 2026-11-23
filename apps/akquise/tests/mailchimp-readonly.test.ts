import { test } from "node:test";
import assert from "node:assert/strict";
import { personKey } from "../lib/policy";
import { MailchimpReadError, mailchimpGet } from "../lib/hub/mailchimp";
import {
  classifyMailchimpMembers,
  unambiguousPreparationEmail,
} from "../lib/hub/mailchimp-check";
import { diagnoseMailchimp, reviewMailchimpContacts } from "../lib/hub/mailchimp-readonly";
import {
  mailchimpCheckSummary,
  publicContactReport,
  type MailchimpContactReport,
} from "../lib/hub/mailchimp-report";

const KEY = "synthetic-readonly-us17";
const LEAK = "hidden-person@example.test";

function member(
  email: string,
  status: string,
  merge?: { FNAME?: string; LNAME?: string; COMPANY?: string },
) {
  return { email_address: email, status, merge_fields: merge ?? {} };
}

async function withMailchimp(
  run: () => Promise<void>,
  options: { key?: string; prefix?: string } = {},
) {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.MAILCHIMP_API_KEY;
  const originalPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
  if (options.key === undefined) delete process.env.MAILCHIMP_API_KEY;
  else process.env.MAILCHIMP_API_KEY = options.key;
  if (options.prefix === undefined) delete process.env.MAILCHIMP_SERVER_PREFIX;
  else process.env.MAILCHIMP_SERVER_PREFIX = options.prefix;
  try {
    await run();
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.MAILCHIMP_API_KEY;
    else process.env.MAILCHIMP_API_KEY = originalKey;
    if (originalPrefix === undefined) delete process.env.MAILCHIMP_SERVER_PREFIX;
    else process.env.MAILCHIMP_SERVER_PREFIX = originalPrefix;
  }
}

function recorded(handler: (url: URL, init: RequestInit | undefined, calls: URL[]) => Response | Promise<Response>) {
  const calls: { url: URL; init: RequestInit | undefined }[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(String(input));
    calls.push({ url, init });
    assert.equal(url.hostname, "us17.api.mailchimp.com");
    assert.equal(url.protocol, "https:");
    assert.equal(init?.method ?? "GET", "GET");
    assert.equal(init?.body, undefined);
    assert.equal(init?.redirect, "error");
    assert.equal(url.search.includes(KEY), false);
    const header = new Headers(init?.headers).get("authorization") || "";
    assert.equal(Buffer.from(header.replace(/^Basic /, ""), "base64").toString(), `studioone:${KEY}`);
    return handler(url, init, calls.map((call) => call.url));
  }) as typeof fetch;
  return calls;
}

function noSecrets(value: unknown) {
  const json = JSON.stringify(value);
  assert.equal(json.includes(KEY), false);
  assert.equal(json.includes(LEAK), false);
  assert.equal(json.includes("authorization"), false);
  assert.equal(json.includes("email_address"), false);
}

test("labelled preparation email is used once and never taken from the mail draft", () => {
  assert.equal(unambiguousPreparationEmail("E-Mail: Person@Firma.ch", ""), "person@firma.ch");
  assert.equal(unambiguousPreparationEmail("E-Mail: Person@Firma.ch", "stored@example.test"), "");
  assert.equal(
    unambiguousPreparationEmail("E-Mail: one@example.test\nDirekte E-Mail: two@example.test", ""),
    "",
  );
  assert.equal(
    unambiguousPreparationEmail("E-Mail-Entwurf:\nE-Mail: hidden@example.test\n", ""),
    "",
  );
});

test("cleaned and unsubscribed exclude a contact, including a subscribed duplicate", () => {
  const known = {
    emails: new Set(["known@example.test"]),
    people: new Set([personKey("Ada", "Lovelace", "Firma AG")]),
  };
  const counts = classifyMailchimpMembers(
    [
      member("a@example.test", "subscribed"),
      member("a@example.test", "cleaned"),
      member("b@example.test", "unsubscribed"),
      member("c@example.test", "cleaned"),
      member("d@example.test", "pending"),
      member("archived@example.test", "archived"),
      member("known@example.test", "subscribed"),
      member("other@firma.example", "subscribed", {
        FNAME: "Ada",
        LNAME: "Lovelace",
        COMPANY: "Firma AG",
      }),
      member("new@example.test", "subscribed"),
      member("twice@example.test", "subscribed"),
      member("twice@example.test", "subscribed"),
      { status: "subscribed" },
      member(LEAK, "transactional"),
    ],
    known,
  );
  assert.equal(counts.read, 13);
  assert.equal(counts.cleaned, 2);
  assert.equal(counts.unsubscribed, 1);
  assert.equal(counts.pending, 1);
  assert.equal(counts.excluded, 6);
  assert.equal(counts.duplicates, 2);
  assert.equal(counts.subscribed, 4);
  assert.equal(counts.existing, 2);
  assert.equal(counts.newContacts, 2);
  assert.equal(counts.errors, 1);
  assert.equal(JSON.stringify(counts).includes(LEAK), false);
});

test("diagnosis stays on us17, hides secrets and classifies auth, timeout and an empty audience", async () => {
  await withMailchimp(async () => {
    let calls = 0;
    globalThis.fetch = (async () => {
      calls += 1;
      throw new Error("Mailchimp must not be called");
    }) as typeof fetch;
    const missing = await diagnoseMailchimp();
    assert.deepEqual(missing, {
      configured: false,
      reachable: false,
      audienceCount: null,
      errorClass: "not_configured",
    });
    assert.equal(calls, 0);
  });

  await withMailchimp(
    async () => {
      let calls = 0;
      globalThis.fetch = (async () => {
        calls += 1;
        return Response.json({});
      }) as typeof fetch;
      const mismatch = await diagnoseMailchimp();
      assert.equal(mismatch.errorClass, "invalid_configuration");
      assert.equal(mismatch.configured, false);
      assert.equal(calls, 0);
    },
    { key: KEY, prefix: "us21" },
  );

  await withMailchimp(
    async () => {
      const calls = recorded((url) => {
        assert.equal(url.pathname, "/3.0/ping");
        return new Response(JSON.stringify({ detail: KEY, email: LEAK }), { status: 401 });
      });
      const auth = await diagnoseMailchimp();
      assert.equal(auth.errorClass, "auth");
      assert.equal(auth.reachable, false);
      assert.equal(auth.audienceCount, null);
      assert.equal(calls.length, 1);
      noSecrets(auth);
      assert.deepEqual(Object.keys(auth).sort(), [
        "audienceCount",
        "configured",
        "errorClass",
        "reachable",
      ]);
    },
    { key: KEY, prefix: "us17" },
  );

  await withMailchimp(
    async () => {
      let calls = 0;
      globalThis.fetch = (async () => {
        calls += 1;
        throw new DOMException("The operation was aborted", "TimeoutError");
      }) as typeof fetch;
      const timeout = await diagnoseMailchimp();
      assert.equal(timeout.errorClass, "timeout");
      assert.equal(calls, 1);
    },
    { key: KEY },
  );

  await withMailchimp(
    async () => {
      const calls = recorded((url) => {
        if (url.pathname === "/3.0/ping") {
          if (calls.length === 1)
            return new Response(LEAK, { status: 429, headers: { "retry-after": "0" } });
          return Response.json({ health_status: "ok" });
        }
        return Response.json({ lists: [], total_items: 0 });
      });
      const empty = await diagnoseMailchimp();
      assert.equal(empty.reachable, true);
      assert.equal(empty.audienceCount, 0);
      assert.equal(empty.errorClass, "none");
      assert.equal(calls.some((call) => call.url.pathname.includes("members")), false);
      noSecrets(empty);
    },
    { key: KEY },
  );
});

test("audience pages are followed and list ids stay out of the diagnosis", async () => {
  await withMailchimp(
    async () => {
      const calls = recorded((url) => {
        if (url.pathname === "/3.0/ping") return Response.json({ health_status: "ok" });
        const offset = Number(url.searchParams.get("offset"));
        if (offset === 0)
          return Response.json({
            lists: Array.from({ length: 100 }, (_, index) => ({ id: `a${index}` })),
            total_items: 101,
          });
        if (offset === 100) return Response.json({ lists: [{ id: "b1" }], total_items: 101 });
        return new Response(JSON.stringify({ email: LEAK }), { status: 500 });
      });
      const diagnosis = await diagnoseMailchimp();
      assert.equal(diagnosis.audienceCount, 101);
      assert.equal(diagnosis.errorClass, "none");
      assert.equal(calls.filter((call) => call.url.pathname === "/3.0/lists").length, 2);
      noSecrets(diagnosis);
    },
    { key: KEY },
  );
});

test("contact check paginates members and reports exclusions without importing anyone", async () => {
  await withMailchimp(
    async () => {
      const known = {
        emails: new Set(["known@example.test"]),
        people: new Set([personKey("Ada", "Lovelace", "Firma AG")]),
      };
      const page = [
        member("a@example.test", "subscribed"),
        member("a@example.test", "cleaned"),
        member("b@example.test", "unsubscribed"),
        member("c@example.test", "cleaned"),
        member("known@example.test", "subscribed"),
        member("other@firma.example", "subscribed", {
          FNAME: "Ada",
          LNAME: "Lovelace",
          COMPANY: "Firma AG",
        }),
        member("new@example.test", "subscribed"),
        member(LEAK, "subscribed"),
        member(LEAK, "subscribed"),
      ];
      const calls = recorded((url) => {
        if (url.pathname === "/3.0/ping") return Response.json({});
        if (url.pathname === "/3.0/lists")
          return Response.json({ lists: [{ id: "list1" }], total_items: 1 });
        assert.equal(url.pathname, "/3.0/lists/list1/members");
        const offset = Number(url.searchParams.get("offset"));
        assert.equal(url.searchParams.get("count"), "100");
        if (offset === 0) return Response.json({ members: page.slice(0, 5), total_items: page.length });
        if (offset === 5) return Response.json({ members: page.slice(5), total_items: page.length });
        return Response.json({ members: [], total_items: page.length });
      });
      const report = await reviewMailchimpContacts(known);
      assert.equal(report.imported, 0);
      assert.equal(report.persisted, false);
      assert.equal(report.sent, false);
      assert.equal(report.errorClass, "none");
      assert.equal(report.audienceCount, 1);
      assert.equal(report.counts.read, page.length);
      assert.equal(report.counts.cleaned, 2);
      assert.equal(report.counts.unsubscribed, 1);
      assert.equal(report.counts.excluded, 3);
      assert.equal(report.counts.duplicates, 2);
      assert.equal(report.counts.existing, 2);
      assert.equal(report.counts.newContacts, 2);
      assert.equal(calls.filter((call) => call.url.pathname.endsWith("/members")).length, 2);
      noSecrets(report);
      assert.equal(mailchimpCheckSummary(report).includes("@"), false);
      assert.match(mailchimpCheckSummary(report), /nichts gespeichert/);
      assert.deepEqual(Object.keys(report).sort(), [
        "audienceCount",
        "configured",
        "counts",
        "errorClass",
        "imported",
        "persisted",
        "reachable",
        "sent",
      ]);
    },
    { key: KEY },
  );
});

test("member pagination walks 150 records and stops when the page budget is exhausted", async () => {
  await withMailchimp(
    async () => {
      recorded((url) => {
        if (url.pathname === "/3.0/ping") return Response.json({});
        if (url.pathname === "/3.0/lists")
          return Response.json({ lists: [{ id: "list1" }], total_items: 1 });
        const offset = Number(url.searchParams.get("offset"));
        const members = Array.from({ length: Math.min(100, 150 - offset) }, (_, index) =>
          member(`m${offset + index}@example.test`, "subscribed"),
        );
        return Response.json({ members, total_items: 150 });
      });
      const report = await reviewMailchimpContacts({ emails: new Set(), people: new Set() });
      assert.equal(report.counts.read, 150);
      assert.equal(report.counts.newContacts, 150);
      assert.equal(report.counts.duplicates, 0);
      assert.equal(report.errorClass, "none");
      assert.equal(report.imported, 0);
    },
    { key: KEY },
  );

  await withMailchimp(
    async () => {
      const calls = recorded((url) => {
        if (url.pathname === "/3.0/ping") return Response.json({});
        if (url.pathname === "/3.0/lists")
          return Response.json({ lists: [{ id: "list1" }], total_items: 1 });
        const offset = Number(url.searchParams.get("offset"));
        const members = Array.from({ length: 100 }, (_, index) =>
          member(`p${offset + index}@example.test`, "subscribed"),
        );
        return Response.json({ members, total_items: 5000 });
      });
      const report = await reviewMailchimpContacts({ emails: new Set(), people: new Set() });
      assert.equal(report.errorClass, "incomplete");
      assert.equal(report.counts.read, 2000);
      assert.equal(report.persisted, false);
      assert.equal(calls.filter((call) => call.url.pathname.endsWith("/members")).length, 20);
      assert.match(mailchimpCheckSummary(report), /nur einen Teil/);
      noSecrets(report);
    },
    { key: KEY },
  );
});

test("read client rejects a non-relative path before any request", async () => {
  await withMailchimp(
    async () => {
      let calls = 0;
      globalThis.fetch = (async () => {
        calls += 1;
        return Response.json({});
      }) as typeof fetch;
      await assert.rejects(() => mailchimpGet("https://evil.example/lists"), MailchimpReadError);
      await assert.rejects(() => mailchimpGet("//evil.example/lists"), MailchimpReadError);
      assert.equal(calls, 0);
    },
    { key: KEY },
  );
});

test("public contact report cannot carry an address or a changed import flag", () => {
  const clean = publicContactReport({
    configured: true,
    reachable: true,
    audienceCount: 1,
    errorClass: "none",
    imported: 0,
    persisted: false,
    sent: false,
    counts: {
      read: 1,
      subscribed: 1,
      unsubscribed: 0,
      cleaned: 0,
      pending: 0,
      excluded: 0,
      duplicates: 0,
      existing: 0,
      newContacts: 1,
      errors: 0,
    },
    email: LEAK,
    importedCount: 4,
  } as MailchimpContactReport & { email: string; importedCount: number });
  assert.equal(JSON.stringify(clean).includes(LEAK), false);
  assert.equal(clean.imported, 0);
  assert.equal("email" in clean, false);
});
