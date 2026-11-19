"use client";
import { useEffect, useRef, useState } from "react";
import { signedMessage } from "../lib/mail-signature";

type Message = { recipient: string; subject: string; body: string };
export default function MailPreview({
  message,
  disabled,
  onDirty,
  onSave,
}: {
  message: Message;
  disabled: boolean;
  onDirty: (dirty: boolean) => void;
  onSave: (value: Message) => Promise<void>;
}) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState<Message>({
    recipient: message.recipient,
    subject: message.subject,
    body: message.body,
  });
  useEffect(() => {
    Promise.resolve().then(() =>
      setValue({
        recipient: message.recipient,
        subject: message.subject,
        body: message.body,
      }),
    );
  }, [message.recipient, message.subject, message.body]);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [retry, setRetry] = useState(0);
  const save = useRef(onSave);
  useEffect(() => {
    save.current = onSave;
  }, [onSave]);
  const dirty =
    value.subject !== message.subject || value.body !== message.body;
  useEffect(() => {
    if (!dirty || !value.subject.trim() || !value.body.trim()) return;
    const timer = setTimeout(async () => {
      setSaving(true);
      setError("");
      try {
        await save.current(value);
      } catch (e) {
        setError(
          e instanceof Error
            ? e.message
            : "Speichern fehlgeschlagen. Dein Text bleibt hier erhalten.",
        );
      } finally {
        setSaving(false);
      }
    }, 900);
    return () => clearTimeout(timer);
  }, [dirty, value, retry]);
  return (
    <div className="mail-preview-content">
      <p>
        <strong>An:</strong> {message.recipient}
      </p>
      <div className="actions">
        <button
          type="button"
          className="secondary"
          disabled={disabled || saving || dirty}
          onClick={() => setEditing(!editing)}
        >
          {editing ? "Vorschau anzeigen" : "Text bearbeiten"}
        </button>
        <span role="status">
          {saving
            ? "Wird gespeichert …"
            : dirty
              ? "Änderungen werden automatisch gespeichert …"
              : "Gespeichert"}
        </span>
      </div>
      {editing ? (
        <fieldset disabled={disabled || saving}>
          <label>
            Betreff
            <input
              maxLength={250}
              value={value.subject}
              onChange={(e) => {
                setValue({ ...value, subject: e.target.value });
                onDirty(
                  e.target.value !== message.subject ||
                    value.body !== message.body,
                );
              }}
            />
          </label>
          <label>
            Nachricht
            <textarea
              rows={14}
              maxLength={12000}
              value={value.body}
              onChange={(e) => {
                setValue({ ...value, body: e.target.value });
                onDirty(
                  value.subject !== message.subject ||
                    e.target.value !== message.body,
                );
              }}
            />
          </label>
          {(!value.subject.trim() || !value.body.trim()) && (
            <p role="alert">Bitte Betreff und Nachricht ergänzen.</p>
          )}
        </fieldset>
      ) : (
        <>
          <h3>{message.subject}</h3>
          <div
            className="mail-review-body"
            dangerouslySetInnerHTML={{
              __html: signedMessage(message.body, true).html,
            }}
          />
        </>
      )}
      {dirty && (
        <button
          className="secondary"
          disabled={saving || disabled}
          onClick={() => {
            setValue({
              recipient: message.recipient,
              subject: message.subject,
              body: message.body,
            });
            onDirty(false);
            setError("");
          }}
        >
          Änderungen verwerfen
        </button>
      )}
      {error && (
        <p role="alert" className="error">
          {error}{" "}
          <button
            className="secondary"
            disabled={saving}
            onClick={() => setRetry((v) => v + 1)}
          >
            Speichern erneut versuchen
          </button>
        </p>
      )}
    </div>
  );
}
