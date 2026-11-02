import assert from "node:assert/strict";
import {
  appendMailContent,
  mailUrl,
  mailImageIds,
  renderMailContent,
} from "../lib/mail-content";
import { signedMessage } from "../lib/mail-signature";
const id = "12345678-1234-1234-1234-123456789abc";
const content = `![Projekt & Team](/api/studio/assets/${id})\n\n[Projekt ansehen](https://studiojeker.ch/work?a=1&b=2)`;
const body = appendMailContent(
  "Guten Tag Frau Test\n\nPersönlicher Absatz\n\nFreundliche Grüsse\nNora Jeker\n\nKeine weiteren Mails? Antworten genügt.",
  content,
);
assert.equal(body.indexOf("Persönlicher Absatz") < body.indexOf(content), true);
assert.equal(body.indexOf(content) < body.indexOf("Freundliche Grüsse"), true);
assert.deepEqual(mailImageIds(body), [id]);
assert.match(signedMessage(body).html, /cid:mail-12345678/);
assert.match(signedMessage(body, true).html, /src="\/api\/studio\/assets/);
assert.match(signedMessage(body).html, /width="520"/);
assert.match(
  signedMessage(body).html,
  /href="https:\/\/studiojeker.ch\/work\?a=1&amp;b=2"/,
);
assert.match(signedMessage(body).text, /Projekt ansehen \(https:/);
assert.match(signedMessage(body).text, /Keine weiteren Mails/);
assert.doesNotMatch(
  renderMailContent("[x](javascript:alert) <script>bad</script>").html,
  /<script>|href="javascript:/,
);
assert.throws(() => mailUrl("https://user:pass@example.com"));
assert.equal(mailUrl("studiojeker.ch/work"), "https://studiojeker.ch/work");
assert.equal(renderMailContent("hello\nworld").html, "hello<br>world");
console.log(
  "Mail content: personalised text, signature, safe links, CID preview and width passed",
);

assert.match(
  renderMailContent(
    `[![Bild](/api/studio/assets/${id})](https://studiojeker.ch/work)`,
  ).html,
  /<a href="https:\/\/studiojeker.ch\/work"><img/,
);

const { default: sharp } = await import("sharp");
const { optimizeMailImage } = await import("../lib/mail-images");
const big = await sharp({
  create: { width: 1800, height: 900, channels: 3, background: "#007a99" },
})
  .png()
  .toBuffer();
const small = await optimizeMailImage(big);
const meta = await sharp(small).metadata();
assert.equal(meta.width, 520);
assert.equal(meta.height, 260);
assert.equal(meta.format, "jpeg");
await assert.rejects(optimizeMailImage(Buffer.from("<svg/>")));
