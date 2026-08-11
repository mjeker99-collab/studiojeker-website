import { NextResponse } from "next/server";
import {
  validateContactPayload,
  type ContactPayload,
} from "@/lib/security/contact";
import {
  checkRateLimit,
  CONTACT_RATE_LIMIT,
} from "@/lib/security/rate-limit";

export const runtime = "nodejs";

const GENERIC_ERROR = { ok: false as const, error: "request_failed" };
const GENERIC_SUCCESS = { ok: true as const };

function clientKey(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    return forwarded.split(",")[0]?.trim() || "unknown";
  }
  return request.headers.get("x-real-ip") || "unknown";
}

async function readPayload(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    return request.json();
  }

  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await request.formData();
    const payload: Record<string, string> = {};
    for (const [key, value] of form.entries()) {
      if (typeof value === "string") {
        payload[key] = value;
      }
    }
    return payload;
  }

  return null;
}

/**
 * Optional Turnstile verification when secrets are configured.
 * Without secrets, the token is ignored (architecture ready, not required).
 */
async function verifyTurnstileIfConfigured(
  token: string | undefined,
  request: Request,
): Promise<boolean> {
  const secret = process.env.TURNSTILE_SECRET_KEY?.trim();
  if (!secret) {
    return true;
  }
  if (!token) {
    return false;
  }

  const body = new URLSearchParams({
    secret,
    response: token,
    remoteip: clientKey(request),
  });

  const response = await fetch(
    "https://challenges.cloudflare.com/turnstile/v0/siteverify",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body,
    },
  );

  if (!response.ok) {
    return false;
  }

  const result = (await response.json()) as { success?: boolean };
  return Boolean(result.success);
}

async function deliverContact(data: ContactPayload): Promise<boolean> {
  const webhook = process.env.CONTACT_FORM_WEBHOOK_URL?.trim();
  if (!webhook) {
    // No delivery backend configured yet — accept validated payload for UX,
    // but do not pretend an email was sent via logs that expose content.
    if (process.env.NODE_ENV !== "production") {
      console.info("[contact] validated (no CONTACT_FORM_WEBHOOK_URL configured)");
    }
    return true;
  }

  try {
    const response = await fetch(webhook, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Accept: "application/json",
      },
      body: JSON.stringify({
        name: data.name,
        company: data.company ?? "",
        email: data.email,
        phone: data.phone ?? "",
        message: data.message,
        locale: data.locale ?? "de",
        source: "studiojeker-website",
      }),
    });
    return response.ok;
  } catch {
    return false;
  }
}

export async function POST(request: Request) {
  try {
    const rate = checkRateLimit({
      key: `contact:${clientKey(request)}`,
      limit: CONTACT_RATE_LIMIT.limit,
      windowMs: CONTACT_RATE_LIMIT.windowMs,
    });

    if (!rate.allowed) {
      return NextResponse.json(GENERIC_ERROR, { status: 429 });
    }

    let payload: unknown;
    try {
      payload = await readPayload(request);
    } catch {
      return NextResponse.json(GENERIC_ERROR, { status: 400 });
    }

    const validated = validateContactPayload(payload);
    if (!validated.ok) {
      // Honeypot trips look like success to bots.
      if (validated.code === "honeypot") {
        return NextResponse.json(GENERIC_SUCCESS, { status: 200 });
      }
      return NextResponse.json(GENERIC_ERROR, { status: 400 });
    }

    const turnstileOk = await verifyTurnstileIfConfigured(
      validated.data.turnstileToken,
      request,
    );
    if (!turnstileOk) {
      return NextResponse.json(GENERIC_ERROR, { status: 400 });
    }

    const delivered = await deliverContact(validated.data);
    if (!delivered) {
      return NextResponse.json(GENERIC_ERROR, { status: 503 });
    }

    return NextResponse.json(GENERIC_SUCCESS, { status: 200 });
  } catch {
    return NextResponse.json(GENERIC_ERROR, { status: 500 });
  }
}

export function GET() {
  return NextResponse.json(GENERIC_ERROR, { status: 405 });
}

export function PUT() {
  return NextResponse.json(GENERIC_ERROR, { status: 405 });
}

export function DELETE() {
  return NextResponse.json(GENERIC_ERROR, { status: 405 });
}
