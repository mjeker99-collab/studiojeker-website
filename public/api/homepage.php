<?php
declare(strict_types=1);

/**
 * Runtime Homepage proxy for Metanet static hosting.
 *
 * Why this exists:
 * - Next.js `output: "export"` bakes Sanity content into HTML at build time.
 * - ISR / `revalidate` cannot refresh pages on Apache-only Metanet hosting.
 * - GitHub webhook rebuilds take many minutes, so CMS publishes feel "stuck".
 * - Browser → Sanity API is blocked by CORS for staging2026.studiojeker.ch.
 *
 * This endpoint fetches the pinned Homepage singleton from Sanity's live API
 * (not the CDN) and returns JSON so the homepage can refresh without redeploy.
 *
 * Keep the GROQ projection in sync with `lib/sanity/homepage.ts` (`homepageQuery`).
 */

header('Content-Type: application/json; charset=utf-8');
header('Cache-Control: no-store, no-cache, must-revalidate, max-age=0');
header('Pragma: no-cache');
header('X-Content-Type-Options: nosniff');

if (($_SERVER['REQUEST_METHOD'] ?? 'GET') !== 'GET') {
  http_response_code(405);
  header('Allow: GET');
  echo json_encode(['ok' => false, 'error' => 'Method not allowed.']);
  exit;
}

const SANITY_PROJECT_ID = 'tgx6e6jg';
const SANITY_DATASET = 'production';
const SANITY_API_VERSION = '2025-01-01';
/** Must match `HOMEPAGE_DOCUMENT_ID` in `lib/sanity/homepage.ts`. */
const HOMEPAGE_DOCUMENT_ID = 'b5bb69d5-b05a-49be-b453-bf9bcd68ecb1';

$imageProjection = <<<'GROQ'
{
  ...,
  "url": asset->url,
  "dimensions": asset->metadata.dimensions,
  "alt": coalesce(alt, asset->altText)
}
GROQ;

$mediaProjection = <<<GROQ
{
  mediaType,
  vimeoUrl,
  image{$imageProjection},
  poster{$imageProjection},
  mobilePoster{$imageProjection}
}
GROQ;

$localized = '{ de, en }';
$cta = "{ label{$localized}, href }";

$query = <<<GROQ
*[_id == \$id && _type == "homepage"][0]{
  _id,
  heroSection{
    eyebrow{$localized},
    headline{$localized},
    subheadline{$localized},
    intro{$localized},
    primaryCta{$cta},
    media{$mediaProjection}
  },
  servicesSection{
    label{$localized},
    headline{$localized},
    items[]{
      serviceId,
      title{$localized},
      description{$localized},
      href,
      ctaLabel{$localized},
      media{$mediaProjection},
      sortOrder
    }
  },
  showreelSection{
    label{$localized},
    headline{$localized},
    text{$localized},
    cta{$cta},
    media{$mediaProjection}
  },
  projectsSection{
    label{$localized},
    headline{$localized},
    intro{$localized},
    viewAllCta{$cta},
    "selectedProjects": selectedProjects[]->{
      _id,
      title,
      slug,
      shortDescription,
      featured,
      sortOrder,
      mainImage{$imageProjection},
      "category": category->{ title }
    }
  },
  aboSection{
    label{$localized},
    headline{$localized},
    text{$localized},
    benefits[]{
      id,
      title{$localized},
      description{$localized},
      sortOrder
    },
    cta{$cta},
    media{$mediaProjection}
  },
  aboutSection{
    label{$localized},
    headline{$localized},
    subheadline{$localized},
    text{$localized},
    cta{$cta},
    media{$mediaProjection}
  },
  clientsSection{
    label{$localized},
    "logos": logos[]->{
      _id,
      name,
      websiteUrl,
      sortOrder,
      active,
      logo{$imageProjection}
    }
  },
  finalCtaSection{
    headline{$localized},
    text{$localized},
    cta{$cta}
  },
  seoSection{
    title{$localized},
    description{$localized},
    ogImage{$imageProjection}
  },
  heroHeadline,
  introText,
  heroVideoUrl,
  mainIntroHeadline,
  mainIntroText,
  servicesSectionHeadline,
  servicesIntro,
  workSectionHeadline,
  workIntro,
  ctaHeadline,
  ctaText,
  ctaLabel,
  seoTitle,
  seoDescription,
  heroImage{$imageProjection}
}
GROQ;

// Sanity query params must be JSON-encoded (`$id` → quoted string).
$url = sprintf(
  'https://%s.api.sanity.io/v%s/data/query/%s?query=%s&%%24id=%s',
  SANITY_PROJECT_ID,
  SANITY_API_VERSION,
  SANITY_DATASET,
  rawurlencode($query),
  rawurlencode(json_encode(HOMEPAGE_DOCUMENT_ID, JSON_THROW_ON_ERROR))
);

$ch = curl_init($url);
if ($ch === false) {
  http_response_code(500);
  echo json_encode(['ok' => false, 'error' => 'Unable to initialize request.']);
  exit;
}

curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_CONNECTTIMEOUT => 8,
  CURLOPT_TIMEOUT => 20,
  CURLOPT_HTTPHEADER => [
    'Accept: application/json',
    'User-Agent: StudiojekerHomepageProxy/1.0',
  ],
]);

$responseBody = curl_exec($ch);
$curlError = curl_error($ch);
$statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($responseBody === false || $statusCode < 200 || $statusCode >= 300) {
  http_response_code(502);
  echo json_encode([
    'ok' => false,
    'error' => 'Failed to load Homepage from Sanity.',
    'upstreamStatus' => $statusCode > 0 ? $statusCode : null,
    'detail' => $curlError !== '' ? $curlError : null,
  ]);
  exit;
}

$decoded = json_decode($responseBody, true);
if (!is_array($decoded) || !array_key_exists('result', $decoded)) {
  http_response_code(502);
  echo json_encode(['ok' => false, 'error' => 'Unexpected Sanity response.']);
  exit;
}

$result = $decoded['result'];
if ($result === null) {
  http_response_code(404);
  echo json_encode([
    'ok' => false,
    'error' => 'Homepage document not found.',
    'id' => HOMEPAGE_DOCUMENT_ID,
  ]);
  exit;
}

echo json_encode([
  'ok' => true,
  'id' => is_array($result) && isset($result['_id']) ? $result['_id'] : HOMEPAGE_DOCUMENT_ID,
  'document' => $result,
]);
