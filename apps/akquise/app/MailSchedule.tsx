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
  readyCount,
  onQueueChange,
}: {
  compact?: boolean;
  readyCount?: number;
  onQueueChange?: (ids: string[]) => void;
  drafts: Candidate[];
  openDraft: (id: string) => void;
}) {
  const [data, setData] = useState<Data | null>(null);
  const [settings, setSettings] = useState<Schedule | null>(null);
  const [selection, setSelection] = useState<string[]>([]);
  const [confirmQueue, setConfirmQueue] = useState(false);
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
      }
      setConfirmStart(false);
      await load(true);
      setNotice(
        action === "pause"
          ? "Automatik pausiert. Ein bereits laufender Versand kann noch abgeschlossen werden."
          : action === "enqueue"
            ? "Auswahl verarbeitet. Ergebnisse stehen unter der Auswahl."
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
  useEffect(() => {
    if (data)
      onQueueChange?.(
        data.items
          .filter((i) => !["CANCELLED", "BLOCKED"].includes(i.status))
          .map((i) => i.draftId),
      );
  }, [data, onQueueChange]);
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
  const staleWorker = !data?.workerHealthy;
  const capacity = settings
    ? Math.ceil(
        ((settings.endHour - settings.startHour) * 60) /
          settings.intervalMinutes,
      )
    : 0;
  return (
    <section
      className="panel mail-schedule"
      aria-labelledby="mail-schedule-title"
    >
      <div className="section-head">
        <h2 id="mail-schedule-title">Täglicher Mailversand</h2>
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
              <strong>{readyCount ?? candidates.length}</strong>
              <br />
              Bereit zur Prüfung
            </p>
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
              Handlungsbedarf
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
          {data.schedule.enabled && (
            <button disabled={busy} onClick={() => void mutate("pause", {})}>
              Versand pausieren
            </button>
          )}
          <p>
            Absender: Nora Jeker · njeker@studiojeker.ch · Schweizer Zeit
            (Europe/Zurich).
          </p>
          <button
            disabled={busy}
            onClick={() => {
              void load(false).catch((e) =>
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
            <p role="status">{data.schedule.pauseReason}</p>
          )}
          <details className="mail-schedule-settings">
            <summary>
              Zeitplan bearbeiten{dirty ? " · Ungespeicherte Änderungen" : ""}
            </summary>
            <div className="form-grid" onChange={() => setConfirmStart(false)}>
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
                Start (Stunde)
                <input
                  type="number"
                  min="0"
                  max="23"
                  value={settings.startHour}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      startHour: Number(e.target.value),
                    })
                  }
                />
              </label>
              <label>
                Ende (Stunde)
                <input
                  type="number"
                  min="1"
                  max="24"
                  value={settings.endHour}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      endHour: Number(e.target.value),
                    })
                  }
                />
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
            <label className="check">
              <input
                type="checkbox"
                checked={confirmStart}
                onChange={(e) => setConfirmStart(e.target.checked)}
              />
              Ich bestätige den automatischen echten Versand der eingeplanten,
              freigegebenen Mails nach diesem Zeitplan.
            </label>
            <div className="actions">
              <button
                disabled={
                  busy ||
                  !dirty ||
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
              {!data.schedule.enabled && (
                <button
                  disabled={
                    busy ||
                    !confirmStart ||
                    !data.productionReady ||
                    staleWorker
                  }
                  onClick={() =>
                    void mutate("settings", {
                      revision: settings.revision,
                      enabled: true,
                      dailyLimit: settings.dailyLimit,
                      weekdaysOnly: settings.weekdaysOnly,
                      startHour: settings.startHour,
                      endHour: settings.endHour,
                      intervalMinutes: settings.intervalMinutes,
                      confirmDispatch: true,
                    })
                  }
                >
                  Versand starten
                </button>
              )}
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
                disabled={busy || !candidates.length}
                onClick={() =>
                  setSelection(candidates.slice(0, 200).map((d) => d.id))
                }
              >
                Bis zu 200 angezeigte Mails auswählen
              </button>{" "}
              <button
                disabled={busy || !selection.length}
                onClick={() => setSelection([])}
              >
                Auswahl leeren
              </button>
              <div className="draft-list">
                {candidates.map((d) => (
                  <div key={d.id} className="panel-note">
                    <label className="check">
                      <input
                        type="checkbox"
                        checked={selection.includes(d.id)}
                        onChange={(e) =>
                          setSelection((old) =>
                            e.target.checked
                              ? [...old, d.id]
                              : old.filter((id) => id !== d.id),
                          )
                        }
                      />
                      {d.versions[0].recipient} · {d.versions[0].subject} · V
                      {d.version}
                    </label>
                    <button onClick={() => openDraft(d.id)}>
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
              <label className="check">
                <input
                  type="checkbox"
                  checked={confirmQueue}
                  onChange={(e) => setConfirmQueue(e.target.checked)}
                />
                Diese {selection.length} Nachrichten für den automatischen
                Versand einplanen. Bei aktiver Automatik beginnt der Versand im
                eingestellten Zeitfenster.
              </label>
              <button
                disabled={
                  busy ||
                  !confirmQueue ||
                  !selection.length ||
                  selection.length > 200
                }
                onClick={() =>
                  void mutate("enqueue", {
                    confirmDispatch: true,
                    items: candidates
                      .filter((d) => selection.includes(d.id))
                      .map((d) => ({ draftId: d.id, version: d.version })),
                  })
                }
              >
                Auswahl einplanen
              </button>
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
          {[
            {
              title: "Handlungsbedarf",
              statuses: ["FAILED", "BLOCKED", "UNKNOWN"],
            },
            { title: "Warteschlange", statuses: ["QUEUED", "SENDING"] },
            {
              title: "Verlauf",
              statuses: ["SENT", "SKIPPED", "CANCELLED", "CLOSED"],
            },
          ].map((group) => {
            const items = data.items.filter((item) =>
              group.statuses.includes(item.status),
            );
            return (
              <details
                key={group.title}
                open={group.title === "Handlungsbedarf" && items.length > 0}
              >
                <summary>
                  {group.title} (
                  {group.statuses.reduce(
                    (sum, status) => sum + count(status),
                    0,
                  )}
                  )
                </summary>
                {!items.length && <p>Keine Einträge.</p>}
                {group.title === "Verlauf" && (
                  <p>
                    Letzte Einträge. Versandt bedeutet vom Mailserver
                    angenommen. Bereits gestartete Versandversuche werden nicht
                    automatisch wiederholt.
                  </p>
                )}
                {items.map((item) => (
                  <div key={item.id} className="panel-note">
                    <strong>{item.recipient}</strong>
                    <p>
                      {item.subject} · V{item.version} ·{" "}
                      {labels[item.status] || item.status}
                    </p>
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
              </details>
            );
          })}
        </>
      )}
    </section>
  );
}
