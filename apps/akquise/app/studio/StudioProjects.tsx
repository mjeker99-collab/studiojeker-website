import { useState } from "react";
import type { studioState } from "@/lib/studio/service";
type State = Awaited<ReturnType<typeof studioState>>;
export default function StudioProjects({
  state,
  seriesId,
  customerId,
  campaignId,
  busy,
  onSeries,
  onCustomer,
  onCampaign,
  refresh,
  onAssign,
}: {
  state: State;
  seriesId: string;
  customerId: string;
  campaignId: string;
  busy: boolean;
  onSeries: (id: string) => void;
  onCustomer: (id: string) => void;
  onCampaign: (id: string) => void;
  refresh: () => void;
  onAssign: (data: {
    title: string;
    customerId: string | null;
    campaignId: string | null;
  }) => Promise<void>;
}) {
  const active = state.series.find((s) => s.id === seriesId);
  const brief = active?.briefing as { campaignId?: string | null } | undefined;
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState(false);
  const [title, setTitle] = useState(active?.title || "");
  const [assignedCustomer, setAssignedCustomer] = useState(
    active?.customerId || "",
  );
  const [assignedCampaign, setAssignedCampaign] = useState(
    brief?.campaignId || "",
  );
  const currentCustomer = editing ? assignedCustomer : customerId;
  const currentCampaign = editing ? assignedCampaign : campaignId;
  return (
    <details open className="studio-chat-controls">
      <summary>Projekte öffnen oder neues Gespräch beginnen</summary>
      <label>
        Projekt suchen
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Projektname oder Kampagne"
        />
      </label>
      <label>
        Gespräch / Content-Serie
        <select
          value={seriesId}
          disabled={busy}
          onChange={(e) => onSeries(e.target.value)}
        >
          <option value="">Neues Gespräch</option>
          {state.series
            .filter(
              (s) =>
                s.id === seriesId ||
                `${s.title} ${state.campaigns.find((c) => c.id === (s.briefing as { campaignId?: string }).campaignId)?.title || ""}`
                  .toLocaleLowerCase()
                  .includes(query.toLocaleLowerCase()),
            )
            .map((s) => (
              <option key={s.id} value={s.id}>
                {s.title} ·{" "}
                {state.campaigns.find(
                  (c) =>
                    c.id === (s.briefing as { campaignId?: string }).campaignId,
                )?.title || "Ohne Kampagne"}
              </option>
            ))}
        </select>
      </label>
      {!!seriesId && active && (
        <>
          <p>
            <strong>{active.title}</strong>
            <br />
            {state.customers.find((c) => c.id === active.customerId)?.name ||
              state.organization?.name ||
              "Studiojeker"}
            {" · "}
            {state.campaigns.find((c) => c.id === brief?.campaignId)?.title ||
              "Ohne Kampagne"}
          </p>
          {!editing && (
            <button
              type="button"
              className="secondary"
              disabled={busy}
              onClick={() => {
                setTitle(active.title);
                setAssignedCustomer(active.customerId || "");
                setAssignedCampaign(brief?.campaignId || "");
                setEditing(true);
              }}
            >
              Projektname und Zuordnung ändern
            </button>
          )}
        </>
      )}
      {(!seriesId || editing) && (
        <>
          {editing && (
            <label>
              Projektname
              <input
                value={title}
                maxLength={200}
                disabled={busy}
                onChange={(e) => setTitle(e.target.value)}
              />
            </label>
          )}
          <label>
            Für welche Firma?
            <select
              value={currentCustomer}
              disabled={busy}
              onChange={(e) => {
                if (editing) {
                  setAssignedCustomer(e.target.value);
                  setAssignedCampaign("");
                } else onCustomer(e.target.value);
              }}
            >
              <option value="">
                {state.organization?.name || "Studiojeker"}
              </option>
              {state.customers.map((customer) => (
                <option key={customer.id} value={customer.id}>
                  {customer.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Kampagne
            <select
              value={currentCampaign}
              disabled={busy}
              onChange={(e) => {
                if (editing) setAssignedCampaign(e.target.value);
                else onCampaign(e.target.value);
              }}
            >
              <option value="">Ohne Kampagne</option>
              {state.campaigns
                .filter(
                  (c) =>
                    !currentCustomer ||
                    (c.customerId || null) === currentCustomer ||
                    (!c.customerId && !currentCustomer),
                )
                .map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title}
                  </option>
                ))}
            </select>
          </label>
          {editing && (
            <>
              <p className="muted">
                Die Zuordnung gilt für das Gespräch und seine Entwürfe. Bei
                einem Kampagnenwechsel werden neue Inhaltsversionen gespeichert.
                Bereits geprüfte Inhalte bleiben geschützt.
              </p>
              <button
                type="button"
                disabled={busy || !title.trim()}
                onClick={() => {
                  void onAssign({
                    title: title.trim(),
                    customerId: assignedCustomer || null,
                    campaignId: assignedCampaign || null,
                  })
                    .then(() => setEditing(false))
                    .catch(() => {});
                }}
              >
                Zuordnung sichern
              </button>
              <button
                type="button"
                className="secondary"
                disabled={busy}
                onClick={() => setEditing(false)}
              >
                Abbrechen
              </button>
            </>
          )}
        </>
      )}
      <button
        type="button"
        className="secondary"
        disabled={busy}
        onClick={refresh}
      >
        Status aktualisieren
      </button>
    </details>
  );
}
