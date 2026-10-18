"use client";
/* eslint-disable @next/next/no-img-element -- Authenticated private previews. */
import { useState } from "react";
import type { StudioSnapshot } from "@/lib/studio/input";
export default function StudioLayoutPreview({
  snapshot,
  id,
  version,
  dirty,
}: {
  snapshot: StudioSnapshot;
  id: string;
  version: number;
  dirty: boolean;
}) {
  const [images, setImages] = useState<string[]>([]),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <section>
      <h3>Content-Studio: Bild und Layoutversion</h3>
      <p>
        Headline: {snapshot.headline || "ausgeblendet"} · Vorlage{" "}
        {snapshot.template} / {snapshot.brandVersion}. Original-Logo:{" "}
        {snapshot.showLogo ? "sichtbar" : "ausgeblendet"}. Claim:{" "}
        {snapshot.showClaim ? "sichtbar" : "ausgeblendet"}.
      </p>
      <p>
        Formate: {snapshot.formats.join(", ")} · Ausschnitt {snapshot.cropX}/
        {snapshot.cropY} · Zoom {snapshot.zoom}. Motiv-Prüfsumme:{" "}
        {snapshot.motifSha256}
      </p>
      <button
        type="button"
        className="secondary"
        disabled={dirty || busy}
        onClick={async () => {
          setBusy(true);
          setError("");
          try {
            const urls = [];
            for (const format of snapshot.formats) {
              const r = await fetch(`/api/studio/export/${id}`, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  version,
                  format,
                  encoding: "png",
                  preview: true,
                }),
              });
              const v = await r.json();
              if (!r.ok) throw new Error(v.error || "Vorschau fehlgeschlagen.");
              urls.push(v.url);
            }
            setImages(urls);
          } catch (e) {
            setError((e as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        Alle gespeicherten Layoutformate prüfen
      </button>
      {error && <p role="alert">{error}</p>}
      {images.map((url, i) => (
        <figure key={url}>
          <img
            src={url}
            alt={`Layoutvorschau ${snapshot.formats[i]}`}
            style={{ maxWidth: "100%", maxHeight: 520 }}
          />
          <figcaption>{snapshot.formats[i]}</figcaption>
        </figure>
      ))}
    </section>
  );
}
