import { defineCliConfig } from "sanity/cli";

/**
 * Standalone Studio CLI — project tgx6e6jg / dataset production.
 * Deployed via `sanity deploy`, never via Next.js /out → Metanet.
 */
export default defineCliConfig({
  api: {
    projectId: "tgx6e6jg",
    dataset: "production",
  },
  studioHost: "studiojeker",
  vite: (config) => ({
    ...config,
    server: {
      ...config.server,
      // Allow ephemeral Cloudflare preview tunnels during Cloud Agent testing.
      allowedHosts: true,
    },
  }),
});
