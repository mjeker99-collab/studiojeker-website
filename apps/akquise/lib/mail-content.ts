// A small, deliberately restricted format: named web links and managed images.
// No user HTML is executed. The original body (including asset IDs) is versioned.
export const escapeMailHtml = (value: string) =>
  value.replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ]!,
  );
export function mailUrl(value: string) {
  const url = new URL(
    /^https?:\/\//i.test(value.trim())
      ? value.trim()
      : `https://${value.trim()}`,
  );
  if (
    !["http:", "https:"].includes(url.protocol) ||
    url.username ||
    url.password ||
    !url.hostname.includes(".") ||
    /[\s<>"()]/.test(value)
  )
    throw new Error(
      "Bitte einen vollständigen Weblink eingeben, z. B. https://studiojeker.ch/work.",
    );
  return url.href;
}
const tokens =
  /!\[([^\]\n]{0,200})\]\(\/api\/studio\/assets\/([a-f0-9-]{36})\)|\[([^\]\n]{1,200})\]\((https?:\/\/[^\s)]+)\)/g;
export function mailImageIds(body: string) {
  return [
    ...new Set([...body.matchAll(tokens)].flatMap((m) => (m[2] ? [m[2]] : []))),
  ];
}
export function renderMailContent(body: string, preview = false) {
  let html = "",
    text = "",
    offset = 0;
  for (const m of body.matchAll(tokens)) {
    let before = body.slice(offset, m.index);
    let linkedUrl = "",
      extra = 0;
    const tail = body.slice(m.index! + m[0].length);
    const linked =
      m[2] && before.endsWith("[")
        ? /^\]\((https?:\/\/[^\s)]+)\)/.exec(tail)
        : null;
    if (linked) {
      try {
        linkedUrl = mailUrl(linked[1]);
        before = before.slice(0, -1);
        extra = linked[0].length;
      } catch {
        /* Display invalid markup as text. */
      }
    }
    html += escapeMailHtml(before).replace(/\n/g, "<br>");
    text += before;
    if (m[2]) {
      const src = preview
        ? `/api/studio/assets/${m[2]}`
        : `cid:mail-${m[2]}@studioone`;
      const image = `<img src="${src}" alt="${escapeMailHtml(m[1])}" width="520" border="0" style="display:block;width:520px;max-width:100%;height:auto;border:0;margin:16px 0">`;
      html += linkedUrl
        ? `<a href="${escapeMailHtml(linkedUrl)}">${image}</a>`
        : image;
      text += linkedUrl
        ? `Bild: ${m[1]} (${linkedUrl})`
        : m[1]
          ? `[Bild: ${m[1]}]`
          : "[Bild]";
    } else {
      try {
        const url = mailUrl(m[4]);
        html += `<a href="${escapeMailHtml(url)}" style="color:#007a99;text-decoration:underline">${escapeMailHtml(m[3])}</a>`;
        text += `${m[3]} (${url})`;
      } catch {
        html += escapeMailHtml(m[0]);
        text += m[0];
      }
    }
    offset = m.index! + m[0].length + extra;
  }
  html += escapeMailHtml(body.slice(offset)).replace(/\n/g, "<br>");
  text += body.slice(offset);
  return { html, text };
}
export function appendMailContent(body: string, addition: string) {
  const closing =
    /(?:^|\n)(?:Freundliche Grüsse|Freundliche Grüße|Mit freundlichen Grüssen|Mit freundlichen Grüßen)/i.exec(
      body,
    );
  const at = closing ? closing.index : body.length;
  return `${body.slice(0, at).trimEnd()}\n\n${addition.trim()}\n\n${body.slice(at).trimStart()}`.trim();
}
