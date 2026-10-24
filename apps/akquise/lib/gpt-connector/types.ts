export const GPT_ENTITY_TYPES = [
  "CAMPAIGN",
  "SERIES",
  "CONTENT",
  "CONCEPT",
  "LIBRARY",
] as const;
export type GptEntityType = (typeof GPT_ENTITY_TYPES)[number];

/** Entities that may receive explicit ChatGPT write grants. */
export const GPT_WRITE_ENTITY_TYPES = ["CAMPAIGN", "SERIES", "WEBSITE"] as const;
export type GptWriteEntityType = (typeof GPT_WRITE_ENTITY_TYPES)[number];

export type GptScopes = {
  projects: boolean;
  campaigns: boolean;
  concepts: boolean;
  content: boolean;
  /** Opt-in. Missing/false keeps the connector read-only. */
  write_drafts: boolean;
};

export const defaultScopes = (): GptScopes => ({
  projects: true,
  campaigns: true,
  concepts: true,
  content: true,
  write_drafts: false,
});

export type GptConnectorStatus = {
  tokenConfigured: boolean;
  writeTokenConfigured: boolean;
  revoked: boolean;
  connected: boolean;
  writeDraftsEnabled: boolean;
  scopes: GptScopes;
  lastAccessAt: string | null;
  lastWriteAccessAt: string | null;
  shares: Array<{
    entityType: GptEntityType;
    entityId: string;
    title: string;
    sharedAt: string;
  }>;
  writeGrants: Array<{
    entityType: GptWriteEntityType;
    entityId: string;
    title: string;
    grantedAt: string;
  }>;
  shareCandidates: {
    campaigns: Array<{ id: string; title: string; shared: boolean }>;
    projects: Array<{ id: string; title: string; shared: boolean }>;
    concepts: Array<{ id: string; title: string; shared: boolean }>;
    contents: Array<{ id: string; title: string; shared: boolean }>;
  };
  writeCandidates: {
    campaigns: Array<{ id: string; title: string; granted: boolean }>;
    projects: Array<{ id: string; title: string; granted: boolean }>;
    websites: Array<{ id: string; title: string; granted: boolean }>;
  };
};
