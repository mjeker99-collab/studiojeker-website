"use client";
import { useState } from "react";
import ExistingWebsite from "./ExistingWebsite";
import WebsiteBuilder from "./WebsiteBuilder";

export default function Website({
  initialProjectId,
}: {
  initialProjectId?: string;
}) {
  const [area, setArea] = useState<"existing" | "new">(
    initialProjectId ? "new" : "existing",
  );
  return (
    <>
      <nav className="hub-subnav" aria-label="Website-Bereiche">
        <button
          type="button"
          className={area === "existing" ? "" : "secondary"}
          aria-pressed={area === "existing"}
          onClick={() => setArea("existing")}
        >
          Bestehende Website verwalten
        </button>
        <button
          type="button"
          className={area === "new" ? "" : "secondary"}
          aria-pressed={area === "new"}
          onClick={() => setArea("new")}
        >
          Neue Website / Landingpage erstellen
        </button>
      </nav>
      {area === "existing" ? (
        <ExistingWebsite />
      ) : (
        <WebsiteBuilder initialProjectId={initialProjectId} />
      )}
    </>
  );
}
