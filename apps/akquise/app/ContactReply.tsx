"use client";
import { useState } from "react";
import { replyLabels } from "../lib/contact-reply-input";

export default function ContactReply({
  contact,
  busy,
  save,
}: {
  contact: {
    id: string;
    revision: number;
    replyOutcome?: string;
    replyNote?: string;
    followUpOn?: string;
    status: string;
  };
  busy: boolean;
  save: (body: unknown) => void;
}) {
  const [outcome, setOutcome] = useState(contact.replyOutcome || "");
  const [note, setNote] = useState(contact.replyNote || "");
  const [followUpOn, setFollowUpOn] = useState(contact.followUpOn || "");
  const blocked = contact.status === "DO_NOT_CONTACT";
  return (
    <section className="legal" aria-label="Antwort erfassen">
      <h3>Antwort erfassen</h3>
      <p>
        Rückmeldung auswählen und speichern. Weitere eingeplante Akquise-Mails
        an diese Adresse werden gestoppt.
      </p>
      <div className="actions">
        {Object.entries(replyLabels).map(([value, label]) => (
          <button
            key={value}
            type="button"
            className={outcome === value ? "" : "secondary"}
            aria-pressed={outcome === value}
            disabled={busy || (blocked && value !== "DO_NOT_CONTACT")}
            onClick={() => setOutcome(value)}
          >
            {label}
          </button>
        ))}
      </div>
      {outcome && (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            save({
              revision: contact.revision,
              outcome,
              note,
              followUpOn: outcome === "DO_NOT_CONTACT" ? "" : followUpOn,
            });
          }}
        >
          <label>
            Antwort / Notiz (optional)
            <textarea
              value={note}
              maxLength={5000}
              onChange={(e) => setNote(e.target.value)}
            />
          </label>
          {outcome !== "DO_NOT_CONTACT" && (
            <label>
              Wiedervorlage (optional)
              <input
                type="date"
                value={followUpOn}
                onChange={(e) => setFollowUpOn(e.target.value)}
              />
            </label>
          )}
          <p>
            {outcome === "DO_NOT_CONTACT"
              ? "Die Adresse wird dauerhaft auf die Sperrliste gesetzt."
              : "Eine Wiedervorlage erinnert in der Kontaktliste. Es wird keine neue Mail automatisch versandt."}
          </p>
          <button disabled={busy}>Antwort speichern</button>
        </form>
      )}
    </section>
  );
}
