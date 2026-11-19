"use client";
/* eslint-disable @next/next/no-img-element -- Authenticated private asset routes. */
import { useState } from "react";
import { readableReply } from "@/lib/studio/presentation";

export function StudioImage({
  id,
  name,
  thumbnail = false,
}: {
  id: string;
  name: string;
  thumbnail?: boolean;
}) {
  const [failed, setFailed] = useState(false);
  return failed ? (
    <span role="status">Vorschau nicht verfügbar · {name}</span>
  ) : (
    <img
      loading="lazy"
      className={thumbnail ? "studio-reference-thumb" : "studio-result-image"}
      src={`/api/studio/assets/${encodeURIComponent(id)}`}
      alt={name}
      onError={() => setFailed(true)}
    />
  );
}

export default function StudioResult({ result }: { result: unknown }) {
  if (!result || typeof result !== "object") return null;
  const data = result as Record<string, unknown>;
  const posts = Array.isArray(data.posts) ? data.posts : [];
  return (
    <div className="studio-result">
      {typeof data.assetId === "string" && (
        <>
          <StudioImage
            key={data.assetId}
            id={data.assetId}
            name="Erzeugtes Bild"
          />
          <a
            href={`/api/studio/assets/${encodeURIComponent(data.assetId)}?download`}
          >
            Bild herunterladen
          </a>
        </>
      )}
      {typeof data.reply === "string" && (
        <p className="studio-chat-message">{readableReply(data.reply)}</p>
      )}
      {posts.map((post: Record<string, unknown>, index: number) => (
        <div key={index}>
          {typeof post.headline === "string" && <h3>{post.headline}</h3>}
          {Array.isArray(post.variants) &&
            post.variants.map((variant: Record<string, unknown>, i: number) => (
              <div key={i}>
                <strong>
                  {{
                    LINKEDIN: "LinkedIn",
                    INSTAGRAM: "Instagram",
                    FACEBOOK: "Facebook",
                  }[String(variant.channel)] || "Beitrag"}
                </strong>
                {typeof variant.text === "string" && (
                  <p className="studio-chat-message">{variant.text}</p>
                )}
                {typeof variant.cta === "string" && <p>{variant.cta}</p>}
              </div>
            ))}
          {typeof post.hashtags === "string" && <p>{post.hashtags}</p>}
          {typeof post.imageIdea === "string" && (
            <details>
              <summary>Bildidee ansehen</summary>
              <p>{post.imageIdea}</p>
            </details>
          )}
        </div>
      ))}
      {!data.assetId && !data.reply && !posts.length && (
        <p>Für diesen Auftrag ist keine Vorschau verfügbar.</p>
      )}
    </div>
  );
}
