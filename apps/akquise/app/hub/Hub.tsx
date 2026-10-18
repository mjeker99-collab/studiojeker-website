"use client";
import {
  NewsletterFields,
  NewsletterPreview,
} from "../newsletter/NewsletterEditor";
import {
  newsletterLibrary,
  newsletterDefaults,
  newsletterText,
} from "@/lib/hub/newsletter-template";
import StudioLayoutPreview from "../studio/StudioLayoutPreview";
import SocialConnections from "./SocialConnections";
import { useEffect, useState } from "react";
import type { hubState } from "@/lib/hub/api";
import { channels, type ContentInput } from "@/lib/hub/input";
import { displayTime, zurichInput, zurichInstant } from "@/lib/hub/time";
type HubState = Awaited<ReturnType<typeof hubState>>;
type Content = HubState["contents"][number];
type Campaign = HubState["campaigns"][number];
const channelLabels: Record<string, string> = {
  LINKEDIN: "LinkedIn",
  INSTAGRAM: "Instagram",
  FACEBOOK: "Facebook",
  NEWSLETTER: "Newsletter",
  ACQUISITION: "Akquise",
};
const statusLabels: Record<string, string> = {
  DRAFT: "Entwurf",
  IN_REVIEW: "Zur Prüfung",
  APPROVED: "Freigegeben",
  DONE: "Erledigt",
  INVALIDATED: "Ungültig",
  REJECTED: "Abgelehnt",
  PENDING: "Zur Prüfung",
};
const newContent = (
  kind: "SOCIAL" | "NEWSLETTER",
  ownerId: string,
): ContentInput => ({
  kind,
  title: "",
  ownerId,
  campaignId: null,
  scheduledAt: null,
  subject: "",
  preheader: "",
  body: "",
  audience: "",
  variants:
    kind === "SOCIAL"
      ? [
          {
            channel: "LINKEDIN",
            text: "",
            link: "",
            cta: "",
            mediaType: "NONE",
            mediaUrl: "",
            mediaReference: "",
            scheduledAt: null,
          },
        ]
      : [],
});
async function post(path: string, body: unknown) {
  const r = await fetch("/api/hub/" + path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await r.json();
  if (!r.ok) throw new Error(data.error);
  return data;
}
function download(name: string, value: string, type: string) {
  const url = URL.createObjectURL(new Blob([value], { type }));
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
function DateField({
  label,
  value,
  change,
}: {
  label: string;
  value: string | null;
  change: (value: string | null) => void;
}) {
  const [error, setError] = useState("");
  const [invalid, setInvalid] = useState("");
  return (
    <label>
      {label} (Zürich)
      <input
        type="datetime-local"
        value={error ? invalid : zurichInput(value)}
        aria-invalid={!!error}
        onChange={(e) => {
          try {
            const result = zurichInstant(e.target.value);
            setError("");
            e.target.setCustomValidity("");
            change(result);
          } catch (failure) {
            setInvalid(e.target.value);
            setError((failure as Error).message);
            e.target.setCustomValidity((failure as Error).message);
            change(null);
          }
        }}
      />
      {error && (
        <span role="alert" className="date-error">
          {error}
        </span>
      )}
    </label>
  );
}
export default function Hub({
  section,
  userId,
}: {
  section: string;
  userId: string;
}) {
  const [templateId, setTemplateId] = useState("master-v7");
  const [mailchimp, setMailchimp] = useState<{ connected: boolean; audiences: { id: string; name: string }[] } | null>(null);
  const [mailchimpError, setMailchimpError] = useState("");
  const [audienceId, setAudienceId] = useState("");
  const [showOriginal, setShowOriginal] = useState(false);
  const [data, setData] = useState<HubState | null>(null);
  const [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<Content | null>(null),
    [form, setForm] = useState<ContentInput | null>(null),
    [read, setRead] = useState(false);
  const [campaign, setCampaign] = useState<Campaign | null>(null),
    [campaignForm, setCampaignForm] = useState<{
      title: string;
      goal: string;
      audience: string;
      startsAt: string | null;
      endsAt: string | null;
      ownerId: string;
    } | null>(null);
  const [channel, setChannel] = useState(""),
    [campaignFilter, setCampaignFilter] = useState(""),
    [owner, setOwner] = useState(""),
    [status, setStatus] = useState("");
  const [mode, setMode] = useState("calendar"),
    [month, setMonth] = useState(() => zurichInput(new Date()).slice(0, 7));
  const [publication, setPublication] = useState({
    channel: "LINKEDIN",
    publishedAt: null as string | null,
    url: "",
    confirmed: false,
  });
  async function refresh() {
    const r = await fetch("/api/hub/state", { cache: "no-store" });
    const j = await r.json();
    if (!r.ok) throw new Error(j.error);
    setData(j);
  }
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/hub/state", { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        const j = await r.json();
        if (!r.ok) throw new Error(j.error);
        setData(j);
      })
      .catch((e) => {
        if (e.name !== "AbortError") setError(e.message);
      });
    return () => controller.abort();
  }, []);
  useEffect(() => {
    if (section !== "Newsletter" && section !== "Einstellungen") return;
    const controller = new AbortController();
    fetch("/api/hub/mailchimp/audiences", { cache: "no-store", signal: controller.signal })
      .then(async (r) => {
        const result = await r.json();
        if (!r.ok) throw new Error(result.error);
        setMailchimp(result);
        setMailchimpError("");
      })
      .catch((e) => { if (e.name !== "AbortError") setMailchimpError(e.message); });
    return () => controller.abort();
  }, [section]);
  async function act(fn: () => Promise<unknown>, message = "Gespeichert.") {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      await fn();
      await refresh();
      setNotice(message);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  function edit(c: Content) {
    setEditing(c);
    setForm(c.versions[0].payload as unknown as ContentInput);
    setRead(false);
    setPublication({
      channel:
        (c.versions[0].payload as unknown as ContentInput).variants[0]
          ?.channel || "LINKEDIN",
      publishedAt: null,
      url: "",
      confirmed: false,
    });
  }
  const dirty =
    !!form &&
    (!editing ||
      JSON.stringify(form) !== JSON.stringify(editing.versions[0].payload));
  function update(patch: Partial<ContentInput>) {
    setForm((f) => f && { ...f, ...patch });
    setRead(false);
  }
  if (!data)
    return (
      <section className="panel padded">
        <p role={error ? "alert" : "status"}>
          {error || "Marketing Hub wird geladen …"}
        </p>
      </section>
    );
  const users = data.users;
  const userName = (id: string | null) =>
    users.find((u) => u.id === id)?.name || "Nicht zugewiesen";
  const campaignName = (id: string | null) =>
    data.campaigns.find((c) => c.id === id)?.title || "Ohne Kampagne";
  const options = (kind: "owner" | "campaign") =>
    kind === "owner"
      ? users.map((u) => (
          <option key={u.id} value={u.id}>
            {u.name}
          </option>
        ))
      : data.campaigns.map((c) => (
          <option key={c.id} value={c.id}>
            {c.title}
          </option>
        ));
  const filtered = data.contents.filter(
    (c) =>
      (!campaignFilter || c.campaignId === campaignFilter) &&
      (!owner || c.ownerId === owner) &&
      (!status || c.status === status) &&
      (!channel ||
        (c.kind === "NEWSLETTER"
          ? channel === "NEWSLETTER"
          : (c.versions[0].payload as unknown as ContentInput).variants.some(
              (v) => v.channel === channel,
            ))),
  );
  const visible = filtered.filter((c) =>
    section === "Social Media"
      ? c.kind === "SOCIAL"
      : section === "Newsletter"
        ? c.kind === "NEWSLETTER"
        : true,
  );
  const filters = (
    <div className="hub-filters">
      <label>
        Kanal
        <select value={channel} onChange={(e) => setChannel(e.target.value)}>
          <option value="">Alle Kanäle</option>
          {Object.entries(channelLabels).map(([key, name]) => (
            <option key={key} value={key}>
              {name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Kampagne
        <select
          value={campaignFilter}
          onChange={(e) => setCampaignFilter(e.target.value)}
        >
          <option value="">Alle Kampagnen</option>
          {options("campaign")}
        </select>
      </label>
      <label>
        Verantwortlich
        <select value={owner} onChange={(e) => setOwner(e.target.value)}>
          <option value="">Alle Personen</option>
          {options("owner")}
        </select>
      </label>
      <label>
        Redaktionsstatus
        <select value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="">Alle Status</option>
          {["DRAFT", "IN_REVIEW", "APPROVED", "DONE"].map((s) => (
            <option key={s} value={s}>
              {statusLabels[s]}
            </option>
          ))}
        </select>
      </label>
    </div>
  );
  const cards = (items: Content[]) => (
    <div className="hub-cards">
      {items.map((c) => {
        const p = c.versions[0].payload as unknown as ContentInput;
        const published = c.publications.filter((x) => x.version === c.version);
        return (
          <article className="panel hub-card" data-content-id={c.id} key={c.id}>
            <div className="section-head">
              <span className="eyebrow">
                {c.kind === "SOCIAL"
                  ? p.variants.map((v) => channelLabels[v.channel]).join(" · ")
                  : "NEWSLETTER"}
              </span>
              <span className={`badge b-${c.status}`}>
                {statusLabels[c.status]}
              </span>
            </div>
            <div className="padded">
              <h2>{c.title}</h2>
              <p className="muted">
                {campaignName(c.campaignId)} · {userName(c.ownerId)} · V
                {c.version}
              </p>
              <p className="hub-excerpt">
                {c.kind === "SOCIAL"
                  ? p.variants[0]?.text
                  : p.preheader || p.subject}
              </p>
              <p>
                {c.kind === "SOCIAL"
                  ? `${published.length}/${p.variants.length} manuell veröffentlicht`
                  : c.exports.some((x) => x.version === c.version)
                    ? "Exportiert · nicht übertragen · nicht versandt"
                    : "Nicht exportiert · nicht übertragen · nicht versandt"}
              </p>
              <button className="secondary" onClick={() => edit(c)}>
                Inhalt öffnen ↗
              </button>
              {c.kind === "NEWSLETTER" && (
                <button
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      const copy = await post("newsletter-duplicate/" + c.id, {
                        version: c.version,
                      });
                      const r = await fetch("/api/hub/state", {
                        cache: "no-store",
                      });
                      if (!r.ok)
                        throw new Error("Kopie gespeichert. Bitte neu laden.");
                      const updated: HubState = await r.json();
                      edit(updated.contents.find((x) => x.id === copy.id)!);
                    }, "Kopie als neuer Entwurf erstellt.")
                  }
                >
                  Duplizieren
                </button>
              )}
            </div>
          </article>
        );
      })}
      {!items.length && (
        <p className="empty">
          Keine Inhalte für diese Auswahl. Einen Entwurf erstellen oder Filter
          ändern.
        </p>
      )}
    </div>
  );
  type Event = {
    key: string;
    title: string;
    at: string | Date | null;
    channel: string;
    campaignId: string | null;
    ownerId: string | null;
    status: string;
    content?: Content;
    publication: string;
  };
  const events: Event[] = [];
  for (const c of data.contents) {
    const p = c.versions[0].payload as unknown as ContentInput;
    const variants =
      c.kind === "SOCIAL"
        ? p.variants
        : [{ channel: "NEWSLETTER", scheduledAt: c.scheduledAt }];
    for (const v of variants)
      events.push({
        key: c.id + v.channel,
        title: c.title,
        at: v.scheduledAt,
        channel: v.channel,
        campaignId: c.campaignId,
        ownerId: c.ownerId,
        status: c.status,
        content: c,
        publication: c.publications.some(
          (x) => x.version === c.version && x.channel === v.channel,
        )
          ? "Manuell veröffentlicht"
          : c.kind === "NEWSLETTER"
            ? "Nicht übertragen / nicht versandt"
            : "Nicht veröffentlicht",
      });
  }
  for (const d of data.drafts)
    events.push({
      key: d.id,
      title: d.versions[0]?.subject || "Akquise-Entwurf",
      at: d.scheduledAt,
      channel: "ACQUISITION",
      campaignId: d.campaignId,
      ownerId: d.ownerId,
      status:
        (
          { PENDING: "IN_REVIEW", APPROVED: "APPROVED" } as Record<
            string,
            string
          >
        )[
          d.approvals.find(
            (a) => a.version === d.version && a.status !== "INVALIDATED",
          )?.status || ""
        ] || "DRAFT",
      publication: d.deliveries.some((x) => x.status === "SENT")
        ? "Versandt laut Versandhistorie"
        : "Nicht versandt",
    });
  const filteredEvents = events
    .filter(
      (e) =>
        (!channel || e.channel === channel) &&
        (!campaignFilter || e.campaignId === campaignFilter) &&
        (!owner || e.ownerId === owner) &&
        (!status || e.status === status),
    )
    .sort(
      (a, b) =>
        (a.at ? new Date(a.at).valueOf() : Infinity) -
        (b.at ? new Date(b.at).valueOf() : Infinity),
    );
  const first = new Date(month + "-01T12:00:00Z");
  const start = new Date(first);
  start.setUTCDate(1 - ((first.getUTCDay() + 6) % 7));
  return (
    <div className="hub" aria-busy={busy}>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="notice">
          {notice}
        </p>
      )}
      <p className="hub-connection">
        Planung &amp; Freigabe · Veröffentlichungen nur nach gesonderter Prüfung.
      </p>
      {section === "Social Media" && <SocialConnections userId={userId} />}
      {section === "Übersicht" && (
        <>
          <div className="metrics">
            {[
              ["Kampagnen", data.campaigns.length],
              [
                "Social-Entwürfe",
                data.contents.filter((c) => c.kind === "SOCIAL").length,
              ],
              [
                "Newsletter",
                data.contents.filter((c) => c.kind === "NEWSLETTER").length,
              ],
              [
                "In Prüfung",
                data.contents.filter((c) => c.status === "IN_REVIEW").length,
              ],
            ].map(([label, n]) => (
              <article className="metric" key={label}>
                <span>{label}</span>
                <div>{n}</div>
              </article>
            ))}
          </div>
          <section className="panel padded">
            <h2>Gemeinsam planen. Bewusst veröffentlichen.</h2>
            <p>
              Geplante Termine lösen keine Veröffentlichung aus. Jeder Kanal
              behält seinen Text, seine Medien und seinen dokumentierten Status.
            </p>
            <p className="muted">
              Nächster Termin:{" "}
              {displayTime(
                filteredEvents.find((e) => e.at && new Date(e.at) >= new Date())
                  ?.at,
              )}
            </p>
          </section>
        </>
      )}
      {section === "Kampagnen" && (
        <>
          <div className="actions">
            <button
              onClick={() => {
                setCampaign(null);
                setCampaignForm({
                  title: "",
                  goal: "",
                  audience: "",
                  startsAt: null,
                  endsAt: null,
                  ownerId: userId,
                });
              }}
            >
              Kampagne erstellen ＋
            </button>
          </div>
          <div className="hub-cards">
            {data.campaigns.map((c) => (
              <article className="panel padded" key={c.id}>
                <p className="eyebrow">KAMPAGNE · {userName(c.ownerId)}</p>
                <h2>{c.title}</h2>
                <p>{c.goal}</p>
                <p>Zielgruppe: {c.audience}</p>
                <p>
                  {displayTime(c.startsAt)} – {displayTime(c.endsAt)}
                </p>
                <p>
                  {c._count.contents} Marketing-Inhalte · {c._count.drafts}{" "}
                  Akquise-Entwürfe
                </p>
                <button
                  className="secondary"
                  onClick={() => {
                    setCampaign(c);
                    setCampaignForm({
                      title: c.title,
                      goal: c.goal,
                      audience: c.audience,
                      startsAt: new Date(c.startsAt).toISOString(),
                      endsAt: new Date(c.endsAt).toISOString(),
                      ownerId: c.ownerId,
                    });
                  }}
                >
                  Kampagne bearbeiten
                </button>
                <details>
                  <summary>Zugeordnete Inhalte</summary>
                  {data.contents
                    .filter((x) => x.campaignId === c.id)
                    .map((x) => (
                      <p key={x.id}>
                        <button className="text-button" onClick={() => edit(x)}>
                          {x.title}
                        </button>
                      </p>
                    ))}
                  {data.drafts
                    .filter((x) => x.campaignId === c.id)
                    .map((x) => (
                      <p key={x.id}>Akquise · {x.versions[0]?.subject}</p>
                    ))}
                </details>
              </article>
            ))}
          </div>
          {!data.campaigns.length && (
            <p className="empty">
              Noch keine Kampagne. Bestehende Entwürfe bleiben ohne Zuordnung
              erhalten.
            </p>
          )}
        </>
      )}
      {campaignForm && (
        <section className="panel padded hub-editor">
          <h2>{campaign ? "Kampagne bearbeiten" : "Neue Kampagne"}</h2>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                await post(
                  campaign ? "campaigns/" + campaign.id : "campaigns",
                  campaign
                    ? { version: campaign.revision, data: campaignForm }
                    : campaignForm,
                );
                setCampaignForm(null);
              });
            }}
          >
            <label>
              Kampagnentitel
              <input
                required
                value={campaignForm.title}
                onChange={(e) =>
                  setCampaignForm({ ...campaignForm, title: e.target.value })
                }
              />
            </label>
            <label>
              Ziel
              <textarea
                required
                value={campaignForm.goal}
                onChange={(e) =>
                  setCampaignForm({ ...campaignForm, goal: e.target.value })
                }
              />
            </label>
            <label>
              Zielgruppe
              <textarea
                required
                value={campaignForm.audience}
                onChange={(e) =>
                  setCampaignForm({ ...campaignForm, audience: e.target.value })
                }
              />
            </label>
            <div className="form-grid">
              <DateField
                label="Beginn"
                value={campaignForm.startsAt}
                change={(v) =>
                  setCampaignForm({ ...campaignForm, startsAt: v })
                }
              />
              <DateField
                label="Ende"
                value={campaignForm.endsAt}
                change={(v) => setCampaignForm({ ...campaignForm, endsAt: v })}
              />
              <label>
                Verantwortliche Person
                <select
                  value={campaignForm.ownerId}
                  onChange={(e) =>
                    setCampaignForm({
                      ...campaignForm,
                      ownerId: e.target.value,
                    })
                  }
                >
                  {options("owner")}
                </select>
              </label>
            </div>
            <button
              disabled={busy || !campaignForm.startsAt || !campaignForm.endsAt}
            >
              Kampagne speichern
            </button>{" "}
            <button
              type="button"
              className="secondary"
              onClick={() => setCampaignForm(null)}
            >
              Schliessen
            </button>
          </form>
        </section>
      )}
      {["Social Media", "Newsletter"].includes(section) && (
        <>
          {section === "Newsletter" && (
            <section className="panel padded" aria-label="Vorlagenbibliothek">
              <h2>Vorlagen & bestehende Ausgaben</h2>
              <p>
                Die Originale bleiben als geschützte Vorlagen erhalten. Zum
                Weiterarbeiten einen Entwurf erstellen oder die bestehenden
                Ausgaben einmalig übernehmen.
              </p>
              <label>
                Newsletter-Vorlage
                <select
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                >
                  {newsletterLibrary.map((t) => (
                    <option key={t.id} value={t.id}>
                      {t.name}
                    </option>
                  ))}
                </select>
              </label>
              <div className="actions">
                <button
                  type="button"
                  className="secondary"
                  onClick={() => setShowOriginal(!showOriginal)}
                >
                  {showOriginal
                    ? "Originalvorschau schliessen"
                    : "Original ansehen"}
                </button>
                <button
                  type="button"
                  className="secondary"
                  disabled={busy}
                  onClick={() =>
                    act(async () => {
                      await post("newsletter/import", {});
                    }, "Vorhandene Newsletter übernommen. Bereits importierte Ausgaben bleiben erhalten.")
                  }
                >
                  Bestehende Ausgaben importieren
                </button>
              </div>
              {showOriginal && (
                <NewsletterPreview
                  html={
                    newsletterLibrary.find((t) => t.id === templateId)!.html
                  }
                />
              )}
            </section>
          )}
          <div className="actions">
            <button
              onClick={() => {
                setEditing(null);
                const fresh = newContent(
                  section === "Newsletter" ? "NEWSLETTER" : "SOCIAL",
                  userId,
                );
                if (fresh.kind === "NEWSLETTER") {
                  const template = newsletterLibrary.find(
                    (t) => t.id === templateId,
                  )!;
                  fresh.newsletter = newsletterDefaults(templateId);
                  fresh.title = template.name + " · Entwurf";
                  fresh.subject = template.subject;
                  fresh.preheader = template.preheader;
                  fresh.body = newsletterText(fresh.newsletter);
                }
                setForm(fresh);
                setRead(false);
              }}
            >
              {" "}
              {section === "Newsletter"
                ? "Newsletter erstellen"
                : "Beitrag erstellen"}{" "}
              ＋
            </button>
          </div>
          {section === "Newsletter" && (
            <p>
              Studiojeker-Vorlage · Freigegebene Newsletter können als
              Mailchimp-Entwurf übertragen werden. Empfänger und Versand in
              Mailchimp prüfen.
            </p>
          )}
          {filters}
          {cards(visible)}
        </>
      )}
      {form && (
        <section className="panel padded hub-editor" aria-label="Inhaltseditor">
          <div className="section-head">
            <h2>
              {editing
                ? `Inhalt bearbeiten · V${editing.version}`
                : "Neuer Inhalt"}
            </h2>
            <button className="secondary" onClick={() => setForm(null)}>
              Editor schliessen
            </button>
          </div>
          <form
            onSubmit={(e) => {
              e.preventDefault();
              act(async () => {
                const saved = await post(
                  editing ? "contents/" + editing.id : "contents",
                  editing ? { version: editing.version, data: form } : form,
                );
                const r = await fetch("/api/hub/state");
                const updated: HubState = await r.json();
                const c = updated.contents.find((x) => x.id === saved.id)!;
                setData(updated);
                edit(c);
              }, "Version gespeichert. Eine bisherige Freigabe ist ungültig.");
            }}
          >
            <label>
              Interner Titel
              <input
                required
                maxLength={200}
                value={form.title}
                onChange={(e) => update({ title: e.target.value })}
              />
            </label>
            <div className="form-grid">
              <label>
                Zugeordnete Kampagne
                <select
                  value={form.campaignId || ""}
                  onChange={(e) =>
                    update({ campaignId: e.target.value || null })
                  }
                >
                  <option value="">Ohne Kampagne</option>
                  {options("campaign")}
                </select>
              </label>
              <label>
                Verantwortliche Person
                <select
                  value={form.ownerId}
                  onChange={(e) => update({ ownerId: e.target.value })}
                >
                  {options("owner")}
                </select>
              </label>
            </div>
            {form.kind === "SOCIAL" ? (
              <>
                <fieldset>
                  <legend>Studiojeker-Kanäle</legend>
                  <div className="actions">
                    {channels.map((ch) => (
                      <label className="check" key={ch}>
                        <input
                          type="checkbox"
                          checked={form.variants.some((v) => v.channel === ch)}
                          onChange={(e) =>
                            update({
                              variants: e.target.checked
                                ? [
                                    ...form.variants,
                                    {
                                      channel: ch,
                                      text: "",
                                      link: "",
                                      cta: "",
                                      mediaType: "NONE",
                                      mediaUrl: "",
                                      mediaReference: "",
                                      scheduledAt: null,
                                    },
                                  ]
                                : form.variants.filter((v) => v.channel !== ch),
                            })
                          }
                        />
                        {channelLabels[ch]}
                      </label>
                    ))}
                  </div>
                </fieldset>
                {form.variants.map((v, index) => {
                  const change = (patch: Partial<typeof v>) =>
                    update({
                      variants: form.variants.map((x, i) =>
                        i === index ? { ...x, ...patch } : x,
                      ),
                    });
                  return (
                    <fieldset className="hub-variant" key={v.channel}>
                      <legend>{channelLabels[v.channel]}</legend>
                      <label>
                        {channelLabels[v.channel]} Text
                        <textarea
                          required
                          rows={5}
                          value={v.text}
                          onChange={(e) => change({ text: e.target.value })}
                        />
                      </label>
                      <div className="form-grid">
                        <label>
                          {channelLabels[v.channel]} Link
                          <input
                            type="url"
                            value={v.link}
                            onChange={(e) => change({ link: e.target.value })}
                          />
                        </label>
                        <label>
                          {channelLabels[v.channel]} Handlungsaufforderung
                          <input
                            value={v.cta}
                            onChange={(e) => change({ cta: e.target.value })}
                          />
                        </label>
                        <label>
                          {channelLabels[v.channel]} Medientyp
                          <select
                            value={v.mediaType}
                            onChange={(e) =>
                              change({
                                mediaType: e.target.value as typeof v.mediaType,
                              })
                            }
                          >
                            <option value="NONE">Kein Medium</option>
                            <option value="IMAGE">Bild</option>
                            <option value="VIDEO">Video</option>
                          </select>
                        </label>
                        <label>
                          {channelLabels[v.channel]} Medien-URL
                          <input
                            type="url"
                            value={v.mediaUrl}
                            onChange={(e) =>
                              change({ mediaUrl: e.target.value })
                            }
                          />
                        </label>
                        <label>
                          {channelLabels[v.channel]} Medienreferenz
                          <input
                            placeholder="Asset-ID oder dokumentierter Ablageort"
                            value={v.mediaReference}
                            onChange={(e) =>
                              change({ mediaReference: e.target.value })
                            }
                          />
                        </label>
                        <DateField
                          label={
                            channelLabels[v.channel] +
                            " Veröffentlichung geplant"
                          }
                          value={v.scheduledAt}
                          change={(scheduledAt) => change({ scheduledAt })}
                        />
                      </div>
                    </fieldset>
                  );
                })}
              </>
            ) : (
              <>
                <label>
                  Betreff
                  <input
                    required
                    value={form.subject}
                    onChange={(e) => update({ subject: e.target.value })}
                  />
                </label>
                <label>
                  Preheader
                  <input
                    value={form.preheader}
                    onChange={(e) => update({ preheader: e.target.value })}
                  />
                </label>
                {form.newsletter ? (
                  <NewsletterFields
                    value={form.newsletter}
                    change={(newsletter) =>
                      update({ newsletter, body: newsletterText(newsletter) })
                    }
                  />
                ) : (
                  <label>
                    Newsletter-Inhalt
                    <textarea
                      required
                      rows={12}
                      value={form.body}
                      onChange={(e) => update({ body: e.target.value })}
                    />
                  </label>
                )}
                <label>
                  Empfänger / Zielgruppensegment
                  <textarea
                    required
                    value={form.audience}
                    onChange={(e) => update({ audience: e.target.value })}
                  />
                </label>
                <DateField
                  label="Newsletter geplant"
                  value={form.scheduledAt}
                  change={(scheduledAt) => update({ scheduledAt })}
                />
              </>
            )}
            <button
              disabled={
                busy ||
                !dirty ||
                (form.kind === "SOCIAL" && !form.variants.length)
              }
            >
              Version speichern
            </button>
          </form>
          {form.studio && editing && (
            <StudioLayoutPreview
              snapshot={form.studio}
              id={editing.id}
              version={editing.version}
              dirty={!!dirty}
            />
          )}
          <section className="hub-preview" aria-label="Beitragsvorschau">
            <p className="eyebrow">
              VORSCHAU ·{" "}
              {dirty ? "UNGESPEICHERT" : `VERSION ${editing?.version}`}
            </p>
            {form.kind === "SOCIAL" ? (
              form.variants.map((v) => (
                <article key={v.channel}>
                  <strong>studiojeker® · {channelLabels[v.channel]}</strong>
                  <p className="preserve-lines">{v.text}</p>
                  {v.mediaType !== "NONE" && (
                    <p className="hub-media">
                      {v.mediaType === "VIDEO" ? "▶ Video" : "▧ Bild"} ·{" "}
                      {v.mediaReference || v.mediaUrl}
                      <br />
                      {v.mediaUrl && (
                        <a href={v.mediaUrl} target="_blank" rel="noreferrer">
                          Medium extern prüfen ↗
                        </a>
                      )}
                    </p>
                  )}
                  <p>{v.cta}</p>
                  {v.link && (
                    <a
                      href={v.link.startsWith("https://") ? v.link : undefined}
                      target="_blank"
                      rel="noreferrer"
                    >
                      {v.link}
                    </a>
                  )}
                  <p className="muted">
                    Geplant: {displayTime(v.scheduledAt)} · keine automatische
                    Veröffentlichung
                  </p>
                </article>
              ))
            ) : form.newsletter ? (
              <NewsletterPreview
                subject={form.subject}
                preheader={form.preheader}
                newsletter={form.newsletter}
              />
            ) : (
              <article>
                <strong>studiojeker®</strong>
                <p className="muted">{form.preheader}</p>
                <h3>{form.subject}</h3>
                <p className="preserve-lines">{form.body}</p>
                <p>Zielgruppe: {form.audience}</p>
                <small>
                  HTML-Export mit Studiojeker-Gestaltung und
                  Mailchimp-Abmeldetags. Adress-/Merge-Tags vor Versand in
                  Mailchimp prüfen.
                </small>
              </article>
            )}
          </section>
          {editing && (
            <>
              <label className="check read-check">
                <input
                  type="checkbox"
                  checked={read}
                  disabled={dirty}
                  onChange={(e) => setRead(e.target.checked)}
                />
                Ich habe die vollständige Version mit allen Texten, Medien,
                Kanälen und der Zielgruppe geprüft.
              </label>
              <div className="actions">
                {(
                  [
                    ["PENDING", "Zur Prüfung"],
                    ["APPROVED", "Version freigeben"],
                    ["REJECTED", "Ablehnen"],
                  ] as const
                ).map(([decision, label]) => (
                  <button
                    key={decision}
                    className={decision === "APPROVED" ? "" : "secondary"}
                    disabled={
                      busy || dirty || (decision === "APPROVED" && !read)
                    }
                    onClick={() =>
                      act(async () => {
                        await post("review/" + editing.id, {
                          version: editing.version,
                          decision,
                          read,
                        });
                        setForm(null);
                      })
                    }
                  >
                    {label}
                  </button>
                ))}
                <button
                  className="secondary"
                  disabled={busy || dirty || editing.status !== "APPROVED"}
                  onClick={() =>
                    act(async () => {
                      await post("complete/" + editing.id, {
                        version: editing.version,
                      });
                      setForm(null);
                    }, "Redaktionell erledigt. Keine Veröffentlichung und kein Versand ausgelöst.")
                  }
                >
                  Redaktionell erledigt
                </button>
              </div>
              {form.kind === "NEWSLETTER" && (
                <section className="legal">
                  <h3>Mailchimp</h3>
                  <p>
                    Nur freigegebene Versionen. StudioONE versendet keine
                    Newsletter. Zielgruppe, Absender, Einwilligungen und
                    Testsendung vor dem Versand in Mailchimp prüfen.
                  </p>
                  {mailchimpError && <p role="alert">Verbindung: {mailchimpError}</p>}
                  {mailchimp && !mailchimp.connected && <p>Mailchimp ist noch nicht konfiguriert.</p>}
                  {!!mailchimp?.audiences.length && (
                    <label>
                      Mailchimp-Audience
                      <select value={audienceId} onChange={(e) => setAudienceId(e.target.value)}>
                        <option value="">Audience wählen</option>
                        {mailchimp.audiences.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
                      </select>
                    </label>
                  )}
                  {editing.mailchimpTransfers.map((t) => (
                    <p key={t.id}>
                      V{t.version}: {t.status === "DRAFT" ? "Entwurf übertragen" : "Übertragung ungeklärt – Mailchimp prüfen"}
                      {t.remoteId && ` · Kampagne ${t.remoteId}`}
                    </p>
                  ))}
                  {mailchimp?.connected && (
                    <button
                      type="button"
                      disabled={busy || dirty || !audienceId || !["APPROVED", "DONE"].includes(editing.status) || editing.mailchimpTransfers.some((t) => t.version === editing.version)}
                      onClick={() => act(async () => {
                        const result = await post("mailchimp-transfer/" + editing.id, { version: editing.version, audienceId });
                        setForm(null);
                        if (result.url) window.open(result.url, "_blank", "noopener,noreferrer");
                      }, "Entwurf an Mailchimp übertragen. Kein Versand ausgelöst.")}
                    >Entwurf an Mailchimp übertragen</button>
                  )}
                  <button
                    type="button"
                    disabled={
                      busy ||
                      dirty ||
                      !["APPROVED", "DONE"].includes(editing.status)
                    }
                    onClick={() =>
                      act(async () => {
                        const result = await post("export/" + editing.id, {
                          version: editing.version,
                        });
                        download(
                          `newsletter-${editing.id}-v${editing.version}.html`,
                          result.html,
                          "text/html;charset=utf-8",
                        );
                        download(
                          `newsletter-${editing.id}-v${editing.version}.txt`,
                          `Betreff: ${result.subject}\nPreheader: ${result.preheader}\n\n${result.text}`,
                          "text/plain;charset=utf-8",
                        );
                      }, "HTML/Text exportiert. Nichts an Mailchimp übertragen oder versandt.")
                    }
                  >
                    HTML & Text exportieren
                  </button>
                </section>
              )}
              {form.kind === "SOCIAL" && (
                <section className="legal">
                  <h3>Bereits manuell veröffentlicht?</h3>
                  <p>
                    Nur eine tatsächlich ausserhalb des Hubs erfolgte
                    Veröffentlichung dokumentieren. Dieser Knopf veröffentlicht
                    nichts.
                  </p>
                  <label>
                    Veröffentlichter Kanal
                    <select
                      value={publication.channel}
                      onChange={(e) =>
                        setPublication({
                          ...publication,
                          channel: e.target.value,
                        })
                      }
                    >
                      {form.variants.map((v) => (
                        <option key={v.channel} value={v.channel}>
                          {channelLabels[v.channel]}
                        </option>
                      ))}
                    </select>
                  </label>
                  <DateField
                    label="Tatsächlich veröffentlicht am"
                    value={publication.publishedAt}
                    change={(publishedAt) =>
                      setPublication({ ...publication, publishedAt })
                    }
                  />
                  <label>
                    Beitragslink (optional)
                    <input
                      type="url"
                      value={publication.url}
                      onChange={(e) =>
                        setPublication({ ...publication, url: e.target.value })
                      }
                    />
                  </label>
                  <label className="check">
                    <input
                      type="checkbox"
                      checked={publication.confirmed}
                      onChange={(e) =>
                        setPublication({
                          ...publication,
                          confirmed: e.target.checked,
                        })
                      }
                    />
                    Die Veröffentlichung ist bereits erfolgt.
                  </label>
                  <button
                    disabled={
                      busy ||
                      dirty ||
                      !publication.confirmed ||
                      !publication.publishedAt ||
                      !["APPROVED", "DONE"].includes(editing.status)
                    }
                    onClick={() =>
                      act(async () => {
                        await post("publication/" + editing.id, {
                          ...publication,
                          version: editing.version,
                        });
                        setForm(null);
                      }, "Manuelle Veröffentlichung dokumentiert; keine Schnittstelle aufgerufen.")
                    }
                  >
                    Veröffentlichung dokumentieren
                  </button>
                </section>
              )}
              <details>
                <summary>
                  Versionen, Freigaben, Exporte & Veröffentlichungshistorie
                </summary>
                {editing.versions.map((v) => (
                  <details key={v.id}>
                    <summary>
                      V{v.version} · {displayTime(v.createdAt)}
                    </summary>
                    <pre>{JSON.stringify(v.payload, null, 2)}</pre>
                  </details>
                ))}
                {editing.approvals.map((a) => (
                  <p key={a.id}>
                    {a.user.name} · V{a.version} · {statusLabels[a.status]} ·{" "}
                    {displayTime(a.createdAt)}
                  </p>
                ))}
                {editing.publications.map((p) => (
                  <p key={p.id}>
                    Manuell veröffentlicht · {channelLabels[p.channel]} · V
                    {p.version} · {displayTime(p.publishedAt)} ·{" "}
                    {userName(p.userId)}{" "}
                    {p.url && (
                      <a href={p.url} target="_blank" rel="noreferrer">
                        Beitragslink ↗
                      </a>
                    )}
                  </p>
                ))}
                {editing.exports.map((e) => (
                  <p key={e.id}>
                    Export V{e.version} · {displayTime(e.createdAt)} ·{" "}
                    {userName(e.userId)} · nicht übertragen
                  </p>
                ))}
              </details>
            </>
          )}
        </section>
      )}
      {section === "Kalender" && (
        <>
          <p>
            Alle Termine in Europe/Zurich. Ein Termin ist keine
            Veröffentlichung. Ungeplante Inhalte bleiben in der Liste sichtbar.
          </p>
          {filters}
          <div className="hub-calendar-toolbar">
            <button
              className="secondary"
              onClick={() => setMode(mode === "calendar" ? "list" : "calendar")}
            >
              {mode === "calendar" ? "Listenansicht" : "Kalenderansicht"}
            </button>
            <label>
              Monat
              <input
                type="month"
                value={month}
                onChange={(e) => {
                  if (e.target.value) setMonth(e.target.value);
                }}
              />
            </label>
          </div>
          {mode === "calendar" ? (
            <div className="hub-calendar" aria-label="Redaktionskalender">
              {["Mo", "Di", "Mi", "Do", "Fr", "Sa", "So"].map((day) => (
                <strong className="hub-weekday" key={day}>
                  {day}
                </strong>
              ))}
              {Array.from({ length: 42 }, (_, index) => {
                const day = new Date(start);
                day.setUTCDate(start.getUTCDate() + index);
                const key = day.toISOString().slice(0, 10);
                return (
                  <div
                    className={
                      key.startsWith(month) ? "hub-day" : "hub-day outside"
                    }
                    key={key}
                  >
                    <time dateTime={key}>{day.getUTCDate()}</time>
                    {filteredEvents
                      .filter((e) => zurichInput(e.at).slice(0, 10) === key)
                      .map((e) => (
                        <button
                          className="hub-event"
                          key={e.key}
                          onClick={() =>
                            e.content
                              ? edit(e.content)
                              : document
                                  .getElementById("acquisition-planning")
                                  ?.scrollIntoView()
                          }
                        >
                          <span>{channelLabels[e.channel]}</span>
                          {e.title}
                          <small>{statusLabels[e.status]}</small>
                        </button>
                      ))}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="hub-agenda">
              {filteredEvents.map((e) => (
                <article className="panel padded" key={e.key}>
                  <p className="eyebrow">
                    {channelLabels[e.channel]} · {displayTime(e.at)}
                  </p>
                  <h3>{e.title}</h3>
                  <p>
                    {campaignName(e.campaignId)} · {userName(e.ownerId)} ·{" "}
                    {statusLabels[e.status]}
                  </p>
                  <p>{e.publication}</p>
                  {e.content && (
                    <button
                      className="secondary"
                      onClick={() => edit(e.content!)}
                    >
                      Inhalt öffnen ↗
                    </button>
                  )}
                </article>
              ))}
              {!filteredEvents.length && (
                <p className="empty">Keine Inhalte für diese Filter.</p>
              )}
            </div>
          )}
          <DraftPlanning data={data} busy={busy} act={act} />
        </>
      )}
      {section === "Einstellungen" && (
        <>
        <SocialConnections userId={userId} />
        <section className="panel padded">
          <h2>Marketing-Verbindungen</h2>
          <p>
            Social-Media-Verbindungen werden oben angezeigt. Keine automatische Veröffentlichung.
          </p>
          <p>
            Mailchimp: {mailchimpError || (mailchimp?.connected
              ? `verbunden · ${mailchimp.audiences.length} Audiences sichtbar`
              : "nicht konfiguriert")}. Freigegebene Newsletter können als
            Entwurf übertragen werden. Kein Versand aus StudioONE.
          </p>
          <p>
            Kalender: Europe/Zurich · Speicherung als UTC-Zeitpunkte. Medien
            werden referenziert, nicht gehostet.
          </p>
        </section>
        </>
      )}
    </div>
  );
}
function DraftPlanning({
  data,
  busy,
  act,
}: {
  data: HubState;
  busy: boolean;
  act: (fn: () => Promise<unknown>, message?: string) => Promise<void>;
}) {
  const [id, setId] = useState(""),
    [campaignId, setCampaignId] = useState(""),
    [ownerId, setOwnerId] = useState(""),
    [at, setAt] = useState<string | null>(null);
  const draft = data.drafts.find((d) => d.id === id);
  return (
    <section className="panel padded" id="acquisition-planning">
      <h2>Akquise-Aktion einplanen</h2>
      <p>
        Die Planung verändert weder Nachrichtentext noch Versandfreigabe und
        löst keinen Versand aus.
      </p>
      <label>
        Akquise-Entwurf
        <select
          value={id}
          onChange={(e) => {
            const d = data.drafts.find((d) => d.id === e.target.value);
            setId(e.target.value);
            setCampaignId(d?.campaignId || "");
            setOwnerId(d?.ownerId || "");
            setAt(
              d?.scheduledAt ? new Date(d.scheduledAt).toISOString() : null,
            );
          }}
        >
          <option value="">Entwurf wählen</option>
          {data.drafts.map((d) => (
            <option key={d.id} value={d.id}>
              {d.versions[0]?.subject}
            </option>
          ))}
        </select>
      </label>
      {draft && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            act(
              () =>
                post("draft-plan/" + id, {
                  version: draft.planningRevision,
                  campaignId: campaignId || null,
                  ownerId: ownerId || null,
                  scheduledAt: at,
                }),
              "Akquise geplant. Kein Versandauftrag erzeugt.",
            );
          }}
        >
          <div className="form-grid">
            <label>
              Akquise-Kampagne
              <select
                value={campaignId}
                onChange={(e) => setCampaignId(e.target.value)}
              >
                <option value="">Ohne Kampagne</option>
                {data.campaigns.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Akquise-Verantwortung
              <select
                value={ownerId}
                onChange={(e) => setOwnerId(e.target.value)}
              >
                <option value="">Nicht zugewiesen</option>
                {data.users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.name}
                  </option>
                ))}
              </select>
            </label>
            <DateField label="Akquise geplant" value={at} change={setAt} />
          </div>
          <button disabled={busy}>Akquise-Planung speichern</button>
        </form>
      )}
    </section>
  );
}
