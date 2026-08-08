import {
  getWordpressApiBaseUrl,
  isWordpressConfigured,
} from "@/lib/wordpress/config";
import {
  WordpressError,
  WordpressNotConfiguredError,
} from "@/lib/wordpress/errors";

type FetchWordpressOptions = {
  path: string;
  searchParams?: Record<string, string | number | boolean | undefined>;
  init?: RequestInit;
  /**
   * When false, missing configuration returns null instead of throwing.
   * Useful for optional foundation calls during development.
   */
  required?: boolean;
};

function buildUrl(
  baseUrl: string,
  path: string,
  searchParams?: FetchWordpressOptions["searchParams"],
): string {
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;
  const url = new URL(`${baseUrl}${normalizedPath}`);

  if (searchParams) {
    for (const [key, value] of Object.entries(searchParams)) {
      if (value === undefined) {
        continue;
      }

      url.searchParams.set(key, String(value));
    }
  }

  return url.toString();
}

/**
 * Reusable WordPress REST fetch utility.
 * Compatible with Polylang language query params (e.g. `lang=de|en`).
 */
export async function fetchWordpress<T>({
  path,
  searchParams,
  init,
  required = true,
}: FetchWordpressOptions): Promise<T | null> {
  const baseUrl = getWordpressApiBaseUrl();

  if (!baseUrl) {
    if (!required) {
      return null;
    }

    throw new WordpressNotConfiguredError();
  }

  const url = buildUrl(baseUrl, path, searchParams);

  try {
    const response = await fetch(url, {
      ...init,
      headers: {
        Accept: "application/json",
        ...(init?.headers ?? {}),
      },
      // Foundation default: avoid build-time hard failures on remote CMS.
      cache: init?.cache ?? "no-store",
    });

    if (!response.ok) {
      throw new WordpressError(
        `WordPress request failed with status ${response.status}.`,
        {
          status: response.status,
          code: "WORDPRESS_HTTP_ERROR",
        },
      );
    }

    return (await response.json()) as T;
  } catch (error) {
    if (error instanceof WordpressError) {
      throw error;
    }

    throw new WordpressError("WordPress request failed.", {
      code: "WORDPRESS_NETWORK_ERROR",
      cause: error,
    });
  }
}

export function getWordpressStatus(): {
  configured: boolean;
  baseUrl: string | null;
} {
  return {
    configured: isWordpressConfigured(),
    baseUrl: getWordpressApiBaseUrl(),
  };
}
