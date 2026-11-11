// Render Cron: read-only source (Google Sheets) -> additive StudioONE contacts.
// This script must never create mail approvals, release drafts, or send emails.
// Required env: INTERNAL_CONTACT_SYNC_TOKEN (secret), STUDIOONE_SYNC_ENDPOINT.
const endpoint = process.env.STUDIOONE_SYNC_ENDPOINT ||
  "https://studiojeker-akquise.onrender.com/api/internal/contact-sync";
const secret = process.env.INTERNAL_CONTACT_SYNC_TOKEN || "";
if (!secret) {
  console.error("StudioONE contact sync: cron token is not configured.");
  process.exit(1);
}
const url = new URL(endpoint);
if (url.protocol !== "https:" ||
    url.hostname !== "studiojeker-akquise.onrender.com" ||
    url.pathname !== "/api/internal/contact-sync") {
  console.error("StudioONE contact sync: unexpected endpoint, refusing to send credentials.");
  process.exit(1);
}
try {
  const response = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${secret}` },
    redirect: "error",
    signal: AbortSignal.timeout(120000),
  });
  if (!response.ok) throw new Error(`StudioONE contact sync returned HTTP ${response.status}`);
  const data = await response.json();
  if (data?.ok !== true ||
      !Number.isInteger(data.imported) ||
      !Number.isInteger(data.duplicates)) {
    throw new Error("StudioONE contact sync returned an invalid result.");
  }
  console.log(`Masterlist sync successful: ${data.imported} new; ${data.duplicates} already imported.`);
} catch (error) {
  console.error("Masterlist sync failed:", String(error));
  process.exitCode = 1;
}
