import { PrismaClient } from "@prisma/client";
const globalDb = globalThis as unknown as { db?: PrismaClient };
const datasourceUrl = process.env.DATABASE_URL
  ? new URL(process.env.DATABASE_URL)
  : undefined;
if (process.env.DATABASE_CONNECTION_LIMIT) {
  const limit = Number(process.env.DATABASE_CONNECTION_LIMIT);
  if (!Number.isInteger(limit) || limit < 1 || limit > 10)
    throw new Error("DATABASE_CONNECTION_LIMIT muss 1 bis 10 sein.");
  datasourceUrl?.searchParams.set("connection_limit", String(limit));
}
export const db =
  globalDb.db ??
  new PrismaClient({ datasourceUrl: datasourceUrl?.toString() });
if (process.env.NODE_ENV !== "production") globalDb.db = db;
