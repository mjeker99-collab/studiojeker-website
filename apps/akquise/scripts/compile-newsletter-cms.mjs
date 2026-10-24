// Shared field contract: regenerate after adding an immutable newsletter layout.
import { readFileSync, writeFileSync } from "node:fs";
const library = JSON.parse(
  readFileSync(
    new URL("../templates/newsletter-library.json", import.meta.url),
  ),
);
const manifest = library.map((t) => ({
  id: t.id,
  type: "studiooneNewsletter_" + t.id.replaceAll("-", "_"),
  name: t.name,
  subject: t.subject,
  preheader: t.preheader,
  note: t.note,
  fields: t.slots
    .filter((s) => !s.special)
    .map((s, i) => ({
      name: "field_" + i,
      key: s.key,
      region: s.region,
      kind: s.kind,
      value: s.value,
    })),
}));
writeFileSync(
  new URL("../templates/newsletter-cms.json", import.meta.url),
  JSON.stringify(manifest, null, 2) + "\n",
);
