import { appOrigin } from "../config.mjs";

export function socialSetup(env = process.env) {
  const sandbox = env.STUDIOONE_TEST_SANDBOX === "true";
  const encryption = /^[a-f0-9]{64}$/i.test(
    env.SOCIAL_TOKEN_ENCRYPTION_KEY || "",
  );
  return Object.fromEntries(
    (["meta", "linkedin"] as const).map((provider) => {
      const prefix = provider === "meta" ? "META" : "LINKEDIN";
      const checks = [
        {
          key: `${prefix}_CLIENT_ID`,
          ready: Boolean(env[`${prefix}_CLIENT_ID`]?.trim()),
        },
        {
          key: `${prefix}_CLIENT_SECRET`,
          ready: Boolean(env[`${prefix}_CLIENT_SECRET`]?.trim()),
        },
        { key: "SOCIAL_TOKEN_ENCRYPTION_KEY", ready: encryption },
      ];
      return [
        provider,
        {
          configured: !sandbox && checks.every((c) => c.ready),
          sandbox,
          checks,
          redirectUri: `${appOrigin(env)}/api/social/${provider}/callback`,
        },
      ];
    }),
  ) as Record<
    "meta" | "linkedin",
    {
      configured: boolean;
      sandbox: boolean;
      checks: { key: string; ready: boolean }[];
      redirectUri: string;
    }
  >;
}
