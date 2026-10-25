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
  return {
    openapi: "3.1.0",
    info: {
      title: "StudioONE ChatGPT Read-Only Connector",
      version: "1.0.0",
      description:
        "Read-only access to explicitly shared StudioONE projects, campaigns, concepts and editorial drafts. No contacts, credentials, SMTP or send actions.",
    },
    servers: [{ url: server }],
    paths: {
      "/api/integrations/gpt/projects": {
        get: {
          operationId: "listProjects",
          summary: "List shared StudioONE projects (content series)",
          security: [{ connectorBearer: [] }],
          responses: {
            "200": {
              description: "Shared projects",
              content: {
                "application/json": {
                  schema: { type: "object", additionalProperties: true },
                },
              },
            },
            "401": { description: "Unauthorized" },
            "403": { description: "Revoked or scope disabled" },
            "429": { description: "Rate limited" },
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
            "200": {
              description: "Project detail",
              content: {
                "application/json": {
                  schema: { type: "object", additionalProperties: true },
                },
              },
            },
            "404": { description: "Not shared or missing" },
          },
        },
      },
      "/api/integrations/gpt/campaigns": {
        get: {
          operationId: "listCampaigns",
          summary: "List shared marketing campaigns",
          security: [{ connectorBearer: [] }],
          responses: {
            "200": {
              description: "Shared campaigns",
              content: {
                "application/json": {
                  schema: { type: "object", additionalProperties: true },
                },
              },
            },
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
            "200": {
              description: "Campaign detail",
              content: {
                "application/json": {
                  schema: { type: "object", additionalProperties: true },
                },
              },
            },
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
            "200": {
              description: "Search hits",
              content: {
                "application/json": {
                  schema: { type: "object", additionalProperties: true },
                },
              },
            },
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
            "CHATGPT_CONNECTOR_TOKEN from Render. Never expose this value in the StudioONE browser UI.",
        },
      },
    },
  };
}
