import { createHash } from "node:crypto";
import { z } from "zod";

export const taskTypes = [
  "NEWSLETTER_REVISE_TEXT",
  "NEWSLETTER_LAYOUT",
  "NEWSLETTER_PUBLISH",
  "NEWSLETTER_SEND",
] as const;
export type TaskType = (typeof taskTypes)[number];

export const taskInput = z
  .object({
    contentId: z.string().min(1).max(80),
    version: z.number().int().positive(),
    type: z.enum(taskTypes),
    instruction: z.string().trim().min(1).max(500),
  })
  .strict();
export type TaskInput = z.infer<typeof taskInput>;

/** Actions that must stop for an authenticated, revision-bound yes. */
export function requiresApproval(type: TaskType) {
  return type === "NEWSLETTER_PUBLISH" || type === "NEWSLETTER_SEND";
}

export function idempotencyKey(input: TaskInput & { userId: string }) {
  return createHash("sha256")
    .update(
      [
        input.userId,
        input.contentId,
        String(input.version),
        input.type,
        input.instruction,
      ].join("\0"),
    )
    .digest("hex");
}

export function backoffMs(attempt: number) {
  return Math.min(60_000, 1000 * 2 ** Math.max(0, attempt - 1));
}

export const LEASE_MS = 180_000;

export class TaskBlocked extends Error {
  constructor(message: string) {
    super(message);
    this.name = "TaskBlocked";
  }
}

export class RetryableTaskError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "RetryableTaskError";
  }
}

export type TextSlot = { key: string; text: string };

export type StoredResult = {
  proposal?: TextSlot[];
  requestId?: string | null;
  retryable?: boolean;
  version?: number;
  hash?: string;
  changedSlots?: string[];
  previewReady?: boolean;
  reviewUrl?: string;
};

export function readResult(value: unknown): StoredResult {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  const record = value as StoredResult;
  const proposal = Array.isArray(record.proposal)
    ? record.proposal.filter(
        (slot): slot is TextSlot =>
          !!slot &&
          typeof slot === "object" &&
          typeof slot.key === "string" &&
          typeof slot.text === "string",
      )
    : undefined;
  return {
    proposal,
    requestId: typeof record.requestId === "string" ? record.requestId : null,
    retryable: record.retryable === true,
    version: typeof record.version === "number" ? record.version : undefined,
    hash: typeof record.hash === "string" ? record.hash : undefined,
    changedSlots: Array.isArray(record.changedSlots)
      ? record.changedSlots.filter((key) => typeof key === "string")
      : undefined,
    previewReady: record.previewReady === true,
    reviewUrl: typeof record.reviewUrl === "string" ? record.reviewUrl : undefined,
  };
}
