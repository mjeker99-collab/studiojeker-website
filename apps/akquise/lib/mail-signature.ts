// Approved by Martin on 20 October 2026. No role/title requested.
// Asset hashes bind the exact original images to the reviewed message.
export const signatureAssets = [
  {
    file: "logo.png",
    width: 180,
    height: 83,
    type: "image/png",
    cid: "studiojeker-logo@signature",
    sha256: "7ce16caa2740f34913617dcadc5dbd79a5e9d12b3055209e6b946d578b2cffb7",
  },
  {
    file: "nora.jpg",
    width: 160,
    height: 90,
    type: "image/jpeg",
    cid: "nora-jeker@signature",
    sha256: "ce28fd86d1647135d6a120bfcf1457db2b38bb32cfe905b4a4deb3af49338d49",
  },
] as const;

const signatureText =
  "Nora Jeker\nStudiojeker GmbH\nHauptstrasse 73\nCH-4528 Zuchwil\n+41 78 601 78 85\nnjeker@studiojeker.ch\nstudiojeker.ch\nWE CREATE VISIBILITY.";
const escapeHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );

// Only replace a known Nora closing, preserving all following custom/opt-out text.
export function signatureParts(body: string) {
  const normalized = body.replace(/\r\n?/g, "\n").trim();
  const match =
    /(?:^|\n)(Freundliche Grüsse|Freundliche Grüße|Mit freundlichen Grüssen|Mit freundlichen Grüßen)\s*\n+Nora Jeker[ \t]*(?:\n|$)/i.exec(
      normalized,
    );
  if (!match) return { before: normalized, after: "" };
  const before = normalized.slice(0, match.index).trimEnd() + "\n\n" + match[1];
  const tail = normalized.slice(match.index + match[0].length).split("\n");
  const known =
    /^(?:Studiojeker(?: GmbH|\s*[–—-]\s*We create visibility\.?)?|(?:https?:\/\/)?(?:www\.)?studiojeker\.ch\/?|njeker@studiojeker\.ch|WE CREATE VISIBILITY\.?|Hauptstrasse 73|CH-4528 Zuchwil|\+41 78 601 78 85)$/i;
  while (tail.length && (!tail[0].trim() || known.test(tail[0].trim())))
    tail.shift();
  return { before: before.trim(), after: tail.join("\n").trim() };
}

export function signedMessage(body: string, preview = false) {
  const { before, after } = signatureParts(body);
  const src = (index: number) =>
    preview
      ? `/brand/mail/${signatureAssets[index].file}?v=${signatureAssets[index].sha256}-${signatureAssets[index].width}x${signatureAssets[index].height}`
      : `cid:${signatureAssets[index].cid}`;
  const block = (value: string) =>
    `<div style="margin:0 0 20px;line-height:1.6;overflow-wrap:anywhere">${escapeHtml(value).replace(/\n/g, "<br>")}</div>`;
  const textStyle =
    "font-family:Arial,Helvetica,sans-serif;font-size:14px;line-height:21px;color:#333333;-webkit-text-size-adjust:100%;";
  const image = (index: number, alt: string) => {
    const asset = signatureAssets[index];
    return `<img src="${src(index)}" alt="${alt}" width="${asset.width}" height="${asset.height}" border="0" style="display:block;border:0;outline:none;width:${asset.width}px;height:${asset.height}px;max-width:${asset.width}px">`;
  };
  const signature = `<table role="presentation" width="240" align="left" cellpadding="0" cellspacing="0" border="0" style="width:240px;max-width:100%;table-layout:fixed;border-collapse:collapse;${textStyle}">
<tr><td width="240" style="width:240px;padding:0 0 10px;border:0;${textStyle}">${image(1, "Nora Jeker")}</td></tr>
<tr><td width="240" style="width:240px;padding:0 0 12px;border:0;${textStyle}"><font face="Arial,Helvetica,sans-serif" size="3" style="${textStyle}"><strong style="font-size:16px;line-height:24px">Nora Jeker</strong><br>Studiojeker GmbH<br>Hauptstrasse 73<br>CH-4528 Zuchwil<br><a href="tel:+41786017885" style="${textStyle}text-decoration:underline">+41 78 601 78 85</a><br><a href="mailto:njeker@studiojeker.ch" style="${textStyle}text-decoration:underline">njeker@studiojeker.ch</a><br><a href="https://studiojeker.ch" style="${textStyle}text-decoration:underline">studiojeker.ch</a></font></td></tr>
<tr><td width="240" style="width:240px;padding:0 0 8px;border:0;${textStyle}"><a href="https://studiojeker.ch">${image(0, "Studiojeker")}</a></td></tr>
<tr><td width="240" style="width:240px;padding:0 0 20px;border:0;${textStyle}"><font face="Arial,Helvetica,sans-serif" size="3" style="font-size:13px;line-height:20px;font-weight:bold;color:#333333">WE CREATE VISIBILITY.</font></td></tr></table><div style="clear:both"></div>`;
  return {
    text: [before, signatureText, after].filter(Boolean).join("\n\n"),
    html: `<div style="background:#ffffff;color:#333333;font-family:Arial,Helvetica,sans-serif;font-size:15px;line-height:1.6;text-align:left">${block(before)}${signature}${after ? block(after) : ""}</div>`,
  };
}
