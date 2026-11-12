"use client";
import { useEffect, useState } from "react";
import { insideMailWindow, nextMailSlot } from "../lib/mail-clock";
type Schedule = {
  lastClaimAt?: string | null;
  revision: number;
  enabled: boolean;
  dailyLimit: number;
  weekdaysOnly: boolean;
  startHour: number;
  endHour: number;
  intervalMinutes: number;
  heartbeatAt: string | null;
  pauseReason: string | null;
};
type Item = {
  id: string;
  draftId: string;
  version: number;
  recipient: string;
  subject: string;
  status: string;
  error: string | null;
  createdAt?: string;
  updatedAt?: string;
};
type Data = {
  workerHealthy: boolean;
  schedule: Schedule;
  items: Item[];
  todayCount: number;
  todaySent: number;
  serverLimit: number;
  productionReady: boolean;
  counts: { status: string; _count: number }[];
};
type Candidate = {
  id: string;
  version: number;
  versions: {
    version: number;
    subject: string;
    recipient: string;
    signatureCurrent: boolean;
  }[];
  approvals: { version: number; status: string }[];
};
const labels: Record<string, string> = {
  QUEUED: "Eingeplant",
  SENDING: "Versand läuft",
  SENT: "Versandt",
  SKIPPED: "Übersprungen",
  CANCELLED: "Entfernt",
  BLOCKED: "Prüfung nötig",
  FAILED: "Fehler",
  UNKNOWN: "Zustellung unklar",
  CLOSED: "Manuell abgeglichen",
};
export default function MailSchedule({
  drafts,
  openDraft,
  compact = false,
  onQueueChange,
  onSendableQueueChange,
  onSendNow,
  reviewBusy = false,
  observerOnly = false,
  onSummaryChange,
}: {
  observerOnly?: boolean;
  onSummaryChange?: (summary: string) => void;
  onSendNow?: (ids: string[]) => void;
  onSendableQueueChange?: (ids: string[]) => void;
  reviewBusy?: boolean;
  compact?: boolean;
  readyCount?: number;
  onQueueChange?: (ids: string[]) => void;
  drafts: Candidate[];
  openDraft: (id: string) => void;
}) {
  const [shippingView, setShippingView] = useState("Geplant");
  const [showStart, setShowStart] = useState(false);
  const [data, setData] = useState<Data | null>(null);
  const [settings, setSettings] = useState<Schedule | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [confirmQueue, setConfirmQueue] = useState(false);
  const [confirmedSelectionVersion, setConfirmedSelectionVersion] =
    useState("");
  const [confirmStart, setConfirmStart] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [reconciliation, setReconciliation] = useState<Record<string, string>>(
    {},
  );
  const [results, setResults] = useState<
    { draftId: string; ok: boolean; reason?: string }[]
  >([]);
  async function load(reset = false) {
    const response = await fetch("/api/mail-schedule", { cache: "no-store" });
    const json = await response.json();
    if (!response.ok) throw new Error(json.error);
    setData(json);
    setSettings((old) => (reset || !old ? json.schedule : old));
  }
  useEffect(() => {
    let active = true;
    async function poll() {
      try {
        const response = await fetch("/api/mail-schedule", {
          cache: "no-store",
        });
        const json = await response.json();
        if (!response.ok) throw new Error(json.error);
        if (active) {
          setData(json);
          setSettings((old) => old || json.schedule);
        }
      } catch (e) {
        if (active)
          setError(
            e instanceof Error ? e.message : "Zeitplan nicht verfügbar.",
          );
      }
    }
    void poll();
    const timer = setInterval(poll, 30000);
    return () => {
      active = false;
      clearInterval(timer);
    };
  }, []);
  async function mutate(action: string, body: unknown) {
    setBusy(true);
    setError("");
    setNotice("");
    try {
      const response = await fetch(`/api/mail-schedule/${action}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await response.json();
      if (!response.ok) throw new Error(json.error);
      if (json.results) {
        setResults(json.results);
        setSelection([]);
        setConfirmQueue(false);
        setConfirmedSelectionVersion("");
      }
      setConfirmStart(false);
      setShowStart(false);
      await load(true);
      setNotice(
        action === "pause"
          ? "Automatik pausiert. Ein bereits laufender Versand kann noch abgeschlossen werden."
          : action === "enqueue"
            ? "Auswahl verarbeitet. Ergebnisse stehen unter der Auswahl."
            : action === "settings" && (body as { enabled?: boolean }).enabled
              ? "Automatik aktiviert. Versand erfolgt im angezeigten Zeitfenster."
              : "Zeitplan gespeichert.",
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Aktion fehlgeschlagen.");
    } finally {
      setBusy(false);
    }
  }
  const candidates = drafts.filter(
    (d) =>
      d.versions[0]?.signatureCurrent &&
      d.approvals.find((a) => a.version === d.version)?.status === "APPROVED" &&
      !data?.items.some(
        (i) =>
          i.draftId === d.id &&
          i.version === d.version &&
          !["CANCELLED", "BLOCKED"].includes(i.status),
      ),
  );
  // Bind a group approval to the exact approved draft versions, not only IDs.
  // A refreshed or revoked approval must never silently enqueue a changed draft.
  const selectedCandidates = candidates.filter((draft) =>
    selection.includes(draft.id),
  );
  const selectedVersions = selectedCandidates
    .map((draft) => `${draft.id}:${draft.version}`)
    .sort()
    .join("|");
  const selectionCurrent =
    selection.length > 0 && selectedCandidates.length === selection.length;
  const queueConfirmationValid =
    selectionCurrent &&
    confirmQueue &&
    confirmedSelectionVersion === selectedVersions;
  useEffect(() => {
    if (data) {
      onSendableQueueChange?.(
        data.items.filter((i) => i.status === "QUEUED").map((i) => i.draftId),
      );
      onQueueChange?.(
        data.items
          .filter((i) => !["CANCELLED", "BLOCKED"].includes(i.status))
          .map((i) => i.draftId),
      );
    }
  }, [data, onQueueChange, onSendableQueueChange]);
  const count = (status: string) =>
    data?.counts.find((c) => c.status === status)?._count || 0;
  const dirty = Boolean(
    data &&
    settings &&
    [
      "dailyLimit",
      "weekdaysOnly",
      "startHour",
      "endHour",
      "intervalMinutes",
    ].some(
      (key) =>
        settings[key as keyof Schedule] !==
        data.schedule[key as keyof Schedule],
    ),
  );
  const waiting = !data
    ? "Status wird geladen …"
    : !data.productionReady
      ? "Produktionsversand ist deaktiviert."
      : !data.schedule.enabled
        ? "Versand ist pausiert."
        : !data.workerHealthy
          ? "Hintergrunddienst meldet sich nicht. Versanddienst prüfen."
          : data.todayCount >=
              Math.min(data.schedule.dailyLimit, data.serverLimit)
            ? "Tageslimit erreicht. Weiter im nächsten Versandfenster."
            : !count("QUEUED")
              ? "Keine weiteren Mails eingeplant."
              : !insideMailWindow(data.schedule)
                ? "Wartet auf das nächste Versandfenster."
                : `Versand läuft im Abstand von ${data.schedule.intervalMinutes} Minute(n). Der Status wird alle 30 Sekunden aktualisiert.`;
  const nextSlot =
    data &&
    data.schedule.enabled &&
    data.workerHealthy &&
    data.productionReady &&
    count("QUEUED")
      ? nextMailSlot(
          data.schedule,
          data.todayCount >=
            Math.min(data.schedule.dailyLimit, data.serverLimit),
        )
      : null;
  useEffect(() => {
    if (!data) return;
    onSummaryChange?.(
      `${data.schedule.weekdaysOnly ? "Montag bis Freitag" : "Jeden Tag"}, ${String(data.schedule.startHour).padStart(2, "0")}:00–${String(data.schedule.endHour).padStart(2, "0")}:00 Uhr · maximal ${Math.min(data.schedule.dailyLimit, data.serverLimit)} Mails pro Tag. ${!data.productionReady ? "Versand derzeit deaktiviert." : !data.workerHealthy ? "Versanddienst derzeit nicht erreichbar." : data.schedule.enabled ? "Beginn im nächsten verfügbaren Zeitfenster." : "Der Versand ist pausiert. Die eingeplanten Mails warten, bis du ihn unter Versand fortsetzt."}`,
    );
  }, [data, onSummaryChange]);
  const staleWorker = !data?.workerHealthy;
  const capacity = settings
    ? Math.ceil(
        ((settings.endHour - settings.startHour) * 60) /
          settings.intervalMinutes,
      )
    : 0;
  if (observerOnly) return null;
  return (
    <section
      className="panel mail-schedule"
      aria-labelledby="mail-schedule-title"
    >
      <div className="section-head">
        <h2 id="mail-schedule-title">Versand</h2>
        <strong>
          {data?.schedule.enabled ? "Automatik aktiv" : "Pausiert"}
        </strong>
      </div>
      {error && (
        <p role="alert" className="error">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="panel-note">
          {notice}
        </p>
      )}
      {!data || !settings ? (
        <p>Zeitplan wird geladen …</p>
      ) : (
        <>
          <div
            className="form-grid mail-schedule-stats"
            aria-label="Versandübersicht"
          >
            <p>
              <strong>{count("QUEUED")}</strong>
              <br />
              Geplant
            </p>
            <p>
              <strong>{data.todaySent}</strong>
              <br />
              Heute versandt
            </p>
            <p>
              <strong>
                {count("BLOCKED") + count("UNKNOWN") + count("FAILED")}
              </strong>
              <br />
              Klärung nötig
            </p>
          </div>
          <p role="status">
            {waiting}
            {nextSlot && (
              <>
                {" "}
                Nächste Mail voraussichtlich{" "}
                {new Intl.DateTimeFormat("de-CH", {
                  timeZone: "Europe/Zurich",
                  weekday: "short",
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(nextSlot)}{" "}
                Uhr.
              </>
            )}
          </p>
          <details>
            <summary>Versanddetails</summary>
            <p>
              Heute {data.todayCount} Versandversuche von maximal{" "}
              {Math.min(data.schedule.dailyLimit, data.serverLimit)}. Versandt
              bedeutet vom Mailserver angenommen, nicht bestätigte Zustellung.
            </p>
          </details>
          <p>
            Maximal {Math.min(data.schedule.dailyLimit, data.serverLimit)} Mails
            täglich ·{" "}
            {data.schedule.weekdaysOnly ? "Montag bis Freitag" : "Jeden Tag"},{" "}
            {String(data.schedule.startHour).padStart(2, "0")}:00–
            {String(data.schedule.endHour).padStart(2, "0")}:00 Uhr · alle{" "}
            {data.schedule.intervalMinutes} Minute(n).
          </p>
          <div className="actions">
            {onSendNow && count("QUEUED") > 0 && (
              <button
                className="secondary"
                disabled={busy || reviewBusy}
                onClick={() =>
                  onSendNow(
                    data.items
                      .filter((i) => i.status === "QUEUED")
                      .slice(0, 200)
                      .map((i) => i.draftId),
                  )
                }
              >
                Eingeplante Mails jetzt senden (
                {Math.min(
                  200,
                  data.items.filter((i) => i.status === "QUEUED").length,
                )}
                ) →
              </button>
            )}
            {data.schedule.enabled ? (
              <button
                className="secondary"
                disabled={busy || reviewBusy}
                onClick={() => void mutate("pause", {})}
              >
                Versand pausieren
              </button>
            ) : (
              <button
                className="secondary"
                disabled={busy || reviewBusy}
                onClick={() => setShowStart(!showStart)}
              >
                Zeitplan starten
              </button>
            )}
          </div>
          {showStart && !data.schedule.enabled && (
            <fieldset>
              <legend>Automatischen Versand starten</legend>
              <p>
                Es werden nur bereits freigegebene und eingeplante Mails nach
                dem oben angezeigten Zeitplan versandt.
              </p>
              <label className="check">
                <input
                  type="checkbox"
                  disabled={busy || reviewBusy}
                  checked={confirmStart}
                  onChange={(e) => setConfirmStart(e.target.checked)}
                />
                Ich bestätige den automatischen Versand nach diesem Zeitplan.
              </label>
              <button
                disabled={
                  busy ||
                  reviewBusy ||
                  !confirmStart ||
                  !data.productionReady ||
                  staleWorker
                }
                onClick={() =>
                  void mutate("settings", {
                    revision: data.schedule.revision,
                    enabled: true,
                    dailyLimit: data.schedule.dailyLimit,
                    weekdaysOnly: data.schedule.weekdaysOnly,
                    startHour: data.schedule.startHour,
                    endHour: data.schedule.endHour,
                    intervalMinutes: data.schedule.intervalMinutes,
                    confirmDispatch: true,
                  })
                }
              >
                Freigegebene Mails nach Zeitplan senden
              </button>
              <p role="status">
                {!data.productionReady
                  ? "E-Mail-Versand ist in den Einstellungen noch deaktiviert."
                  : staleWorker
                    ? "Der Versanddienst ist noch nicht bereit. Status aktualisieren."
                    : !confirmStart
                      ? "Bestätige den automatischen Versand, um zu starten."
                      : "Bereit zum Start."}
              </p>
            </fieldset>
          )}
          <p>
            Absender: Nora Jeker · njeker@studiojeker.ch · Schweizer Zeit
            (Europe/Zurich).
          </p>
          <button
            className="secondary"
            disabled={busy || reviewBusy}
            onClick={() => {
              void load(!dirty).catch((e) =>
                setError(
                  e instanceof Error ? e.message : "Status nicht verfügbar.",
                ),
              );
            }}
          >
            Status aktualisieren
          </button>
          {!data.productionReady && (
            <p className="panel-note">
              Produktionsversand noch deaktiviert. Auswahl und Zeitplan können
              vorbereitet werden. Der Testmodus versendet diesen Stapel nicht.
            </p>
          )}
          {staleWorker && (
            <p className="panel-note">
              Hintergrunddienst noch nicht bestätigt. Nach dem Deployment bis zu
              einer Minute warten. Bleibt dieser Hinweis bestehen,
              Produktionsstart prüfen.
            </p>
          )}
          {data.schedule.pauseReason && (
            <div role="status" className="warning">
              <p>Versand angehalten: {data.schedule.pauseReason}</p>
              {count("UNKNOWN") > 0 && (
                <button
                  className="secondary"
                  onClick={() => setShippingView("Klärung nötig")}
                >
                  Unklare Sendungen prüfen
                </button>
              )}
            </div>
          )}
          <details className="mail-schedule-settings">
            <summary>
              Versandeinstellungen{dirty ? " · Ungespeicherte Änderungen" : ""}
            </summary>
            <fieldset disabled={busy || reviewBusy}>
              <div
                className="form-grid"
                onChange={() => setConfirmStart(false)}
              >
                <label>
                  Mails pro Tag
                  <input
                    type="number"
                    min="1"
                    max={Math.min(500, data.serverLimit)}
                    value={settings.dailyLimit}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        dailyLimit: Number(e.target.value),
                      })
                    }
                  />
                </label>
                <label>
                  Versandtage
                  <select
                    value={settings.weekdaysOnly ? "weekdays" : "daily"}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        weekdaysOnly: e.target.value === "weekdays",
                      })
                    }
                  >
                    <option value="weekdays">Montag bis Freitag</option>
                    <option value="daily">Jeden Tag</option>
                  </select>
                </label>
                <label>
                  Von
                  <select
                    value={settings.startHour}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        startHour: Number(e.target.value),
                      })
                    }
                  >
                    {Array.from({ length: 24 }, (_, i) => i + 0).map((hour) => (
                      <option key={hour} value={hour}>
                        {String(hour).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </label>
                <label>
                  Bis
                  <select
                    value={settings.endHour}
                    onChange={(e) =>
                      setSettings({
                        ...settings,
                        endHour: Number(e.target.value),
                      })
                    }
                  >
                    {Array.from({ length: 24 }, (_, i) => i + 1).map((hour) => (
                      <option key={hour} value={hour}>
                        {String(hour).padStart(2, "0")}:00
                      </option>
                    ))}
                  </select>
                </label>
                <details>
                  <summary>Erweitert</summary>
                  <label>
                    Abstand in Minuten
                    <input
                      type="number"
                      min="1"
                      max="120"
                      value={settings.intervalMinutes}
                      onChange={(e) =>
                        setSettings({
                          ...settings,
                          intervalMinutes: Number(e.target.value),
                        })
                      }
                    />
                  </label>
                </details>
              </div>
            </fieldset>
            {settings.startHour >= settings.endHour && (
              <p role="alert">Die Endzeit muss nach der Startzeit liegen.</p>
            )}
            <p className="muted">
              Serverlimit: {data.serverLimit}/Tag. Einzelversand zählt mit.
              Keine Nachholung verpasster Tagesmengen; ohne bereitstehende Mails
              wartet die Automatik.
            </p>
            {capacity < settings.dailyLimit && (
              <p className="panel-note">
                Mit diesem Zeitfenster und Abstand sind höchstens{" "}
                {Math.max(0, capacity)} Mails pro Tag möglich.
              </p>
            )}
            <p role="status">
              {dirty
                ? "Ungespeicherte Änderungen – der Versand verwendet noch den oben angezeigten Zeitplan."
                : "Zeitplan ist gespeichert."}
            </p>
            {data.schedule.enabled && dirty && (
              <label className="check">
                <input
                  type="checkbox"
                  checked={confirmStart}
                  onChange={(e) => setConfirmStart(e.target.checked)}
                />
                Ich bestätige den automatischen echten Versand der eingeplanten,
                freigegebenen Mails nach diesem Zeitplan.
              </label>
            )}
            {data.schedule.enabled && dirty && !confirmStart && (
              <p role="status">
                Bestätige den geänderten Zeitplan vor dem Speichern.
              </p>
            )}
            <div className="actions">
              <button
                disabled={
                  busy ||
                  reviewBusy ||
                  !dirty ||
                  settings.startHour >= settings.endHour ||
                  (data.schedule.enabled &&
                    (!confirmStart || !data.productionReady || staleWorker))
                }
                onClick={() =>
                  void mutate("settings", {
                    revision: settings.revision,
                    enabled: data.schedule.enabled,
                    dailyLimit: settings.dailyLimit,
                    weekdaysOnly: settings.weekdaysOnly,
                    startHour: settings.startHour,
                    endHour: settings.endHour,
                    intervalMinutes: settings.intervalMinutes,
                    confirmDispatch: data.schedule.enabled && confirmStart,
                  })
                }
              >
                Änderungen speichern
              </button>
            </div>
          </details>
          {!compact && (
            <details>
              <summary>
                Bereits freigegebene Mails einplanen ({candidates.length})
              </summary>
              <h3>Freigegebene Mails auswählen</h3>
              <p>
                Nur die ausgewählten Versionen werden eingeplant.
                Kontaktprüfung, Sperrliste und Freigabe werden beim Einplanen
                und vor jedem Versand erneut geprüft.
              </p>
              <button
                className="secondary"
                disabled={busy || !candidates.length}
                onClick={() => {
                  setSelection(candidates.slice(0, 200).map((d) => d.id));
                  setConfirmQueue(false);
                  setConfirmedSelectionVersion("");
                }}
              >
                {candidates.length <= 200
                  ? "Alle auswählen"
                  : "Erste 200 auswählen"}
              </button>{" "}
              <button
                className="secondary"
                disabled={busy || !selection.length}
                onClick={() => {
                  setSelection([]);
                  setConfirmQueue(false);
                  setConfirmedSelectionVersion("");
                }}
              >
                Auswahl leeren
              </button>
              <p role="status">
                <strong>
                  {selection.length} von {candidates.length} Mails ausgewählt.
                </strong>
              </p>
              {!selectionCurrent && selection.length > 0 && (
                <p role="alert">
                  Die Auswahl hat sich geändert. Bitte Auswahl leeren und erneut
                  auswählen.
                </p>
              )}
              {selectionCurrent && confirmQueue && !queueConfirmationValid && (
                <p role="alert">
                  Eine freigegebene Nachricht hat sich geändert. Bitte den
                  Versand erneut bestätigen.
                </p>
              )}
              <label className="check">
                <input
                  type="checkbox"
                  checked={queueConfirmationValid}
                  disabled={busy || !selectionCurrent}
                  onChange={(e) => {
                    setConfirmQueue(e.target.checked);
                    setConfirmedSelectionVersion(
                      e.target.checked ? selectedVersions : "",
                    );
                  }}
                />
                Diese {selection.length} Nachrichten für den automatischen
                Versand einplanen. Bei aktiver Automatik beginnt der Versand im
                eingestellten Zeitfenster.
              </label>
              <button
                disabled={
                  busy ||
                  !queueConfirmationValid ||
                  !selectionCurrent ||
                  selection.length > 200
                }
                onClick={() =>
                  void mutate("enqueue", {
                    confirmDispatch: true,
                    items: selectedCandidates.map((d) => ({
                      draftId: d.id,
                      version: d.version,
                    })),
                  })
                }
              >
                {selection.length} ausgewählte Mails einplanen
              </button>
              <div className="draft-list">
                {candidates.map((d) => (
                  <div key={d.id} className="panel-note">
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={selection.includes(d.id)}
                        onChange={(e) => {
                          setConfirmQueue(false);
                          setConfirmedSelectionVersion("");
                          setSelection((old) =>
                            e.target.checked
                              ? [...old, d.id]
                              : old.filter((id) => id !== d.id),
                          );
                        }}
                      />
                      {d.versions[0].recipient} · {d.versions[0].subject} · V
                      {d.version}
                    </label>
                    <button
                      className="secondary"
                      onClick={() => openDraft(d.id)}
                    >
                      Nachricht prüfen
                    </button>
                  </div>
                ))}
                {!candidates.length && (
                  <p>
                    {count("QUEUED")
                      ? "Alle verfügbaren freigegebenen Nachrichten sind bereits eingeplant. Keine erneute Auswahl nötig."
                      : "Keine weiteren freigegebenen Nachrichten verfügbar."}
                  </p>
                )}
              </div>
              {results.length > 0 && (
                <ul aria-label="Ergebnis der Auswahl">
                  {results.map((r, index) => (
                    <li key={index}>
                      {
                        drafts.find((d) => d.id === r.draftId)?.versions[0]
                          ?.recipient
                      }
                      : {r.ok ? "Eingeplant" : r.reason}
                    </li>
                  ))}
                </ul>
              )}
            </details>
          )}
          <div
            className="shipping-tabs"
            role="group"
            aria-label="Versand anzeigen"
          >
            {[
              ["Geplant", count("QUEUED") + count("SENDING")],
              ["Versendet", count("SENT")],
              [
                "Klärung nötig",
                count("FAILED") + count("BLOCKED") + count("UNKNOWN"),
              ],
              [
                "Weitere",
                count("SKIPPED") + count("CANCELLED") + count("CLOSED"),
              ],
            ].map(([label, total]) => (
              <button
                key={label}
                className="secondary"
                aria-pressed={shippingView === label}
                onClick={() => setShippingView(String(label))}
              >
                {label} ({total})
              </button>
            ))}
          </div>
          {[
            {
              title: "Klärung nötig",
              statuses: ["FAILED", "BLOCKED", "UNKNOWN"],
            },
            { title: "Geplant", statuses: ["QUEUED", "SENDING"] },
            { title: "Versendet", statuses: ["SENT"] },
            { title: "Weitere", statuses: ["SKIPPED", "CANCELLED", "CLOSED"] },
          ]
            .filter((group) => group.title === shippingView)
            .map((group) => {
              const items = data.items.filter((item) =>
                group.statuses.includes(item.status),
              );
              return (
                <section key={group.title} aria-label={group.title}>
                  <h3>
                    {group.title} (
                    {group.statuses.reduce(
                      (sum, status) => sum + count(status),
                      0,
                    )}
                    )
                  </h3>
                  {!items.length && <p>Keine Einträge.</p>}
                  {group.title === "Versendet" && (
                    <p>
                      Letzte Einträge. Versandt bedeutet vom Mailserver
                      angenommen. Bereits gestartete Versandversuche werden
                      nicht automatisch wiederholt.
                    </p>
                  )}
                  {items.map((item) => (
                    <div key={item.id} className="panel-note">
                      <strong>{item.recipient}</strong>
                      <p>
                        {item.subject} · {labels[item.status] || item.status}
                      </p>
                      {(item.updatedAt || item.createdAt) && (
                        <small>
                          {item.status === "QUEUED"
                            ? "Eingeplant"
                            : "Status aktualisiert"}
                          :{" "}
                          {new Date(
                            item.updatedAt || item.createdAt!,
                          ).toLocaleString("de-CH", {
                            timeZone: "Europe/Zurich",
                          })}
                        </small>
                      )}
                      {item.error && <p className="error">{item.error}</p>}
                      {["BLOCKED", "FAILED"].includes(item.status) && (
                        <button onClick={() => openDraft(item.draftId)}>
                          Nachricht prüfen und bearbeiten
                        </button>
                      )}
                      {["QUEUED", "BLOCKED"].includes(item.status) && (
                        <button
                          disabled={busy}
                          onClick={() => void mutate("cancel", { id: item.id })}
                        >
                          Aus Warteschlange entfernen
                        </button>
                      )}
                      {item.status === "UNKNOWN" && (
                        <div>
                          <label>
                            Ergebnis des manuellen Abgleichs mit
                            Postfach/SMTP-Protokoll
                            <textarea
                              value={reconciliation[item.id] || ""}
                              onChange={(e) =>
                                setReconciliation({
                                  ...reconciliation,
                                  [item.id]: e.target.value,
                                })
                              }
                            />
                          </label>
                          <button
                            disabled={
                              busy ||
                              (reconciliation[item.id] || "").trim().length < 15
                            }
                            onClick={() =>
                              void mutate("resolve", {
                                id: item.id,
                                rationale: reconciliation[item.id],
                              })
                            }
                          >
                            Abgleich dokumentieren · keine Wiederholung
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </section>
              );
            })}
        </>
      )}
    </section>
  );
}
