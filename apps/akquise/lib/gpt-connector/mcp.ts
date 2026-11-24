import { NextResponse } from "next/server";
import { PolicyError } from "../policy";
import { requireGptConnector } from "./auth";
import { mailchimpHttpError, type MailchimpReadDeps } from "./mailchimp-http";
import {
  parseMailchimpLiveQuery,
  readMailchimpLive,
  type MailchimpLiveSnapshot,
} from "./mailchimp-live";
import { assertNoCredentialQuery } from "./request-guard";

const PROTOCOL_VERSIONS = ["2025-03-26", "2025-06-18"] as const;
const LATEST_PROTOCOL = "2025-06-18";
const MAX_BODY = 32_768;

export const MAILCHIMP_MCP_TOOL = {
  name: "read_mailchimp",
  title: "Mailchimp live lesen",
  description:
    "Liest aktuelle Mailchimp-Audiences, Statuszählwerte und Kampagnen. Nur Lesen. Keine Adressen, kein Speichern, kein Versand und keine Kontaktänderung.",
  inputSchema: {
    type: "object",
    additionalProperties: false,
    properties: {
      audienceOffset: { type: "integer", minimum: 0, maximum: 10000 },
      audienceLimit: { type: "integer", minimum: 1, maximum: 20 },
      campaignOffset: { type: "integer", minimum: 0, maximum: 10000 },
      campaignLimit: { type: "integer", minimum: 1, maximum: 20 },
      audienceId: { type: "string", pattern: "^[A-Za-z0-9]{1,32}$" },
    },
  },
  annotations: {
    readOnlyHint: true,
    destructiveHint: false,
    idempotentHint: true,
    openWorldHint: true,
  },
} as const;

const jsonHeaders = {
  "Content-Type": "application/json",
  "Cache-Control": "no-store",
} as const;

function rpc(id: string | number, result: unknown) {
  return new NextResponse(JSON.stringify({ jsonrpc: "2.0", id, result }), {
    status: 200,
    headers: jsonHeaders,
  });
}

function rpcError(id: string | number | null, code: number, message: string, status = 200) {
  return new NextResponse(
    JSON.stringify({ jsonrpc: "2.0", id, error: { code, message } }),
    { status, headers: jsonHeaders },
  );
}

function asRecord(value: unknown): Record<string, unknown> {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : {};
}

function acceptsStreamableHttp(req: Request) {
  const accept = req.headers.get("accept") ?? "";
  return accept.includes("application/json") && accept.includes("text/event-stream");
}

async function callTool(
  params: Record<string, unknown>,
  read: (query: unknown) => Promise<MailchimpLiveSnapshot>,
) {
  if (params.name !== MAILCHIMP_MCP_TOOL.name) {
    return {
      content: [{ type: "text", text: "Unbekanntes Werkzeug." }],
      isError: true,
    };
  }
  const query = parseMailchimpLiveQuery(params.arguments ?? {});
  const snapshot = await read(query);
  return {
    content: [{ type: "text", text: JSON.stringify(snapshot) }],
    structuredContent: snapshot,
    isError: snapshot.error !== null,
  };
}

/**
 * Streamable HTTP MCP. Every request, including initialize and tools/list,
 * requires the existing read bearer and the mailchimp scope. Tokens in the URL
 * are rejected. GET does not open a public event stream.
 */
export async function handleMailchimpMcp(req: Request, deps: MailchimpReadDeps = {}) {
  const authorize = deps.authorize ?? ((r: Request) => requireGptConnector(r, "mailchimp"));
  const read = deps.read ?? readMailchimpLive;
  try {
    assertNoCredentialQuery(req);
    await authorize(req);
    const protocol = req.headers.get("mcp-protocol-version");
    if (
      protocol &&
      !PROTOCOL_VERSIONS.includes(protocol as (typeof PROTOCOL_VERSIONS)[number])
    )
      return rpcError(null, -32600, "Unsupported protocol version.", 400);
    if (req.method !== "POST")
      return new NextResponse(null, {
        status: 405,
        headers: { Allow: "POST", "Cache-Control": "no-store" },
      });
    if (!acceptsStreamableHttp(req))
      return rpcError(null, -32600, "Unsupported accept header.", 406);
    const contentType = req.headers.get("content-type") ?? "";
    if (!contentType.toLowerCase().includes("application/json"))
      return rpcError(null, -32600, "Unsupported content type.", 415);
    const declared = Number(req.headers.get("content-length"));
    if (Number.isFinite(declared) && declared > MAX_BODY)
      return rpcError(null, -32600, "Request too large.", 413);
    const text = await req.text();
    if (text.length > MAX_BODY) return rpcError(null, -32600, "Request too large.", 413);
    let payload: unknown;
    try {
      payload = JSON.parse(text);
    } catch {
      return rpcError(null, -32700, "Parse error", 400);
    }
    if (Array.isArray(payload) || !payload || typeof payload !== "object")
      return rpcError(null, -32600, "Invalid request", 400);
    const message = payload as Record<string, unknown>;
    if (message.jsonrpc !== "2.0" || typeof message.method !== "string")
      return rpcError(null, -32600, "Invalid request", 400);
    if (!Object.prototype.hasOwnProperty.call(message, "id"))
      return new NextResponse(null, { status: 202, headers: { "Cache-Control": "no-store" } });
    const id = message.id;
    if (typeof id !== "string" && typeof id !== "number")
      return rpcError(null, -32600, "Invalid request", 400);

    if (message.method === "initialize") {
      const params = asRecord(message.params);
      const requested =
        typeof params.protocolVersion === "string" ? params.protocolVersion : "";
      const protocolVersion = PROTOCOL_VERSIONS.includes(
        requested as (typeof PROTOCOL_VERSIONS)[number],
      )
        ? requested
        : LATEST_PROTOCOL;
      return rpc(id, {
        protocolVersion,
        capabilities: { tools: { listChanged: false } },
        serverInfo: { name: "studioone-mailchimp-readonly", version: "1.0.0" },
        instructions:
          "Read-only Mailchimp access for audiences, status counts and campaigns. Contact addresses, exports, subscriptions and sending are not available.",
      });
    }
    if (message.method === "ping") return rpc(id, {});
    if (message.method === "tools/list") return rpc(id, { tools: [MAILCHIMP_MCP_TOOL] });
    if (message.method === "tools/call") {
      try {
        return rpc(id, await callTool(asRecord(message.params), read));
      } catch (error) {
        if (error instanceof PolicyError) return rpcError(id, -32602, "Invalid params");
        throw error;
      }
    }
    return rpcError(id, -32601, "Method not found");
  } catch (error) {
    return mailchimpHttpError(error);
  }
}
