import { SOLOTHURN_CENTER } from "./geo";
import { defaultIndustries } from "./sources";
import { LEAD_RESEARCH_DEFAULTS, type ResearchConfig } from "./types";

function numberFrom(env: NodeJS.ProcessEnv, name: string, fallback: number, min: number, max: number): number {
  const raw = env[name];
  if (!raw) return fallback;
  const value = Number(raw);
  if (!Number.isFinite(value) || value < min || value > max) return fallback;
  return value;
}

export function leadResearchEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  return env.LEAD_RESEARCH_ENABLED === "true";
}

export function researchConfig(env: NodeJS.ProcessEnv = process.env, override?: Partial<ResearchConfig>): ResearchConfig {
  const promo = env.LEAD_RESEARCH_PROMO_UNTIL || LEAD_RESEARCH_DEFAULTS.promoUntil;
  const config: ResearchConfig = {
    regionLabel: LEAD_RESEARCH_DEFAULTS.regionLabel,
    center: SOLOTHURN_CENTER,
    radiusKm: numberFrom(env, "LEAD_RESEARCH_RADIUS_KM", LEAD_RESEARCH_DEFAULTS.radiusKm, 1, 50),
    target: numberFrom(env, "LEAD_RESEARCH_DAILY_TARGET", LEAD_RESEARCH_DEFAULTS.target, 1, 200),
    audience: LEAD_RESEARCH_DEFAULTS.audience,
    employeeMin: LEAD_RESEARCH_DEFAULTS.employeeMin,
    employeeMax: LEAD_RESEARCH_DEFAULTS.employeeMax,
    industries: defaultIndustries(),
    priceChf: numberFrom(env, "LEAD_RESEARCH_PRICE_CHF", LEAD_RESEARCH_DEFAULTS.priceChf, 1, 100000),
    promoUntil: /^\d{4}-\d{2}-\d{2}$/.test(promo) ? promo : LEAD_RESEARCH_DEFAULTS.promoUntil,
    maxCostUsd: numberFrom(env, "LEAD_RESEARCH_MAX_COST_USD", 5, 0, 100),
    maxRuntimeMinutes: numberFrom(env, "LEAD_RESEARCH_MAX_RUNTIME_MINUTES", 240, 1, 1440),
    maxFetches: numberFrom(env, "LEAD_RESEARCH_MAX_FETCHES", 800, 1, 5000),
    passes: 2,
    allowTeamMailbox: env.LEAD_RESEARCH_ALLOW_TEAM_MAILBOX === "true",
    blockSize: 10,
    minIntervalMs: numberFrom(env, "LEAD_RESEARCH_MIN_INTERVAL_MS", 1500, 0, 60_000),
  };
  if (!override) return config;
  return {
    ...config,
    regionLabel: (override.regionLabel || config.regionLabel).replace(/[\r\n]/g, " ").trim().slice(0, 80),
    radiusKm: clamp(override.radiusKm, 1, 50, config.radiusKm),
    target: clamp(override.target, 1, 200, config.target),
    audience: (override.audience || config.audience).replace(/[\r\n]/g, " ").trim().slice(0, 120),
    employeeMin: clamp(override.employeeMin, 1, 500, config.employeeMin),
    employeeMax: clamp(override.employeeMax, 1, 500, config.employeeMax),
  };
}

function clamp(value: number | undefined, min: number, max: number, fallback: number): number {
  if (typeof value !== "number" || !Number.isFinite(value)) return fallback;
  return Math.min(max, Math.max(min, Math.round(value)));
}
