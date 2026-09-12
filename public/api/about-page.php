<?php
declare(strict_types=1);

require_once __DIR__ . '/proxy-errors.php';

/**
 * Runtime About page proxy for Metanet static hosting.
 *
 * Same architecture as `/api/contact-page.php` / `/api/abo-page.php`:
 * - Static export cannot use Next.js ISR.
 * - Browser → Sanity is blocked by CORS on staging.
 * - This same-origin endpoint reads the About singleton from Sanity's live API.
 *
 * Keep the GROQ projection in sync with `lib/sanity/about.ts` (`aboutQuery`).
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
/** Must match `ABOUT_DOCUMENT_ID` in `lib/sanity/about.ts`. */
const ABOUT_DOCUMENT_ID = 'about';

$imageProjection = <<<'GROQ'
{
  ...,
  "url": asset->url,
  "dimensions": asset->metadata.dimensions,
  "alt": coalesce(alt, asset->altText)
}
GROQ;

$query = <<<GROQ
*[_id == \$id && _type == "about"][0]{
  _id,
  heroLabel,
  heroHeadline,
  heroSubheadline,
  heroIntroText,
  heroCtaLabel,
  heroImage{$imageProjection},
  valuesLabel,
  valuesItems[]{
    _key,
    title,
    description
  },
  teamLabel,
  teamHeadline,
  teamIntroduction,
  teamFeatureImage{$imageProjection},
  teamMembers[]{
    _key,
    name,
    role,
    isPlaceholder,
    portrait{$imageProjection}
  },
  facts[]{
    _key,
    value,
    label
  },
  approachLabel,
  approachHeadline,
  approachSubheadline,
  approachText,
  approachCtaLabel,
  approachImage{$imageProjection},
  servicesLabel,
  servicesHeadline,
  servicesItems[]{
    _key,
    title,
    description
  },
  clientsLabel,
  ctaHeadline,
  ctaText,
  ctaLabel,
  seoTitle,
  seoDescription
}
GROQ;

$url = sprintf(
  'https://%s.api.sanity.io/v%s/data/query/%s?query=%s&%%24id=%s',
  SANITY_PROJECT_ID,
  SANITY_API_VERSION,
  SANITY_DATASET,
  rawurlencode($query),
  rawurlencode(json_encode(ABOUT_DOCUMENT_ID, JSON_THROW_ON_ERROR))
);

$ch = curl_init($url);
if ($ch === false) {
  proxy_client_error(500, 'about-page', 'curl_init failed');
}

curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_CONNECTTIMEOUT => 8,
  CURLOPT_TIMEOUT => 20,
  CURLOPT_HTTPHEADER => [
    'Accept: application/json',
    'User-Agent: StudiojekerAboutProxy/1.0',
  ],
]);

$responseBody = curl_exec($ch);
$curlError = curl_error($ch);
$statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($responseBody === false || $statusCode < 200 || $statusCode >= 300) {
  proxy_client_error(502, 'about-page', 'Sanity request failed', [
    'http' => $statusCode > 0 ? $statusCode : null,
    'curl' => $curlError !== '' ? $curlError : null,
  ]);
}

$decoded = json_decode($responseBody, true);
if (!is_array($decoded) || !array_key_exists('result', $decoded)) {
  proxy_client_error(502, 'about-page', 'Unexpected Sanity response shape');
}

$result = $decoded['result'];
if ($result === null) {
  proxy_client_error(404, 'about-page', 'Document not found');
}

echo json_encode([
  'ok' => true,
  'id' => is_array($result) && isset($result['_id']) ? $result['_id'] : ABOUT_DOCUMENT_ID,
  'document' => $result,
]);
