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
}) {
  return (
    <details className="studio-chat-controls">
      <summary>Projekte öffnen oder neues Gespräch beginnen</summary>
      <label>
        Gespräch / Content-Serie
        <select
          value={seriesId}
          disabled={busy}
          onChange={(e) => onSeries(e.target.value)}
        >
          <option value="">Neues Gespräch</option>
          {state.series.map((s) => (
            <option key={s.id} value={s.id}>
              {s.title}
            </option>
          ))}
        </select>
      </label>
      {!seriesId && (
        <>
          <label>
            Für welche Firma?
            <select
              value={customerId}
              disabled={busy}
              onChange={(e) => onCustomer(e.target.value)}
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
              value={campaignId}
              disabled={busy}
              onChange={(e) => onCampaign(e.target.value)}
            >
              <option value="">Ohne Kampagne</option>
              {state.campaigns
                .filter((c) => (c.customerId || null) === (customerId || null))
                .map((campaign) => (
                  <option key={campaign.id} value={campaign.id}>
                    {campaign.title}
                  </option>
                ))}
            </select>
          </label>
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
