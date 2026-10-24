export const GPT_ENTITY_TYPES = [
  "CAMPAIGN",
  "SERIES",
  "CONTENT",
  "CONCEPT",
  "LIBRARY",
] as const;
export type GptEntityType = (typeof GPT_ENTITY_TYPES)[number];

export type GptScopes = {
  projects: boolean;
  campaigns: boolean;
  concepts: boolean;
  content: boolean;
};

export const defaultScopes = (): GptScopes => ({
  projects: true,
  campaigns: true,
  concepts: true,
  content: true,
});

export type GptConnectorStatus = {
  tokenConfigured: boolean;
  revoked: boolean;
  connected: boolean;
  scopes: GptScopes;
  lastAccessAt: string | null;
  shares: Array<{
    entityType: GptEntityType;
    entityId: string;
    title: string;
    sharedAt: string;
  }>;
  shareCandidates: {
    campaigns: Array<{ id: string; title: string; shared: boolean }>;
    projects: Array<{ id: string; title: string; shared: boolean }>;
    concepts: Array<{ id: string; title: string; shared: boolean }>;
    contents: Array<{ id: string; title: string; shared: boolean }>;
  };
};
