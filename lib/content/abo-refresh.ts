import type { SanityAbo } from "@/lib/sanity/abo";

/** Latest-request-wins refresh for /content-abo; never replaces content on error. */
export function createAboRefresh(
  onDocument: (document: SanityAbo) => void,
  fetchDocument: typeof fetch = fetch,
) {
  let requestId = 0;
  let stopped = false;
  let controller: AbortController | undefined;

  return {
    async refresh() {
      if (stopped) return;
      const currentId = ++requestId;
      controller?.abort();
      const currentController = new AbortController();
      controller = currentController;
      const timeout = setTimeout(() => currentController.abort(), 15000);

      try {
        const response = await fetchDocument("/api/abo-page.php", {
          cache: "no-store",
          credentials: "same-origin",
          signal: currentController.signal,
          headers: {
            Accept: "application/json",
            "Cache-Control": "no-cache",
            Pragma: "no-cache",
          },
        });
        if (!response.ok) return;
        const payload = (await response.json()) as {
          ok?: boolean;
          document?: SanityAbo | null;
        };
        if (
          stopped ||
          currentController.signal.aborted ||
          currentId !== requestId ||
          !payload.ok ||
          payload.document?._id !== "abo"
        ) {
          return;
        }
        onDocument(payload.document);
      } catch {
        // Keep the last successful content (including the build-time snapshot).
      } finally {
        clearTimeout(timeout);
      }
    },
    stop() {
      stopped = true;
      ++requestId;
      controller?.abort();
    },
  };
}
