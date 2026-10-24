import { appOrigin } from "../config.mjs";

/** OpenAPI 3.1 description for ChatGPT Custom Actions / Connectors. */
export function gptConnectorOpenApi() {
  const server = (() => {
    try {
      return appOrigin();
    } catch {
      return "https://studiojeker-akquise.onrender.com";
    }
  })();
  const errorResponses = {
    "401": { description: "Unauthorized" },
    "403": { description: "Revoked, scope disabled, or write grant missing" },
    "404": { description: "Not found or not shared" },
    "409": { description: "Optimistic lock conflict" },
    "413": { description: "Request body too large" },
    "429": { description: "Rate limited" },
    "503": { description: "Write token or actor not configured" },
  };
  const jsonObject = {
    description: "JSON object",
    content: {
      "application/json": {
        schema: { type: "object", additionalProperties: true },
      },
    },
  };
  return {
    openapi: "3.1.0",
    info: {
      title: "StudioONE ChatGPT Connector",
      version: "1.1.0",
      description:
        "Read access to explicitly shared StudioONE projects, campaigns, concepts and editorial drafts. Optional controlled write access for editorial drafts only (no publish, send, delete or CRM). Write endpoints require CHATGPT_CONNECTOR_WRITE_TOKEN, write_drafts scope, and explicit write grants. Tokens are never embedded in this document.",
    },
    servers: [{ url: server }],
    paths: {
      "/api/integrations/gpt/projects": {
        get: {
          operationId: "listProjects",
          summary: "List shared StudioONE projects (content series)",
          security: [{ connectorBearer: [] }],
          responses: {
            "200": jsonObject,
            ...errorResponses,
          },
        },
      },
      "/api/integrations/gpt/projects/{id}": {
        get: {
          operationId: "getProject",
          summary: "Get one shared project with briefing and drafts",
          security: [{ connectorBearer: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": jsonObject,
            ...errorResponses,
          },
        },
      },
      "/api/integrations/gpt/campaigns": {
        get: {
          operationId: "listCampaigns",
          summary: "List shared marketing campaigns",
          security: [{ connectorBearer: [] }],
          responses: {
            "200": jsonObject,
            ...errorResponses,
          },
        },
      },
      "/api/integrations/gpt/campaigns/{id}": {
        get: {
          operationId: "getCampaign",
          summary:
            "Get one shared campaign with headlines, claims and saved drafts",
          security: [{ connectorBearer: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": jsonObject,
            ...errorResponses,
          },
        },
      },
      "/api/integrations/gpt/content/search": {
        get: {
          operationId: "searchContent",
          summary: "Search explicitly shared editorial content",
          security: [{ connectorBearer: [] }],
          parameters: [
            {
              name: "q",
              in: "query",
              required: true,
              schema: { type: "string", minLength: 2, maxLength: 200 },
              description: "Search query (titles, headlines, body text)",
            },
          ],
          responses: {
            "200": jsonObject,
            ...errorResponses,
          },
        },
      },
      "/api/integrations/gpt/drafts": {
        post: {
          operationId: "createDraft",
          summary:
            "Create an editorial draft (newsletter, social or website review). Never publishes or sends.",
          security: [{ writeBearer: [] }],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["kind", "title"],
                  properties: {
                    kind: {
                      type: "string",
                      enum: ["NEWSLETTER", "SOCIAL", "WEBSITE_REVIEW"],
                    },
                    title: { type: "string", maxLength: 200 },
                    campaignId: { type: "string", nullable: true },
                    seriesId: { type: "string", nullable: true },
                    websiteId: { type: "string", nullable: true },
                    subject: { type: "string" },
                    preheader: { type: "string" },
                    body: { type: "string" },
                    audience: { type: "string" },
                    variants: { type: "array", items: { type: "object" } },
                    newsletter: { type: "object" },
                    website: { type: "object" },
                    idempotencyKey: {
                      type: "string",
                      minLength: 8,
                      maxLength: 128,
                      description:
                        "Optional key to avoid creating duplicate drafts",
                    },
                  },
                },
              },
            },
          },
          responses: {
            "201": jsonObject,
            "200": {
              description: "Idempotent replay of an earlier create",
              content: jsonObject.content,
            },
            ...errorResponses,
          },
        },
      },
      "/api/integrations/gpt/drafts/{id}": {
        get: {
          operationId: "getDraft",
          summary: "Read one draft (write token or read token + share/grant)",
          security: [{ writeBearer: [] }, { connectorBearer: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
          ],
          responses: {
            "200": jsonObject,
            ...errorResponses,
          },
        },
        patch: {
          operationId: "updateDraft",
          summary:
            "Update an existing draft with optimistic locking. Resets status to DRAFT. No publish/send/delete.",
          security: [{ writeBearer: [] }],
          parameters: [
            {
              name: "id",
              in: "path",
              required: true,
              schema: { type: "string" },
            },
            {
              name: "If-Match",
              in: "header",
              required: false,
              schema: { type: "string" },
              description: "Must match expectedVersion when provided",
            },
          ],
          requestBody: {
            required: true,
            content: {
              "application/json": {
                schema: {
                  type: "object",
                  additionalProperties: false,
                  required: ["expectedVersion"],
                  properties: {
                    expectedVersion: { type: "integer", minimum: 1 },
                    title: { type: "string" },
                    subject: { type: "string" },
                    preheader: { type: "string" },
                    body: { type: "string" },
                    audience: { type: "string" },
                    variants: { type: "array", items: { type: "object" } },
                    newsletter: { type: "object" },
                    website: { type: "object" },
                  },
                },
              },
            },
          },
          responses: {
            "200": jsonObject,
            ...errorResponses,
          },
        },
      },
    },
    components: {
      securitySchemes: {
        connectorBearer: {
          type: "http",
          scheme: "bearer",
          description:
            "CHATGPT_CONNECTOR_TOKEN (read-only). Never expose in the StudioONE browser UI or plugin package.",
        },
        writeBearer: {
          type: "http",
          scheme: "bearer",
          description:
            "CHATGPT_CONNECTOR_WRITE_TOKEN (draft writes only). Separate from the read-only token. Never embed in plugin packages.",
        },
      },
    },
  };
}
