export class WordpressError extends Error {
  readonly status?: number;
  readonly code: string;

  constructor(message: string, options?: { status?: number; code?: string; cause?: unknown }) {
    super(message, { cause: options?.cause });
    this.name = "WordpressError";
    this.status = options?.status;
    this.code = options?.code ?? "WORDPRESS_ERROR";
  }
}

export class WordpressNotConfiguredError extends WordpressError {
  constructor() {
    super("WORDPRESS_API_BASE_URL is not configured.", {
      code: "WORDPRESS_NOT_CONFIGURED",
    });
    this.name = "WordpressNotConfiguredError";
  }
}
