<?php
declare(strict_types=1);

require_once __DIR__ . '/proxy-errors.php';

/**
 * Runtime KI/AI page proxy for Metanet static hosting.
 *
 * Same architecture as `/api/abo-page.php`:
 * - Static export cannot use Next.js ISR.
 * - Browser → Sanity is blocked by CORS on staging.
 * - This same-origin endpoint reads the AI singleton from Sanity's live API.
 *
 * Keep the GROQ projection in sync with `lib/sanity/ai.ts` (`aiQuery`).
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
/** Must match `AI_DOCUMENT_ID` in `lib/sanity/ai.ts`. */
const AI_DOCUMENT_ID = 'ai';

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
*[_id == \$id && _type == "ai"][0]{
  _id,
  heroSection{
    label{$localized},
    headline{$localized},
    text{$localized},
    media{$mediaProjection}
  },
  introSection{
    headline{$localized},
    text{$localized},
    media{$mediaProjection},
    caption{$localized}
  },
  processSection{
    label{$localized},
    headline{$localized},
    introduction{$localized},
    steps[]{
      _key,
      id,
      title{$localized},
      description{$localized}
    }
  },
  showreelSection{
    label{$localized},
    headline{$localized},
    text{$localized},
    cta{$cta},
    media{$mediaProjection}
  },
  applicationsSection{
    headline{$localized},
    items[]{
      _key,
      id,
      number,
      title{$localized},
      description{$localized}
    },
    media{$mediaProjection},
    caption{$localized}
  },
  modelsSection{
    headline{$localized},
    text{$localized},
    media{$mediaProjection},
    caption{$localized}
  },
  experienceSection{
    headline{$localized},
    text{$localized},
    media{$mediaProjection},
    caption{$localized}
  },
  approachSection{
    headline{$localized},
    text{$localized},
    media{$mediaProjection},
    caption{$localized}
  },
  visualMedia{
    keyVisual{$imageProjection},
    clayVilla{$imageProjection},
    photoVilla{$imageProjection},
    contentFormats{$imageProjection},
    distributionChannels{$imageProjection}
  },
  landscapeBreaks{
    afterAi{
      media{$mediaProjection},
      image{$imageProjection},
      caption{$localized}
    },
    afterDistribution{
      media{$mediaProjection},
      image{$imageProjection},
      caption{$localized}
    },
    afterVisibility{
      media{$mediaProjection},
      image{$imageProjection},
      caption{$localized}
    },
    midApplications{
      media{$mediaProjection},
      image{$imageProjection},
      caption{$localized}
    },
    afterApplications{
      media{$mediaProjection},
      image{$imageProjection},
      caption{$localized}
    },
    afterModels{
      media{$mediaProjection},
      image{$imageProjection},
      caption{$localized}
    },
    afterExperience{
      media{$mediaProjection},
      image{$imageProjection},
      caption{$localized}
    }
  },
  closingSection{
    headline{$localized},
    text{$localized},
    cta{$cta}
  },
  clientsLabel{$localized},
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
  rawurlencode(json_encode(AI_DOCUMENT_ID, JSON_THROW_ON_ERROR))
);

$ch = curl_init($url);
if ($ch === false) {
  proxy_client_error(500, 'ai-page', 'curl_init failed');
}

curl_setopt_array($ch, [
  CURLOPT_RETURNTRANSFER => true,
  CURLOPT_FOLLOWLOCATION => true,
  CURLOPT_CONNECTTIMEOUT => 8,
  CURLOPT_TIMEOUT => 20,
  CURLOPT_HTTPHEADER => [
    'Accept: application/json',
    'User-Agent: StudiojekerAiProxy/1.0',
  ],
]);

$responseBody = curl_exec($ch);
$curlError = curl_error($ch);
$statusCode = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
curl_close($ch);

if ($responseBody === false || $statusCode < 200 || $statusCode >= 300) {
  proxy_client_error(502, 'ai-page', 'Sanity request failed', [
    'http' => $statusCode > 0 ? $statusCode : null,
    'curl' => $curlError !== '' ? $curlError : null,
  ]);
}

$decoded = json_decode($responseBody, true);
if (!is_array($decoded) || !array_key_exists('result', $decoded)) {
  proxy_client_error(502, 'ai-page', 'Unexpected Sanity response shape');
}

$result = $decoded['result'];
if ($result === null) {
  proxy_client_error(404, 'ai-page', 'Document not found');
}

echo json_encode([
  'ok' => true,
  'id' => is_array($result) && isset($result['_id']) ? $result['_id'] : AI_DOCUMENT_ID,
  'document' => $result,
]);
