export type TaskDestination = "Kampagnen" | "Social Media" | "Newsletter" | "Website" | "Kontakte/Akquise" | "Strategie & Konzepte" | "Content-Studio";
export function routeMarketingTask(input: string): TaskDestination {
  const text = input.toLocaleLowerCase("de-CH");
  if (/newsletter|rundmail|mailing|kundenmail|e-mail.?newsletter/.test(text)) return "Newsletter";
  if (/website|webseite|homepage|landingpage|landing.page|internetseite|web.?text/.test(text)) return "Website";
  if (/social.media|instagram|linkedin|facebook|post(s|ing)?\b|reel(s)?\b/.test(text)) return "Social Media";
  if (/kontakt(e|liste)?|akquise|leads?|adressen|kunden anschreiben|personalisierte mail/.test(text)) return "Kontakte/Akquise";
  if (/konzept|strategie|positionierung|marketingplan/.test(text)) return "Strategie & Konzepte";
  if (/bild(er)?|video(s)?|foto(s)?|grafik(en)?|animation/.test(text)) return "Content-Studio";
  return "Kampagnen";
}
