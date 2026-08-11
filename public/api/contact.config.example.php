<?php
/**
 * Studiojeker contact form — server config (Metanet / Plesk).
 *
 * Setup on the host:
 *   1. Copy this file to contact.config.php in the same directory.
 *   2. Adjust recipient / from addresses if needed.
 *   3. Do not commit contact.config.php if you add SMTP secrets later.
 *
 * contact.config.php is blocked from HTTP access via api/.htaccess.
 */
declare(strict_types=1);

return [
    // Inbox that receives website enquiries.
    'to' => 'mail@studiojeker.ch',

    // Must be an address on the sending domain (SPF/DMARC on Metanet).
    'from' => 'mail@studiojeker.ch',

    // Optional display name for the From header.
    'from_name' => 'Studiojeker Website',

    // Subject prefix (locale-specific subject is appended).
    'subject_prefix' => '[Website]',

    // Soft rate limit: max submissions per IP within the window.
    'rate_limit_max' => 8,
    'rate_limit_window_seconds' => 600,
];
