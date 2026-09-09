<?php
declare(strict_types=1);

/**
 * Runtime Content-Abo page proxy for Metanet static hosting.
 *
 * Same architecture as `/api/contact-page.php`:
 * - Static export cannot use Next.js ISR.
 * - Browser → Sanity is blocked by CORS on staging.
 * - This same-origin endpoint reads the Abo singleton from Sanity's live API.
 *
 * Keep the GROQ projection in sync with `lib/sanity/abo.ts` (`aboQuery`).
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
/** Must match `ABO_DOCUMENT_ID` in `lib/sanity/abo.ts`. */
const ABO_DOCUMENT_ID = 'abo';

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
*[_id == \$id && _type == "abo"][0]{
  _id,
  heroSection{
    label{$localized},
    headline{$localized},
    text{$localized},
    cta{$cta},
    media{$mediaProjection}
  },
  problemSection{
    label{$localized},
    headline{$localized},
    text{$localized},
    highlight{$localized}
  },
  benefitsSection{
    items[]{
      _key,
      id,
      title{$localized},
      description{$localized},
      sortOrder
    }
  },
  processSection{
    headline{$localized},
    steps[]{
      _key,
      id,
      number,
      title{$localized},
      description{$localized}
    }
  },
  scopeSection{
    headline{$localized},
    introduction{$localized},
    items[]{
      _key,
      label{$localized}
    },
    closing{$localized},
    highlight{$localized}
  },
  showreelSection{
    label{$localized},
    headline{$localized},
    text{$localized},
    cta{$cta},
    media{$mediaProjection}
  },
  closingSection{
    label{$localized},
    headline{$localized},
    text{$localized},
    cta{$cta}
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
  rawurlencode(json_encode(ABO_DOCUMENT_ID, JSON_THROW_ON_ERROR))
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
    'User-Agent: StudiojekerAboProxy/1.0',
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
    'error' => 'Failed to load Content Abo from Sanity.',
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
    'error' => 'Content Abo document not found.',
    'id' => ABO_DOCUMENT_ID,
  ]);
  exit;
}

echo json_encode([
  'ok' => true,
  'id' => is_array($result) && isset($result['_id']) ? $result['_id'] : ABO_DOCUMENT_ID,
  'document' => $result,
]);
