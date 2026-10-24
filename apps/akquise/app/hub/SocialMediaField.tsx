"use client";
/* eslint-disable @next/next/no-img-element -- Private authenticated asset routes. */
import { useState } from "react";
import { LibraryPicker, type LibraryEntry } from "../library/Library";

type Media = {
  mediaType: "NONE" | "IMAGE" | "VIDEO";
  mediaUrl: string;
  mediaReference: string;
};

export default function SocialMediaField({
  channelLabel,
  value,
  onChange,
}: {
  channelLabel: string;
  value: Media;
  onChange: (patch: Partial<Media>) => void;
}) {
  const [picker, setPicker] = useState(false);
  function applyLibrary(item: LibraryEntry) {
    setPicker(false);
    if (!item.asset?.mime.startsWith("image/")) return;
    onChange({
      mediaType: "IMAGE",
      mediaUrl: "",
      mediaReference: `Bibliothek · ${item.title} · Asset ${item.asset.id} · ${item.asset.sha256}`,
    });
  }
  const previewSrc =
    value.mediaType === "IMAGE" && value.mediaUrl.startsWith("https://")
      ? value.mediaUrl
      : value.mediaReference.match(/Asset ([a-z0-9]+)/i)?.[1]
        ? `/api/studio/assets/${value.mediaReference.match(/Asset ([a-z0-9]+)/i)![1]}`
        : "";
  return (
    <div className="social-media-field">
      <div className="form-grid">
        <label>
          {channelLabel} Medientyp
          <select
            value={value.mediaType}
            onChange={(e) =>
              onChange({
                mediaType: e.target.value as Media["mediaType"],
                ...(e.target.value === "NONE"
                  ? { mediaUrl: "", mediaReference: "" }
                  : {}),
              })
            }
          >
            <option value="NONE">Kein Medium</option>
            <option value="IMAGE">Bild</option>
            <option value="VIDEO">Video</option>
          </select>
        </label>
        <label>
          {channelLabel} Medien-URL
          <input
            type="url"
            value={value.mediaUrl}
            disabled={value.mediaType === "NONE"}
            onChange={(e) => onChange({ mediaUrl: e.target.value })}
          />
        </label>
        <label>
          {channelLabel} Medienreferenz
          <input
            placeholder="Asset-ID oder dokumentierter Ablageort"
            value={value.mediaReference}
            disabled={value.mediaType === "NONE"}
            onChange={(e) => onChange({ mediaReference: e.target.value })}
          />
        </label>
      </div>
      {value.mediaType !== "NONE" && (
        <div className="actions">
          <button
            type="button"
            className="secondary"
            onClick={() => setPicker(true)}
          >
            Medium aus Bibliothek
          </button>
          {(value.mediaUrl || value.mediaReference) && (
            <button
              type="button"
              className="secondary"
              onClick={() =>
                onChange({
                  mediaType: "NONE",
                  mediaUrl: "",
                  mediaReference: "",
                })
              }
            >
              Medium entfernen
            </button>
          )}
        </div>
      )}
      {previewSrc && (
        <figure className="social-media-preview">
          <img src={previewSrc} alt={`${channelLabel}-Medium`} />
          <figcaption className="muted">
            {value.mediaReference || value.mediaUrl}
          </figcaption>
        </figure>
      )}
      {picker && (
        <LibraryPicker
          imagesOnly
          onClose={() => setPicker(false)}
          onSelect={applyLibrary}
        />
      )}
    </div>
  );
}
