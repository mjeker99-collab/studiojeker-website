<?php
/**
 * Studiojeker — static-site contact endpoint for Metanet / Plesk (PHP).
 *
 * The marketing site is a Next.js static export. This script is the only
 * server-side runtime piece: validation + mail delivery via PHP mail().
 *
 * Deployed with the static files as /api/contact.php (from public/api/).
 */
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
header('Referrer-Policy: no-referrer');

const FIELD_LIMITS = [
    'name' => 120,
    'company' => 160,
    'email' => 254,
    'phone' => 40,
    'message' => 4000,
];

function respond(int $status, array $payload): void
{
    http_response_code($status);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

function as_string(mixed $value): string
{
    return is_string($value) ? $value : '';
}

/** Strip CR/LF and other controls to prevent header injection. */
function sanitize_header_safe(string $value): string
{
    return trim(preg_replace('/[\x00-\x1F\x7F]+/u', '', $value) ?? '');
}

function collapse_whitespace(string $value): string
{
    return trim(preg_replace('/\s+/u', ' ', $value) ?? '');
}

function field_length(string $value): int
{
    return function_exists('mb_strlen') ? mb_strlen($value, 'UTF-8') : strlen($value);
}

function is_valid_email(string $email): bool
{
    if ($email === '' || strlen($email) > FIELD_LIMITS['email']) {
        return false;
    }
    if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
        return false;
    }
    // Reject header-injection attempts that slipped past filter_var.
    return $email === sanitize_header_safe($email);
}

function client_ip(): string
{
    // Trust only REMOTE_ADDR (do not honour spoofable X-Forwarded-For here).
    $ip = $_SERVER['REMOTE_ADDR'] ?? '0.0.0.0';
    return is_string($ip) && $ip !== '' ? $ip : '0.0.0.0';
}

function load_config(): array
{
    $path = __DIR__ . '/contact.config.php';
    if (is_readable($path)) {
        $config = require $path;
        if (is_array($config)) {
            return $config;
        }
    }

    // Safe defaults using the public Studiojeker inbox (no secrets).
    return [
        'to' => 'mail@studiojeker.ch',
        'from' => 'mail@studiojeker.ch',
        'from_name' => 'Studiojeker Website',
        'subject_prefix' => '[Website]',
        'rate_limit_max' => 8,
        'rate_limit_window_seconds' => 600,
    ];
}

function rate_limit_ok(string $ip, int $max, int $windowSeconds): bool
{
    if ($max < 1 || $windowSeconds < 1) {
        return true;
    }

    $dir = sys_get_temp_dir() . '/studiojeker-contact-rate';
    if (!is_dir($dir) && !@mkdir($dir, 0700, true) && !is_dir($dir)) {
        // If we cannot store state, allow the request (fail open for UX).
        return true;
    }

    $file = $dir . '/' . hash('sha256', $ip) . '.json';
    $now = time();
    $hits = [];

    if (is_readable($file)) {
        $raw = file_get_contents($file);
        $decoded = is_string($raw) ? json_decode($raw, true) : null;
        if (is_array($decoded)) {
            foreach ($decoded as $ts) {
                if (is_int($ts) && ($now - $ts) < $windowSeconds) {
                    $hits[] = $ts;
                }
            }
        }
    }

    if (count($hits) >= $max) {
        return false;
    }

    $hits[] = $now;
    @file_put_contents($file, json_encode($hits), LOCK_EX);
    @chmod($file, 0600);

    return true;
}

function read_payload(): array
{
    $contentType = strtolower($_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '');

    if (strpos($contentType, 'application/json') !== false) {
        $raw = file_get_contents('php://input');
        if (!is_string($raw) || $raw === '') {
            return [];
        }
        $decoded = json_decode($raw, true);
        return is_array($decoded) ? $decoded : [];
    }

    // application/x-www-form-urlencoded or multipart
    return [
        'name' => $_POST['name'] ?? '',
        'company' => $_POST['company'] ?? '',
        'email' => $_POST['email'] ?? '',
        'phone' => $_POST['phone'] ?? '',
        'message' => $_POST['message'] ?? '',
        'website' => $_POST['website'] ?? '',
        'locale' => $_POST['locale'] ?? '',
        'source' => $_POST['source'] ?? '',
    ];
}

function encode_address_header(string $name, string $email): string
{
    $safeName = sanitize_header_safe($name);
    $safeEmail = sanitize_header_safe($email);
    if ($safeName === '') {
        return $safeEmail;
    }
    // RFC 2047-ish ASCII fallback — keep simple for Swiss hosting.
    $safeName = str_replace(['"', '\\'], '', $safeName);
    return sprintf('"%s" <%s>', $safeName, $safeEmail);
}

// --- Request gate ---

if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'POST') {
    respond(405, ['ok' => false, 'error' => 'method_not_allowed']);
}

$config = load_config();
$to = sanitize_header_safe(as_string($config['to'] ?? ''));
$from = sanitize_header_safe(as_string($config['from'] ?? ''));
$fromName = sanitize_header_safe(as_string($config['from_name'] ?? 'Studiojeker Website'));
$subjectPrefix = sanitize_header_safe(as_string($config['subject_prefix'] ?? '[Website]'));
$rateMax = (int) ($config['rate_limit_max'] ?? 8);
$rateWindow = (int) ($config['rate_limit_window_seconds'] ?? 600);

if ($to === '' || !is_valid_email($to) || $from === '' || !is_valid_email($from)) {
    respond(503, ['ok' => false, 'error' => 'unavailable']);
}

if (!rate_limit_ok(client_ip(), $rateMax, $rateWindow)) {
    respond(429, ['ok' => false, 'error' => 'rate_limited']);
}

$payload = read_payload();

// Honeypot — pretend success so bots do not learn.
$honeypot = as_string($payload['website'] ?? '');
if ($honeypot !== '') {
    respond(200, ['ok' => true]);
}

$name = sanitize_header_safe(collapse_whitespace(as_string($payload['name'] ?? '')));
$company = sanitize_header_safe(collapse_whitespace(as_string($payload['company'] ?? '')));
$email = strtolower(sanitize_header_safe(collapse_whitespace(as_string($payload['email'] ?? ''))));
$phone = sanitize_header_safe(collapse_whitespace(as_string($payload['phone'] ?? '')));
$message = sanitize_header_safe(trim(as_string($payload['message'] ?? '')));
$localeRaw = sanitize_header_safe(as_string($payload['locale'] ?? ''));
$locale = ($localeRaw === 'en' || $localeRaw === 'de') ? $localeRaw : 'de';

if (
    $name === '' ||
    field_length($name) > FIELD_LIMITS['name'] ||
    !is_valid_email($email) ||
    $message === '' ||
    field_length($message) > FIELD_LIMITS['message'] ||
    field_length($company) > FIELD_LIMITS['company'] ||
    field_length($phone) > FIELD_LIMITS['phone']
) {
    respond(400, ['ok' => false, 'error' => 'invalid']);
}

$subjectCore = $locale === 'en' ? 'Website enquiry' : 'Website-Anfrage';
$subject = trim($subjectPrefix . ' ' . $subjectCore . ' — ' . $name);
$subject = sanitize_header_safe($subject);

$bodyLines = [
    'New enquiry from the Studiojeker website.',
    '',
    'Name: ' . $name,
    'Company: ' . ($company !== '' ? $company : '—'),
    'Email: ' . $email,
    'Phone: ' . ($phone !== '' ? $phone : '—'),
    'Locale: ' . $locale,
    '',
    'Message:',
    $message,
    '',
    '—',
    'Sent via /api/contact.php',
];
$body = implode("\n", $bodyLines);

$headers = [
    'MIME-Version: 1.0',
    'Content-Type: text/plain; charset=UTF-8',
    'Content-Transfer-Encoding: 8bit',
    'From: ' . encode_address_header($fromName, $from),
    'Reply-To: ' . encode_address_header($name, $email),
    'X-Mailer: Studiojeker-Static-Contact',
    'X-Auto-Response-Suppress: All',
];

$additionalParams = '';
// Envelope sender (helps some shared hosts); only if from is safe.
if (is_valid_email($from)) {
    $additionalParams = '-f' . $from;
}

$sent = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers), $additionalParams);

if (!$sent) {
    respond(502, ['ok' => false, 'error' => 'delivery_failed']);
}

respond(200, ['ok' => true]);
