"use client";

import { useRef, useState } from "react";
import { LibraryPicker } from "../library/Library";

type Props = { value: string; onChange: (url: string) => void };

export default function NewsletterImageField({ value, onChange }: Props) {
  const fileInput = useRef<HTMLInputElement>(null);
  const [picker, setPicker] = useState(false);
  const [rights, setRights] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");

  async function upload(file: File) {
    if (!rights) { setError("Bitte zuerst die Bildrechte bestätigen."); return; }
    if (file.size > 8 * 1024 * 1024) { setError("Maximal 8 MB pro Bild."); return; }
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const result = await fetch("/api/mailchimp/images", {
        method: "POST",
        headers: { "x-file-name": encodeURIComponent(file.name), "x-rights-confirmed": "true" },
        body: file,
        signal: AbortSignal.timeout(35000),
      });
      const payload = await result.json();
      if (!result.ok) throw new Error(payload.error || "Bild konnte nicht hochgeladen werden.");
      onChange(payload.url);
      setNotice("Bild zu Mailchimp hochgeladen und im Newsletter eingefügt. Newsletter noch speichern.");
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div style={{ display: "grid", gap: 10, width: "100%" }}>
      {value.startsWith("https://") && (
        <div style={{ borderRadius: 12, border: "1px solid #dbe1e6", overflow: "hidden", maxWidth: 360 }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Dynamic Mailchimp CDN URLs */}
          <img src={value} alt="Aktuelles Newsletter-Bild" loading="lazy" referrerPolicy="no-referrer" style={{ width: "100%", height: 150, objectFit: "contain", display: "block" }} />
        </div>
      )}
      <input type="url" required maxLength={2000} value={value} onChange={(e) => onChange(e.target.value)} aria-label="Bild-URL" />
      <label style={{ display: "flex", alignItems: "center", gap: 8, fontWeight: 400 }}>
        <input type="checkbox" checked={rights} onChange={(e) => setRights(e.target.checked)} />
        Ich bestätige die Nutzungsrechte für den Newsletter und den Upload zu Mailchimp.
      </label>
      <div className="actions">
        <button type="button" className="secondary" disabled={busy || !rights} onClick={() => fileInput.current?.click()}>
          {busy ? "Bild wird hochgeladen…" : "↑ Bild hochladen"}
        </button>
        <button type="button" className="secondary" disabled={busy || !rights} onClick={() => setPicker(true)}>
          Bild aus Bibliothek wählen
        </button>
      </div>
      <input ref={fileInput} type="file" accept="image/jpeg,image/png,image/webp" hidden onChange={(e) => {
        const file = e.target.files?.[0];
        if (file) void upload(file);
        e.target.value = "";
      }} />
      {picker && <LibraryPicker imagesOnly onClose={() => setPicker(false)} onSelect={(item) => {
        setPicker(false);
        if (!item.asset?.mime.startsWith("image/")) return;
        setBusy(true);
        setError("");
        fetch(`/api/studio/assets/${encodeURIComponent(item.asset.id)}`, { cache: "no-store" })
          .then(async (response) => {
            if (!response.ok) throw new Error("Bibliotheksbild konnte nicht geladen werden.");
            return response.blob();
          })
          .then((blob) => upload(new File([blob], item.title + ".png", { type: blob.type })))
          .catch((e) => setError((e as Error).message))
          .finally(() => setBusy(false));
      }} />}
      {error && <p role="alert">{error}</p>}
      {notice && <p role="status">{notice}</p>}
      <small className="muted">JPEG, PNG oder WebP bis 8 MB. Die Bilder werden in Mailchimps Dateimanager gespeichert, damit sie in E-Mails öffentlich sichtbar sind.</small>
    </div>
  );
}
