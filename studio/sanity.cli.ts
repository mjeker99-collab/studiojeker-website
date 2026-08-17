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
  deployment: {
    // Assigned on first `sanity deploy` to https://studiojeker.sanity.studio
    appId: "ofbist72j0e7x9uewc5py90y",
  },
  vite: (config) => ({
    ...config,
    server: {
      ...config.server,
      // Allow ephemeral Cloudflare preview tunnels during Cloud Agent testing.
      allowedHosts: true,
    },
  }),
});
