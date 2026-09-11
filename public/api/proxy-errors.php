<?php
declare(strict_types=1);

/**
 * Shared JSON error helpers for public Sanity page proxies.
 * Never send upstreamStatus, curl detail, tokens, or document internals to clients.
 */

const PROXY_CLIENT_ERROR =
  'Der Inhalt konnte momentan nicht geladen werden.';

const CONTACT_CLIENT_ERROR =
  'Die Nachricht konnte momentan nicht gesendet werden. Bitte versuchen Sie es später erneut.';

/**
 * Log a technical note server-side only (no secrets / no full payloads).
 */
function proxy_log(string $channel, string $message): void
{
  $safe = preg_replace('/[\x00-\x1F\x7F]+/', ' ', $message) ?? $message;
  if (function_exists('mb_substr')) {
    $safe = mb_substr($safe, 0, 500, 'UTF-8');
  } else {
    $safe = substr($safe, 0, 500);
  }
  error_log('[studiojeker-api:' . $channel . '] ' . $safe);
}

/**
 * Emit a neutral JSON error for page-content proxies and exit.
 *
 * @param array<string, scalar|null> $logContext Non-sensitive diagnostics for the server log only.
 */
function proxy_client_error(
  int $status,
  string $channel,
  string $logMessage,
  array $logContext = [],
): void {
  $contextParts = [];
  foreach ($logContext as $key => $value) {
    if ($value === null || $value === '') {
      continue;
    }
    if (!is_scalar($value)) {
      continue;
    }
    $contextParts[] = $key . '=' . (string) $value;
  }
  $suffix = $contextParts !== [] ? ' | ' . implode(' ', $contextParts) : '';
  proxy_log($channel, $logMessage . $suffix);

  http_response_code($status);
  echo json_encode(
    [
      'ok' => false,
      'error' => PROXY_CLIENT_ERROR,
    ],
    JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES,
  );
  exit;
}
