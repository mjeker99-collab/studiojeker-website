<?php
declare(strict_types=1);

/**
 * Runtime Work page proxy for Metanet static hosting.
 *
 * Same architecture as `/api/homepage.php` and `/api/contact-page.php`:
 * - Static export cannot use Next.js ISR.
 * - Browser → Sanity is blocked by CORS on staging.
 * - This same-origin endpoint reads the Work singleton from Sanity's live API.
 *
 * Keep the GROQ projection in sync with `lib/sanity/work.ts` (`workPageQuery`).
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
/** Must match `WORK_DOCUMENT_ID` in `lib/sanity/work.ts`. */
const WORK_DOCUMENT_ID = 'work';

$imageProjection = <<<'GROQ'
{
  ...,
  "url": asset->url,
  "dimensions": asset->metadata.dimensions,
  "alt": coalesce(alt, asset->altText)
}
GROQ;

$workMediaProjection = <<<GROQ
{
  mediaType,
  vimeoUrl,
  youtubeUrl,
  externalVideoUrl,
  videoAlt,
  duration,
  videoAutoplay,
  videoLoop,
  videoMuted,
  videoFile{
    ...,
    "url": asset->url
  },
  image{$imageProjection},
  poster{$imageProjection},
  slideshowAlt,
  slideshowInterval,
  "slideshowImages": slideshowImages[]{
    ...,
    "url": asset->url,
    "dimensions": asset->metadata.dimensions,
    "alt": coalesce(alt, asset->altText),
    caption
  }
}
GROQ;

$localized = '{ de, en }';

$query = <<<GROQ
*[_id == \$id && _type == "work"][0]{
  _id,
  heroSection{
    label{$localized},
    headline{$localized},
    text{$localized}
  },
  categories[]{
    categoryId,
    title{$localized},
    sortOrder,
    items[]{
      itemId,
      active,
      title{$localized},
      caption{$localized},
      subtitle{$localized},
      description{$localized},
      client,
      year,
      href,
      sortOrder,
      media{$workMediaProjection}
    }
  },
  finalCtaSection{
    headlineBefore{$localized},
    headlineAccent{$localized},
    headlineAfter{$localized},
    text{$localized},
    ctaLabel{$localized},
    ctaHref
  },
  seoSection{
    title{$localized},
    description{$localized},
    ogImage{$imageProjection}
  }
}
GROQ;

$url = sprintf(
  'https://%s.api.sanity.io/v%s/data/query/%s?query=%s&%%24id=%s',
  SANITY_PROJECT_ID,
  SANITY_API_VERSION,
  SANITY_DATASET,
  rawurlencode($query),
  rawurlencode(json_encode(WORK_DOCUMENT_ID, JSON_THROW_ON_ERROR))
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
    'User-Agent: StudiojekerWorkProxy/1.0',
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
    'error' => 'Failed to load Work from Sanity.',
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
    'error' => 'Work document not found.',
    'id' => WORK_DOCUMENT_ID,
  ]);
  exit;
}

echo json_encode([
  'ok' => true,
  'id' => is_array($result) && isset($result['_id']) ? $result['_id'] : WORK_DOCUMENT_ID,
  'document' => $result,
]);
