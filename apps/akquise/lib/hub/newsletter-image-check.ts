import { PolicyError } from "../policy";
import type { ContentInput } from "./input";
import { getNewsletterTemplate } from "./newsletter-template";

// A GPT edit must never accept a guessed image URL merely because it is HTTPS.
// Restrict server-side checks to established asset hosts to prevent SSRF.
function supportedImageUrl(value: string) {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  if (
    url.protocol !== "https:" ||
    url.username ||
    url.password ||
    url.port ||
    url.hash
  )
    return null;
  const hostname = url.hostname.toLowerCase();
  if (
    hostname === "raw.githubusercontent.com" &&
    /^\/mjeker99-collab\/studiojeker-website\/[^/]+\/.+/i.test(url.pathname)
  )
    return url;
  if (
    hostname === "mcusercontent.com" ||
    hostname.endsWith(".mcusercontent.com") ||
    hostname.endsWith(".mailchimp.com") ||
    hostname === "studiojeker.ch" ||
    hostname === "www.studiojeker.ch"
  )
    return url;
  return null;
}

const unavailableMessage =
  "Das gewünschte Bild konnte nicht nachgewiesen werden. Die Newsletter-Version wurde nicht geändert. " +
  "Bitte ein vorhandenes Bild aus der Bibliothek wählen oder im Newsletter-Editor hochladen.";

export async function verifyNewsletterImageChanges(
  source: ContentInput,
  next: ContentInput,
  fetcher: typeof fetch = fetch,
) {
  if (!source.newsletter || !next.newsletter) return;
  const template = getNewsletterTemplate(source.newsletter.templateId);
  const changed = template.slots.filter(
    (slot) =>
      !slot.special &&
      slot.kind === "image" &&
      source.newsletter!.fields[slot.key] !== next.newsletter!.fields[slot.key],
  );
  await Promise.all(
    changed.map(async (slot) => {
      const imageUrl = supportedImageUrl(next.newsletter!.fields[slot.key]);
      if (!imageUrl) throw new PolicyError(unavailableMessage, 422);
      try {
        const result = await fetcher(imageUrl.href, {
          method: "HEAD",
          redirect: "manual",
          signal: AbortSignal.timeout(6000),
          headers: { accept: "image/*" },
        });
        if (!result.ok || !result.headers.get("content-type")?.toLowerCase().startsWith("image/"))
          throw new Error("Missing image");
      } catch {
        throw new PolicyError(unavailableMessage, 422);
      }
    }),
  );
}
