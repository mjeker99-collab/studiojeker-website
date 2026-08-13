# Sanity Homepage content migration

Version 1.0

---

## Scope

Migrate **German Homepage** editorial fields into the existing Sanity Homepage
singleton. Content only — the marketing homepage remains hardcoded in
`lib/content/homepage.ts` / `components/home/*`.

Out of scope: About, Services, Work, Team, Clients, Global Settings, frontend
wiring, design/layout/CSS changes.

---

## Existing document (preserve — do not duplicate)

| | |
| --- | --- |
| Document ID | `b5bb69d5-b05a-49be-b453-bf9bcd68ecb1` |
| Type | `homepage` |
| Studio desk | Homepage singleton (see `studio/structure.ts`) |
| Project / dataset | `tgx6e6jg` / `production` |

---

## Field mapping (DE → Sanity)

Source: `lib/content/homepage.ts` when `locale !== "en"` (German default).

| Sanity field | German website source | Value / notes |
| --- | --- | --- |
| `heroHeadline` | `hero.headline` + `hero.headlineAccent` | `We create visibility.` |
| `introText` | `hero.subheadline` + `hero.body[0]` | Combined into one field (schema has no separate subheadline) |
| `heroImage` | `hero.media.src` | Upload `public/images/architecture/Architekturvisualisierung.jpg` |
| `heroVideoUrl` | — | Unset (hero is image-only today) |
| `mainIntroHeadline` | `about.headline` + `about.headlineAccent` | Homepage About block maps to schema “Introduction” |
| `mainIntroText` | `about.body[0]` | |
| `servicesSectionHeadline` | `services.headline` | `Unsere Leistungen` |
| `servicesIntro` | — | Unset (no dedicated intro paragraph) |
| `workSectionHeadline` | `projects.headline` | `Ausgewählte Projekte` |
| `workIntro` | — | Unset (no dedicated intro paragraph) |
| `ctaHeadline` | `finalCta` parts joined | `Lassen Sie uns gemeinsam Sichtbarkeit schaffen.` |
| `ctaText` | `finalCta.text` | `Wir freuen uns auf Ihr Projekt.` |
| `ctaLabel` | `finalCta.cta.label` | `Jetzt Kontakt aufnehmen` |
| `seoTitle` | `seo.title` | |
| `seoDescription` | `seo.description` | |

Studio navigation order is unchanged:
Homepage → About → Services → Work / Projects → Team → Clients / Logos → Global Settings.

---

## How to run

Requires Cloud / local secret (never commit; never print):

```bash
# SANITY_API_WRITE_TOKEN must be set in the environment
npm run sanity:migrate-homepage
```

The script:

1. Confirms the existing Homepage document ID
2. Uploads the hero JPEG as a Sanity image asset
3. Patches the existing document (no create)
4. Reads published fields back and asserts values

---

## Safety

- Does not connect `HomePage` / routes to Sanity
- Keeps `/sanity-test` working (reads `heroHeadline`, `introText`, `heroImage`)
- Does not change layout, styling, components, animations, or responsive behaviour
