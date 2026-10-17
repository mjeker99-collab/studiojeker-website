// Explicit operator-only connection check; touches only one newly generated test object.
import { randomUUID, createHash } from "node:crypto";
import { objectStore } from "../lib/studio/storage";
import { studioConfig } from "../lib/studio/config";
if (studioConfig().storage !== "S3")
  throw new Error("S3 nicht vollständig konfiguriert. Kein Test gestartet.");
const store = objectStore(),
  key = `studiojeker/${randomUUID()}`,
  bytes = Buffer.from(`StudioONE storage connection check ${randomUUID()}`);
try {
  await store.put(key, bytes, "text/plain");
  const received = await store.get(key);
  if (
    createHash("sha256").update(received).digest("hex") !==
    createHash("sha256").update(bytes).digest("hex")
  )
    throw new Error("Prüfsumme falsch.");
  console.log(
    "S3: Schreiben und privates Lesen mit identischer Prüfsumme erfolgreich.",
  );
} finally {
  await store.remove(key);
  console.log("Testobjekt entfernt.");
}
