import { defineField, defineType } from "sanity";
import templates from "../../apps/akquise/templates/newsletter-cms.json";

const labels: Record<string, string> = {
  text: "Text",
  image: "Bild",
  alt: "Beschreibung",
  link: "Ziel-Link",
};
export const newsletterTypes = templates.map((template) =>
  defineType({
    name: template.type,
    title: template.name,
    type: "document",
    description:
      "In Sanity bereitstellen, danach in StudioONE als Entwurf übernehmen und freigeben. Publish versendet keinen Newsletter. " +
      template.note,
    groups: [
      { name: "settings", title: "Ausgabe", default: true },
      ...[...new Set(template.fields.map((f) => f.region))].map(
        (region, i) => ({ name: `region_${i}`, title: region }),
      ),
    ],
    fields: [
      defineField({
        name: "title",
        title: "Interner Titel",
        type: "string",
        group: "settings",
        initialValue: template.name,
        validation: (r) => r.required().max(200),
      }),
      defineField({
        name: "subject",
        title: "Betreff",
        type: "string",
        group: "settings",
        initialValue: template.subject,
        validation: (r) => r.required().max(250),
      }),
      defineField({
        name: "preheader",
        title: "Vorschautext",
        type: "string",
        group: "settings",
        initialValue: template.preheader,
        validation: (r) => r.max(300),
      }),
      defineField({
        name: "audience",
        title: "Empfänger / Zielgruppensegment",
        type: "text",
        rows: 2,
        group: "settings",
        validation: (r) => r.required().max(2000),
      }),
      ...template.fields.map((f, i) => {
        const common = {
          name: f.name,
          title: `${f.region} · ${labels[f.kind]} ${i + 1}`,
          group: `region_${[...new Set(template.fields.map((s) => s.region))].indexOf(f.region)}`,
        };
        if (f.kind === "image")
          return defineField({
            ...common,
            type: "object",
            description:
              "Sanity-Bild auswählen oder öffentliche HTTPS-Bildadresse verwenden. Ein ausgewähltes Bild hat Vorrang.",
            fields: [
              defineField({
                name: "image",
                title: "Bild aus Sanity",
                type: "image",
              }),
              defineField({
                name: "url",
                title: "Öffentliche Bildadresse",
                type: "url",
                validation: (r) =>
                  r
                    .uri({ scheme: ["https"] })
                    .custom(
                      (value) =>
                        !value ||
                        value.length <= 2000 ||
                        "Bildadresse ist zu lang.",
                    ),
              }),
            ],
            initialValue: { url: f.value },
            validation: (r) =>
              r.required().custom((value) => {
                const v = value as
                  | { image?: { asset?: { _ref?: string } }; url?: string }
                  | undefined;
                return (
                  !!(v?.image?.asset?._ref || v?.url) ||
                  "Bitte Bild oder Bildadresse wählen."
                );
              }),
          });
        if (f.kind === "link")
          return defineField({
            ...common,
            type: "url",
            initialValue: f.value,
            validation: (r) =>
              r
                .required()
                .uri({ scheme: ["https"] })
                .custom(
                  (value) =>
                    !value || value.length <= 2000 || "Link ist zu lang.",
                ),
          });
        if (f.kind === "text")
          return defineField({
            ...common,
            type: "text",
            rows: f.value.length > 100 ? 4 : 2,
            initialValue: f.value,
            validation: (r) => r.max(8000),
          });
        return defineField({
          ...common,
          type: "string",
          initialValue: f.value,
          validation: (r) => r.max(500),
        });
      }),
    ],
    preview: { select: { title: "title", subtitle: "subject" } },
  }),
);
