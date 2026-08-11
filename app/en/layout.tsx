import type { ReactNode } from "react";

/**
 * English segment layout.
 * Sets document language early for EN routes without changing DE SSR.
 */
export default function EnglishLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <script
        dangerouslySetInnerHTML={{
          __html: `document.documentElement.lang="en";`,
        }}
      />
      {children}
    </>
  );
}
