import { test } from "node:test";
import assert from "node:assert/strict";
import { PolicyError } from "../lib/policy";
import { parseScopes } from "../lib/gpt-connector/auth";
import { gptConnectorOpenApi } from "../lib/gpt-connector/openapi";
import { parseGptScopesUpdate } from "../lib/gpt-connector/settings";
import { handleMailchimpRead } from "../lib/gpt-connector/mailchimp-http";
import { readMailchimpLive } from "../lib/gpt-connector/mailchimp-live";
import { handleMailchimpMcp, MAILCHIMP_MCP_TOOL } from "../lib/gpt-connector/mcp";
import { GET as readRoute } from "../app/api/integrations/gpt/mailchimp/route";
import * as mailchimpRoute from "../app/api/integrations/gpt/mailchimp/route";
import * as mcpRoute from "../app/api/integrations/gpt/mcp/route";

const KEY = "synthetic-readonly-us17";
const LEAK = "hidden-person@example.test";
const SENDER = "sender@example.test";
const READ = "connector-read-token-synthetic";
const WRITE = "connector-write-token-synthetic";
const QUERY_SECRET = "query-secret-value-synthetic";

function jsonResponse(body: unknown, status = 200, headers?: HeadersInit) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json", ...headers },
  });
}

function audience(id: string, name = `Audience ${id}`) {
  return {
    id,
    name,
    email_address: LEAK,
    from_email: SENDER,
    stats: {
      member_count: 10,
      unsubscribe_count: 2,
      cleaned_count: 1,
      total_contacts: 14,
    },
  };
}

function campaign(id = "cmp0000001") {
  return {
    id,
    status: "sent",
    type: "regular",
    emails_sent: 80,
    send_time: "2026-11-01T10:00:00+00:00",
    create_time: "2026-10-01T08:00:00+00:00",
    settings: {
      title: `Titel ${LEAK}`,
      subject_line: `Betreff ${SENDER}`,
      reply_to: SENDER,
      from_name: "Studiojeker",
    },
    recipients: {
      list_id: "aud00",
      list_name: "Liste",
      from_email: SENDER,
    },
    archive_url: `https://example.test/${LEAK}`,
  };
}

async function withKey(run: () => Promise<void>, key: string | undefined = KEY) {
  const originalFetch = globalThis.fetch;
  const originalKey = process.env.MAILCHIMP_API_KEY;
  const originalPrefix = process.env.MAILCHIMP_SERVER_PREFIX;
  const originalRead = process.env.CHATGPT_CONNECTOR_TOKEN;
  const originalWrite = process.env.CHATGPT_CONNECTOR_WRITE_TOKEN;
  const logs: string[] = [];
  const methods = ["log", "info", "warn", "error", "debug"] as const;
  const originals = new Map<string, (...args: unknown[]) => void>();
  for (const method of methods) {
    originals.set(method, console[method]);
    console[method] = (...args: unknown[]) => {
      logs.push(args.map((arg) => (typeof arg === "string" ? arg : JSON.stringify(arg))).join(" "));
    };
  }
  if (key === undefined) delete process.env.MAILCHIMP_API_KEY;
  else process.env.MAILCHIMP_API_KEY = key;
  delete process.env.MAILCHIMP_SERVER_PREFIX;
  process.env.CHATGPT_CONNECTOR_TOKEN = READ;
  process.env.CHATGPT_CONNECTOR_WRITE_TOKEN = WRITE;
  try {
    await run();
    const logText = logs.join("\n");
    assert.equal(logText.includes(KEY), false);
    assert.equal(logText.includes(LEAK), false);
    assert.equal(logText.includes(SENDER), false);
    assert.equal(logText.includes(READ), false);
    assert.equal(logText.includes(WRITE), false);
    assert.equal(logText.includes(QUERY_SECRET), false);
  } finally {
    globalThis.fetch = originalFetch;
    if (originalKey === undefined) delete process.env.MAILCHIMP_API_KEY;
    else process.env.MAILCHIMP_API_KEY = originalKey;
    if (originalPrefix === undefined) delete process.env.MAILCHIMP_SERVER_PREFIX;
    else process.env.MAILCHIMP_SERVER_PREFIX = originalPrefix;
    if (originalRead === undefined) delete process.env.CHATGPT_CONNECTOR_TOKEN;
    else process.env.CHATGPT_CONNECTOR_TOKEN = originalRead;
    if (originalWrite === undefined) delete process.env.CHATGPT_CONNECTOR_WRITE_TOKEN;
    else process.env.CHATGPT_CONNECTOR_WRITE_TOKEN = originalWrite;
    for (const method of methods) console[method] = originals.get(method)!;
  }
}

function installFetch(
  handler: (url: URL, calls: URL[]) => Response | Promise<Response>,
) {
  const calls: URL[] = [];
  globalThis.fetch = (async (input: string | URL | Request, init?: RequestInit) => {
    const url = new URL(typeof input === "string" || input instanceof URL ? input : input.url);
    calls.push(url);
    assert.equal(init?.method, "GET");
    assert.equal(init?.body ?? null, null);
    assert.equal(url.protocol, "https:");
    assert.equal(url.hostname, "us17.api.mailchimp.com");
    assert.equal(url.search.includes(KEY), false);
    assert.equal(url.search.includes(LEAK), false);
    const fields = url.searchParams.get("fields") ?? "";
    assert.equal(fields.includes("email_address"), false);
    assert.equal(fields.includes("from_email"), false);
    assert.equal(fields.includes("reply_to"), false);
    return handler(url, calls);
  }) as typeof fetch;
  return calls;
}

function noSecrets(value: unknown) {
  const json = JSON.stringify(value);
  for (const secret of [KEY, LEAK, SENDER, READ, WRITE, QUERY_SECRET, "Basic ", "email_address", "from_email", "reply_to"])
    assert.equal(json.includes(secret), false, secret);
}

function memberPayload(total: number) {
  return { total_items: total, members: [{ email_address: LEAK, status: "pending" }] };
}

function okHandler(url: URL) {
  if (url.pathname === "/3.0/lists") {
    return jsonResponse({
      lists: [audience("aud00", `Team ${LEAK} ${KEY}`)],
      total_items: 1,
    });
  }
  if (url.pathname.endsWith("/members")) {
    const status = url.searchParams.get("status");
    return jsonResponse(memberPayload(status === "pending" ? 4 : 2));
  }
  if (url.pathname === "/3.0/campaigns") return jsonResponse({ campaigns: [campaign()], total_items: 1 });
  return jsonResponse({ detail: LEAK }, 404);
}

test("missing configuration does not call Mailchimp", async () => {
  await withKey(async () => {
    delete process.env.MAILCHIMP_API_KEY;
    let called = false;
    globalThis.fetch = (() => {
      called = true;
      throw new Error("fetch");
    }) as typeof fetch;
    const snapshot = await readMailchimpLive();
    assert.equal(called, false);
    assert.equal(snapshot.live, false);
    assert.equal(snapshot.source, "mailchimp");
    assert.equal(snapshot.sent, false);
    assert.equal(snapshot.persisted, false);
    assert.equal(snapshot.error?.class, "not_configured");
    assert.equal(snapshot.error?.part, "configuration");
    noSecrets(snapshot);
  });
});

test("contradicting server prefix does not call Mailchimp", async () => {
  await withKey(async () => {
    process.env.MAILCHIMP_SERVER_PREFIX = "us2";
    let called = false;
    globalThis.fetch = (() => {
      called = true;
      throw new Error("fetch");
    }) as typeof fetch;
    const snapshot = await readMailchimpLive();
    assert.equal(called, false);
    assert.equal(snapshot.error?.class, "invalid_configuration");
    noSecrets(snapshot);
  });
});

test("live read is GET-only, paged and sanitized", async () => {
  await withKey(async () => {
    const calls = installFetch((url) => okHandler(url));
    const snapshot = await readMailchimpLive({
      audienceOffset: 0,
      audienceLimit: 1,
      campaignOffset: 0,
      campaignLimit: 1,
    });
    assert.equal(snapshot.live, true);
    assert.equal(snapshot.error, null);
    assert.equal(snapshot.audiences[0]?.statusCounts.subscribed, 10);
    assert.equal(snapshot.audiences[0]?.statusCounts.unsubscribed, 2);
    assert.equal(snapshot.audiences[0]?.statusCounts.cleaned, 1);
    assert.equal(snapshot.audiences[0]?.statusCounts.pending, 4);
    assert.equal(snapshot.audiences[0]?.statusCounts.transactional, 2);
    assert.equal(snapshot.audiences[0]?.memberCount, 14);
    assert.equal(snapshot.audiences[0]?.name, "Team [redacted-email] [redacted]");
    assert.equal(snapshot.campaigns[0]?.title, "Titel [redacted-email]");
    assert.equal(snapshot.campaigns[0]?.subject, "Betreff [redacted-email]");
    assert.equal(snapshot.campaigns[0]?.emailsSent, 80);
    assert.equal(snapshot.campaigns[0]?.audienceId, "aud00");
    assert.equal(snapshot.paging.audiences.total, 1);
    assert.equal(snapshot.paging.audiences.hasMore, false);
    assert.ok(Math.abs(Date.now() - Date.parse(snapshot.retrievedAt)) < 60_000);
    assert.ok(calls.every((url) => url.pathname.startsWith("/3.0/")));
    assert.equal(calls.filter((url) => url.pathname === "/3.0/campaigns").length, 1);
    noSecrets(snapshot);
  });
});

test("paging reports hasMore and forwards offset", async () => {
  await withKey(async () => {
    const calls = installFetch((url) => {
      if (url.pathname === "/3.0/lists") {
        assert.equal(url.searchParams.get("offset"), "20");
        assert.equal(url.searchParams.get("count"), "20");
        const lists = Array.from({ length: 20 }, (_, index) => audience(`aud${String(index).padStart(2, "0")}`));
        return jsonResponse({ lists, total_items: 45 });
      }
      if (url.pathname.endsWith("/members")) return jsonResponse({ total_items: 0 });
      if (url.pathname === "/3.0/campaigns") {
        assert.equal(url.searchParams.get("offset"), "40");
        assert.equal(url.searchParams.get("count"), "5");
        return jsonResponse({ campaigns: [campaign("cmp0000002")], total_items: 41 });
      }
      return jsonResponse({}, 404);
    });
    const snapshot = await readMailchimpLive({
      audienceOffset: 20,
      audienceLimit: 20,
      campaignOffset: 40,
      campaignLimit: 5,
    });
    assert.equal(snapshot.paging.audiences.returned, 20);
    assert.equal(snapshot.paging.audiences.total, 45);
    assert.equal(snapshot.paging.audiences.hasMore, true);
    assert.equal(snapshot.paging.campaigns.returned, 1);
    assert.equal(snapshot.paging.campaigns.hasMore, false);
    assert.ok(calls.length > 0);
    noSecrets(snapshot);
  });
});

test("audience failure keeps campaign data and hides the provider body", async () => {
  await withKey(async () => {
    installFetch((url) => {
      if (url.pathname === "/3.0/lists")
        return new Response(`secret ${LEAK} ${KEY}`, { status: 401 });
      if (url.pathname === "/3.0/campaigns")
        return jsonResponse({ campaigns: [campaign()], total_items: 1 });
      return jsonResponse({}, 404);
    });
    const snapshot = await readMailchimpLive();
    assert.equal(snapshot.live, true);
    assert.equal(snapshot.error?.class, "auth");
    assert.equal(snapshot.error?.part, "audiences");
    assert.equal(snapshot.audiences.length, 0);
    assert.equal(snapshot.campaigns.length, 1);
    noSecrets(snapshot);
    assert.equal(JSON.stringify(snapshot).includes("secret"), false);
  });
});

test("campaign timeout is reported without dropping audiences", async () => {
  await withKey(async () => {
    installFetch((url) => {
      if (url.pathname === "/3.0/campaigns") {
        const error = new Error("timed out");
        error.name = "TimeoutError";
        throw error;
      }
      if (url.pathname === "/3.0/lists")
        return jsonResponse({ lists: [audience("aud00")], total_items: 1 });
      return jsonResponse({ total_items: 0 });
    });
    const snapshot = await readMailchimpLive({ audienceLimit: 1, campaignLimit: 1 });
    assert.equal(snapshot.error?.class, "timeout");
    assert.equal(snapshot.error?.part, "campaigns");
    assert.equal(snapshot.audiences.length, 1);
    assert.equal(snapshot.campaigns.length, 0);
    noSecrets(snapshot);
  });
});

test("status errors keep the audience and the successful count", async () => {
  await withKey(async () => {
    installFetch((url) => {
      if (url.pathname === "/3.0/lists")
        return jsonResponse({ lists: [audience("aud00")], total_items: 1 });
      if (url.pathname.endsWith("/members") && url.searchParams.get("status") === "pending")
        return new Response("{}", { status: 429, headers: { "retry-after": "0" } });
      if (url.pathname.endsWith("/members")) return jsonResponse({ total_items: 2 });
      return jsonResponse({ campaigns: [], total_items: 0 });
    });
    const snapshot = await readMailchimpLive({ audienceLimit: 1, campaignLimit: 1 });
    assert.equal(snapshot.error?.class, "rate_limited");
    assert.equal(snapshot.error?.part, "status");
    assert.equal(snapshot.audiences[0]?.statusCounts.pending, null);
    assert.equal(snapshot.audiences[0]?.statusCounts.transactional, 2);
    assert.equal(snapshot.audiences[0]?.statusCounts.subscribed, 10);
    noSecrets(snapshot);
  });
});

test("invalid query and foreign identifiers do not call Mailchimp", async () => {
  await withKey(async () => {
    let called = false;
    globalThis.fetch = (() => {
      called = true;
      throw new Error("fetch");
    }) as typeof fetch;
    await assert.rejects(() => readMailchimpLive({ audienceId: LEAK }), PolicyError);
    await assert.rejects(() => readMailchimpLive({ email: LEAK }), PolicyError);
    await assert.rejects(() => readMailchimpLive({ audienceLimit: 21 }), PolicyError);
    assert.equal(called, false);
  });
});

test("REST route rejects missing auth, write token and URL credentials", async () => {
  await withKey(async () => {
    let called = false;
    globalThis.fetch = (() => {
      called = true;
      throw new Error("fetch");
    }) as typeof fetch;
    const missing = await readRoute(new Request("http://localhost/api/integrations/gpt/mailchimp"));
    assert.equal(missing.status, 401);
    assert.match(missing.headers.get("www-authenticate") ?? "", /Bearer/);
    const missingBody = await missing.text();
    assert.equal(missingBody.includes(READ), false);
    assert.equal(missingBody.includes("read_mailchimp"), false);

    const write = await readRoute(
      new Request("http://localhost/api/integrations/gpt/mailchimp", {
        headers: { authorization: `Bearer ${WRITE}` },
      }),
    );
    assert.equal(write.status, 401);
    assert.equal((await write.text()).includes(WRITE), false);

    let authorized = false;
    const leaked = await handleMailchimpRead(
      new Request(`http://localhost/api/integrations/gpt/mailchimp?access_token=${QUERY_SECRET}`, {
        headers: { authorization: `Bearer ${READ}` },
      }),
      {
        authorize: async () => {
          authorized = true;
        },
      },
    );
    assert.equal(leaked.status, 401);
    assert.equal(authorized, false);
    assert.equal((await leaked.text()).includes(QUERY_SECRET), false);

    const denied = await handleMailchimpRead(
      new Request("http://localhost/api/integrations/gpt/mailchimp", {
        headers: { authorization: `Bearer ${READ}` },
      }),
      {
        authorize: async () => {
          throw new PolicyError("Dieser Inhaltsbereich ist nicht freigeschaltet.", 403);
        },
      },
    );
    assert.equal(denied.status, 403);
    const posted = await handleMailchimpRead(
      new Request("http://localhost/api/integrations/gpt/mailchimp", { method: "POST" }),
      { authorize: async () => ({}) },
    );
    assert.equal(posted.status, 405);
    assert.equal("POST" in mailchimpRoute, false);
    assert.equal(called, false);
  });
});

test("REST route returns the sanitized snapshot for an authorized read", async () => {
  await withKey(async () => {
    installFetch((url) => okHandler(url));
    const response = await handleMailchimpRead(
      new Request("http://localhost/api/integrations/gpt/mailchimp?audienceLimit=1&campaignLimit=1"),
      { authorize: async () => ({}) },
    );
    assert.equal(response.status, 200);
    assert.equal(response.headers.get("cache-control"), "no-store");
    const body = await response.json();
    assert.equal(body.source, "mailchimp");
    assert.equal(body.sent, false);
    noSecrets(body);
  });
});

test("scope updates keep mailchimp opt-in", () => {
  assert.equal(parseScopes({}).mailchimp, false);
  assert.equal(
    parseGptScopesUpdate({
      projects: true,
      campaigns: true,
      concepts: true,
      content: true,
      write_drafts: false,
    }).mailchimp,
    false,
  );
  assert.equal(
    parseGptScopesUpdate({
      projects: true,
      campaigns: true,
      concepts: true,
      content: true,
      write_drafts: false,
      mailchimp: true,
    }).mailchimp,
    true,
  );
  assert.equal(
    parseGptScopesUpdate({
      projects: true,
      campaigns: true,
      concepts: true,
      content: true,
      write_drafts: false,
      mailchimp: false,
    }).mailchimp,
    false,
  );
  assert.throws(() =>
    parseGptScopesUpdate({
      projects: true,
      campaigns: true,
      concepts: true,
      content: true,
      write_drafts: false,
      mailchimp: "yes",
    }),
  );
});

test("OpenAPI exposes only the GET Mailchimp operation", () => {
  const spec = gptConnectorOpenApi();
  const path = spec.paths["/api/integrations/gpt/mailchimp"];
  assert.equal(spec.info.version, "1.4.0");
  assert.ok(path.get);
  assert.equal("post" in path, false);
  assert.deepEqual(path.get.security, [{ connectorBearer: [] }]);
  assert.equal(path.get.operationId, "readMailchimp");
  assert.equal(JSON.stringify(spec).includes(KEY), false);
  assert.equal(JSON.stringify(spec).includes("/api/integrations/gpt/mcp"), false);
});

function mcpRequest(body: unknown, init: RequestInit = {}) {
  const headers = new Headers(init.headers);
  if (!headers.has("accept")) headers.set("accept", "application/json, text/event-stream");
  if (!headers.has("content-type")) headers.set("content-type", "application/json");
  return new Request("http://localhost/api/integrations/gpt/mcp", {
    method: "POST",
    ...init,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

test("MCP hides the catalog until the read bearer is present", async () => {
  await withKey(async () => {
    const listed = await handleMailchimpMcp(
      mcpRequest({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
    );
    assert.equal(listed.status, 401);
    const body = await listed.text();
    assert.equal(body.includes("read_mailchimp"), false);
    assert.equal(body.includes(READ), false);
    const opened = await mcpRoute.GET(new Request("http://localhost/api/integrations/gpt/mcp"));
    assert.equal(opened.status, 401);
    assert.equal("PUT" in mcpRoute, false);
  });
});

test("authenticated MCP lists one read-only tool and calls it with GET", async () => {
  await withKey(async () => {
    const calls = installFetch((url) => okHandler(url));
    const authorize = async () => ({});
    const listed = await handleMailchimpMcp(
      mcpRequest({ jsonrpc: "2.0", id: 2, method: "tools/list" }),
      { authorize },
    );
    const tools = (await listed.json()).result.tools;
    assert.deepEqual(
      tools.map((tool: { name: string }) => tool.name),
      ["read_mailchimp"],
    );
    assert.equal(tools[0].annotations.readOnlyHint, true);
    assert.equal(tools[0].annotations.destructiveHint, false);
    assert.equal(MAILCHIMP_MCP_TOOL.name, "read_mailchimp");

    const called = await handleMailchimpMcp(
      mcpRequest({
        jsonrpc: "2.0",
        id: "call-1",
        method: "tools/call",
        params: { name: "read_mailchimp", arguments: { audienceLimit: 1, campaignLimit: 1 } },
      }),
      { authorize },
    );
    const payload = await called.json();
    assert.equal(payload.result.isError, false);
    assert.equal(payload.result.structuredContent.source, "mailchimp");
    noSecrets(payload);
    assert.ok(calls.length > 0);
    assert.ok(calls.every((url) => url.searchParams.get("fields") !== null || url.pathname.endsWith("/members") || url.pathname === "/3.0/campaigns" || url.pathname === "/3.0/lists"));

    const initialized = await handleMailchimpMcp(
      mcpRequest({
        jsonrpc: "2.0",
        id: 3,
        method: "initialize",
        params: { protocolVersion: "2025-03-26", capabilities: {}, clientInfo: { name: "test", version: "0" } },
      }),
      { authorize },
    );
    assert.equal((await initialized.json()).result.protocolVersion, "2025-03-26");
  });
});

test("MCP refuses writes, URL tokens, unauthenticated streams and bad arguments", async () => {
  await withKey(async () => {
    let reads = 0;
    const authorize = async () => ({});
    const read = async () => {
      reads += 1;
      throw new Error("should not read");
    };
    const unknown = await handleMailchimpMcp(
      mcpRequest({
        jsonrpc: "2.0",
        id: 4,
        method: "tools/call",
        params: { name: "send_campaign", arguments: {} },
      }),
      { authorize, read },
    );
    assert.equal((await unknown.json()).result.isError, true);
    const invalid = await handleMailchimpMcp(
      mcpRequest({
        jsonrpc: "2.0",
        id: 5,
        method: "tools/call",
        params: { name: "read_mailchimp", arguments: { email: LEAK } },
      }),
      { authorize, read },
    );
    const invalidBody = await invalid.json();
    assert.equal(invalidBody.error.code, -32602);
    assert.equal(JSON.stringify(invalidBody).includes(LEAK), false);
    const missing = await handleMailchimpMcp(
      mcpRequest({ jsonrpc: "2.0", id: 6, method: "campaigns/send" }),
      { authorize, read },
    );
    assert.equal((await missing.json()).error.code, -32601);
    const note = await handleMailchimpMcp(
      mcpRequest({ jsonrpc: "2.0", method: "notifications/initialized" }),
      { authorize, read },
    );
    assert.equal(note.status, 202);
    const stream = await handleMailchimpMcp(
      new Request("http://localhost/api/integrations/gpt/mcp", { method: "GET" }),
      { authorize, read },
    );
    assert.equal(stream.status, 405);
    assert.equal(stream.headers.get("allow"), "POST");
    const leaked = await handleMailchimpMcp(
      mcpRequest(
        { jsonrpc: "2.0", id: 7, method: "tools/list" },
        { headers: { authorization: `Bearer ${READ}` } },
      ),
      { authorize, read },
    );
    assert.equal(leaked.status, 200);
    const rejected = await handleMailchimpMcp(
      new Request(`http://localhost/api/integrations/gpt/mcp?token=${QUERY_SECRET}`, {
        method: "POST",
        headers: {
          accept: "application/json, text/event-stream",
          "content-type": "application/json",
          authorization: `Bearer ${READ}`,
        },
        body: JSON.stringify({ jsonrpc: "2.0", id: 8, method: "tools/list" }),
      }),
      { authorize, read },
    );
    assert.equal(rejected.status, 401);
    assert.equal((await rejected.text()).includes(QUERY_SECRET), false);
    assert.equal(reads, 0);
  });
});
