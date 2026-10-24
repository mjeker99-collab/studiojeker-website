import type { NextConfig } from "next";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL(".", import.meta.url));
const development = process.env.NODE_ENV === "development";
const config: NextConfig = {
  agentRules: false,
  experimental: { useTypeScriptCli: false },
  poweredByHeader: false,
  output: "standalone",
  outputFileTracingRoot: root,
  turbopack: { root },
  serverExternalPackages: ["exceljs", "sharp", "archiver"],
  outputFileTracingIncludes: { "/*": ["./brand/**"] },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "same-origin" },
          {
            key: "Content-Security-Policy",
            value: `default-src 'self'; script-src 'self' 'unsafe-inline'${development ? " 'unsafe-eval'" : ""}; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self'${development ? " ws: wss:" : ""}; object-src 'none'; frame-ancestors 'none'; form-action 'self'; base-uri 'self'`,
          },
        ],
      },
      {
        source: "/api/:path*",
        headers: [{ key: "Cache-Control", value: "no-store, private" }],
      },
    ];
  },
};
export default config;
