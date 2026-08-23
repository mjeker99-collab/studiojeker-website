import type { Locale } from "@/types/i18n";
import type { HomepageClientLogo, HomepageMedia } from "@/types/homepage";
import type { ContactPageContent } from "@/lib/content/contact";
import { getContactPageContent } from "@/lib/content/contact";
import { getClientLogos } from "@/lib/content/clients";
import type {
  SanityContact,
  SanityContactClientRef,
} from "@/lib/sanity/contact";
import type {
  SanityLocalizedString,
  SanityLocalizedText,
} from "@/lib/sanity/homepage";
import { resolveSanityImage, resolveSanityMedia } from "@/lib/sanity/media";
import { pickEditorialColor } from "@/lib/sanity/editorial-color";

type Localized = SanityLocalizedString | SanityLocalizedText | null | undefined;

function clean(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

function pickLocalized(value: Localized, locale: Locale): string | undefined {
  const localized =
    locale === "en"
      ? clean(value?.en) ?? clean(value?.de)
      : clean(value?.de) ?? clean(value?.en);
  return localized;
}

function splitAroundAccent(
  full: string,
  accentWord: string | undefined,
): { before: string; accent: string; after: string } {
  const index = accentWord ? full.indexOf(accentWord) : -1;
  if (index === -1 || !accentWord) {
    return { before: full, accent: "", after: "" };
  }
  return {
    before: full.slice(0, index),
    accent: accentWord,
    after: full.slice(index + accentWord.length),
  };
}

function sortByOrder<T extends { sortOrder?: number | null }>(items: T[]): T[] {
  return [...items].sort((a, b) => {
    const aOrder = a.sortOrder ?? Number.MAX_SAFE_INTEGER;
    const bOrder = b.sortOrder ?? Number.MAX_SAFE_INTEGER;
    return aOrder - bOrder;
  });
}

function mergeClientLogos(
  base: HomepageClientLogo[],
  clients: SanityContactClientRef[] | null | undefined,
): HomepageClientLogo[] {
  const source = clients ?? [];
  const activeClients = sortByOrder(
    source.filter(
      (client): client is NonNullable<SanityContactClientRef> =>
        Boolean(client && client.active !== false && client.logo),
    ),
  );

  if (activeClients.length === 0) {
    return base;
  }

  const merged = activeClients
    .map((client, index) => {
      const name = clean(client.name ?? undefined);
      const logo = client.logo;
      if (!name || !logo) {
        return null;
      }

      const resolved = resolveSanityImage(logo, {
        src: "",
        alt: name,
        width: 160,
        height: 48,
      });

      if (!resolved.src) {
        return null;
      }

      return {
        id: client._id ?? `client-${index}`,
        name,
        src: resolved.src,
        width: resolved.width,
        height: resolved.height,
      };
    })
    .filter((logo): logo is HomepageClientLogo => Boolean(logo?.src));

  return merged.length > 0 ? merged : base;
}

const DEFAULT_HERO_MEDIA: HomepageMedia = {
  src: "/images/Social marketing/Social marketing/PHOTO-2023-05-11-15-00-27.jpg",
  alt: "Studiojeker",
  width: 1200,
  height: 900,
};

export type ResolvedContactPageContent = ContactPageContent & {
  heroMedia: HomepageMedia;
  heroVideoId?: string;
  clients: {
    label: string;
    logos: HomepageClientLogo[];
  };
};

/**
 * Pure merge of Sanity Contact document → frontend Contact content.
 * Safe for client and server. Does not fetch Sanity.
 */
export function mergeSanityContact(
  base: ContactPageContent,
  doc: SanityContact,
  locale: Locale,
  baseClientsLabel: string,
): ResolvedContactPageContent {
  const merged: ResolvedContactPageContent = {
    ...base,
    seo: { ...base.seo },
    form: { ...base.form },
    details: { ...base.details },
    secondary: { ...base.secondary },
    finalCta: { ...base.finalCta },
    heroMedia: { ...DEFAULT_HERO_MEDIA },
    clients: {
      label: baseClientsLabel,
      logos: getClientLogos(),
    },
  };

  const seoTitle = pickLocalized(doc.seoSection?.title, locale);
  if (seoTitle) merged.seo.title = seoTitle;

  const seoDescription = pickLocalized(doc.seoSection?.description, locale);
  if (seoDescription) merged.seo.description = seoDescription;

  const ogImage = resolveSanityImage(doc.seoSection?.ogImage, {
    src: "",
    alt: "",
    width: 1200,
    height: 630,
  });
  if (ogImage.src) {
    merged.seo.ogImagePath = ogImage.src;
  }

  const label = pickLocalized(doc.heroSection?.label, locale);
  if (label) merged.label = label;

  const headline = pickLocalized(doc.heroSection?.headline, locale);
  if (headline) {
    const highlightText =
      pickLocalized(doc.heroSection?.headlineHighlightText, locale) ??
      base.headlineAccent;
    const { before, accent, after } = splitAroundAccent(
      headline,
      highlightText,
    );
    merged.headlineBefore = before;
    merged.headlineAccent = accent || highlightText;
    merged.headlineAfter = after;
  }

  const headlineColor = pickEditorialColor(doc.heroSection?.headlineColor);
  if (headlineColor) merged.headlineColor = headlineColor;

  const headlineHighlightColor = pickEditorialColor(
    doc.heroSection?.headlineHighlightColor,
  );
  if (headlineHighlightColor) {
    merged.headlineHighlightColor = headlineHighlightColor;
  }

  const subheadline = pickLocalized(doc.heroSection?.subheadline, locale);
  if (subheadline) merged.subheadline = subheadline;

  const subheadlineColor = pickEditorialColor(doc.heroSection?.subheadlineColor);
  if (subheadlineColor) merged.subheadlineColor = subheadlineColor;

  const heroCta = pickLocalized(doc.heroSection?.ctaLabel, locale);
  if (heroCta) merged.heroCtaLabel = heroCta;

  if (doc.heroSection?.media) {
    const resolved = resolveSanityMedia(doc.heroSection.media, merged.heroMedia);
    merged.heroMedia = resolved.media;
    merged.heroVideoId = resolved.videoId;
  }

  const addressLabel = pickLocalized(doc.detailsSection?.addressLabel, locale);
  if (addressLabel) merged.details.addressLabel = addressLabel;

  const phoneLabel = pickLocalized(doc.detailsSection?.phoneLabel, locale);
  if (phoneLabel) merged.details.phoneLabel = phoneLabel;

  const emailLabel = pickLocalized(doc.detailsSection?.emailLabel, locale);
  if (emailLabel) merged.details.emailLabel = emailLabel;

  const secondaryLabel = pickLocalized(doc.secondarySection?.label, locale);
  if (secondaryLabel) merged.secondary.label = secondaryLabel;

  const secondaryHeadline = pickLocalized(
    doc.secondarySection?.headline,
    locale,
  );
  if (secondaryHeadline) merged.secondary.headline = secondaryHeadline;

  const secondaryText = pickLocalized(doc.secondarySection?.text, locale);
  if (secondaryText) merged.secondary.text = secondaryText;

  const secondaryCta = pickLocalized(doc.secondarySection?.ctaLabel, locale);
  if (secondaryCta) merged.secondary.ctaLabel = secondaryCta;

  const form = doc.formSection;
  if (form) {
    const nameLabel = pickLocalized(form.nameLabel, locale);
    if (nameLabel) merged.form.name = nameLabel;
    const companyLabel = pickLocalized(form.companyLabel, locale);
    if (companyLabel) merged.form.company = companyLabel;
    const formEmail = pickLocalized(form.emailLabel, locale);
    if (formEmail) merged.form.email = formEmail;
    const formPhone = pickLocalized(form.phoneLabel, locale);
    if (formPhone) merged.form.phone = formPhone;
    const messageLabel = pickLocalized(form.messageLabel, locale);
    if (messageLabel) merged.form.message = messageLabel;
    const submitLabel = pickLocalized(form.submitLabel, locale);
    if (submitLabel) merged.form.submit = submitLabel;
    const privacyNote = pickLocalized(form.privacyNote, locale);
    if (privacyNote) merged.form.privacyNote = privacyNote;
    const privacyLinkLabel = pickLocalized(form.privacyLinkLabel, locale);
    if (privacyLinkLabel) merged.form.privacyLinkLabel = privacyLinkLabel;
    const successMessage = pickLocalized(form.successMessage, locale);
    if (successMessage) merged.form.success = successMessage;
    const errorMessage = pickLocalized(form.errorMessage, locale);
    if (errorMessage) merged.form.error = errorMessage;
    const sendingMessage = pickLocalized(form.sendingMessage, locale);
    if (sendingMessage) merged.form.sending = sendingMessage;
  }

  const clientsLabel = pickLocalized(doc.clientsSection?.label, locale);
  if (clientsLabel) merged.clients.label = clientsLabel;

  merged.clients.logos = mergeClientLogos(
    merged.clients.logos,
    doc.clientsSection?.logos,
  );

  const finalHeadline = pickLocalized(doc.finalCtaSection?.headline, locale);
  if (finalHeadline) {
    const { before, accent, after } = splitAroundAccent(
      finalHeadline,
      base.finalCta.headlineAccent,
    );
    merged.finalCta.headlineBefore = before;
    merged.finalCta.headlineAccent = accent || base.finalCta.headlineAccent;
    merged.finalCta.headlineAfter = after;
  }

  const finalText = pickLocalized(doc.finalCtaSection?.text, locale);
  if (finalText) merged.finalCta.text = finalText;

  const finalCtaLabel = pickLocalized(doc.finalCtaSection?.ctaLabel, locale);
  if (finalCtaLabel) merged.finalCta.ctaLabel = finalCtaLabel;

  return merged;
}

export function getLocalResolvedContactContent(
  locale: Locale,
  clientsLabel: string,
): ResolvedContactPageContent {
  const base = getContactPageContent(locale);
  return {
    ...base,
    heroMedia: { ...DEFAULT_HERO_MEDIA },
    clients: {
      label: clientsLabel,
      logos: getClientLogos(),
    },
  };
}
