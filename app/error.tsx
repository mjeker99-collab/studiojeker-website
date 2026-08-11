"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Container } from "@/components/layout/Container";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Safe production error UI — no stack traces, paths, or env details.
 */
export default function Error({ error, reset }: ErrorPageProps) {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") {
      console.error(error);
    }
  }, [error]);

  return (
    <section className="foundation-panel">
      <Container>
        <h1 className="headline">Error</h1>
        <p className="subheadline prose">
          Something went wrong. Please try again.
        </p>
        <Button type="button" onClick={reset}>
          Try again
        </Button>
      </Container>
    </section>
  );
}
