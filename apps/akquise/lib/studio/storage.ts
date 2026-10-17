import {
  S3Client,
  GetObjectCommand,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { mkdir, readFile, writeFile, unlink } from "node:fs/promises";
import { resolve } from "node:path";
import { studioConfig } from "./config";
import { PolicyError } from "../policy";
export interface ObjectStore {
  put(key: string, data: Buffer, mime: string): Promise<void>;
  get(key: string): Promise<Buffer>;
  remove(key: string): Promise<void>;
}
export function objectStore(): ObjectStore {
  const mode = studioConfig().storage;
  if (mode === "DISCONNECTED")
    throw new PolicyError(
      "Privater Bildspeicher: Nicht verbunden. S3-Konfiguration ergänzen.",
      503,
    );
  if (mode === "LOCAL") {
    const root = resolve(process.cwd(), ".local/studio-assets");
    const path = (key: string) => {
      if (!/^studiojeker\/[a-f0-9-]+$/.test(key))
        throw new Error("Ungültiger Objektschlüssel");
      return resolve(root, key);
    };
    return {
      async put(k, b) {
        const p = path(k);
        await mkdir(resolve(p, ".."), { recursive: true, mode: 0o700 });
        await writeFile(p, b, { mode: 0o600 });
      },
      get: (k) => readFile(path(k)),
      remove: (k) => unlink(path(k)),
    };
  }
  const endpoint = new URL(process.env.STUDIO_S3_ENDPOINT!);
  if (endpoint.protocol !== "https:" || endpoint.username || endpoint.password)
    throw new Error("S3_ENDPOINT benötigt HTTPS ohne Zugangsdaten");
  const client = new S3Client({
    endpoint: endpoint.toString(),
    region: process.env.STUDIO_S3_REGION || "auto",
    maxAttempts: 1,
    credentials: {
      accessKeyId: process.env.STUDIO_S3_ACCESS_KEY_ID!,
      secretAccessKey: process.env.STUDIO_S3_SECRET_ACCESS_KEY!,
    },
    requestHandler: { requestTimeout: 20000, connectionTimeout: 5000 },
  });
  const Bucket = process.env.STUDIO_S3_BUCKET!;
  return {
    async put(Key, Body, ContentType) {
      await client.send(
        new PutObjectCommand({ Bucket, Key, Body, ContentType }),
      );
    },
    async get(Key) {
      const r = await client.send(new GetObjectCommand({ Bucket, Key }));
      return Buffer.from(await r.Body!.transformToByteArray());
    },
    async remove(Key) {
      await client.send(new DeleteObjectCommand({ Bucket, Key }));
    },
  };
}
