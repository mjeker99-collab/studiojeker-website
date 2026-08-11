"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import type { Locale } from "@/types/i18n";
import { CONTACT_FIELD_LIMITS } from "@/lib/security/contact";
import { Button } from "@/components/ui/Button";
import styles from "./ContactPage.module.css";

type ContactFormLabels = {
  id: string;
  name: string;
  company: string;
  email: string;
  phone: string;
  message: string;
  submit: string;
  privacyNote: string;
  privacyLinkLabel: string;
  success: string;
  error: string;
  sending: string;
};

type ContactFormProps = {
  labels: ContactFormLabels;
  privacyHref: string;
  locale: Locale;
};

/**
 * Contact form UI — same markup/classes as the approved contact layout.
 * Submits to POST /api/contact (server validation). No visual redesign.
 */
export function ContactForm({ labels, privacyHref, locale }: ContactFormProps) {
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">(
    "idle",
  );

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (status === "sending") return;

    const form = event.currentTarget;
    const data = new FormData(form);

    setStatus("sending");
    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: {
          Accept: "application/json",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: data.get("name"),
          company: data.get("company"),
          email: data.get("email"),
          phone: data.get("phone"),
          message: data.get("message"),
          website: data.get("website"),
          turnstileToken: data.get("cf-turnstile-response") || undefined,
          locale,
        }),
      });

      if (!response.ok) {
        setStatus("error");
        return;
      }

      const result = (await response.json()) as { ok?: boolean };
      if (!result.ok) {
        setStatus("error");
        return;
      }

      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form
      id={labels.id}
      className={styles.form}
      method="post"
      action="/api/contact"
      onSubmit={onSubmit}
      noValidate={false}
    >
      {/* Honeypot — must remain empty. Hidden from assistive tech. */}
      <label className={styles.honeypot} aria-hidden="true">
        <span>Website</span>
        <input
          name="website"
          type="text"
          tabIndex={-1}
          autoComplete="off"
          defaultValue=""
        />
      </label>

      <label className={styles.field}>
        <span className="visually-hidden">{labels.name}</span>
        <input
          name="name"
          type="text"
          required
          autoComplete="name"
          placeholder={labels.name}
          maxLength={CONTACT_FIELD_LIMITS.name}
        />
      </label>
      <label className={styles.field}>
        <span className="visually-hidden">{labels.company}</span>
        <input
          name="company"
          type="text"
          autoComplete="organization"
          placeholder={labels.company}
          maxLength={CONTACT_FIELD_LIMITS.company}
        />
      </label>
      <label className={styles.field}>
        <span className="visually-hidden">{labels.email}</span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder={labels.email}
          maxLength={CONTACT_FIELD_LIMITS.email}
        />
      </label>
      <label className={styles.field}>
        <span className="visually-hidden">{labels.phone}</span>
        <input
          name="phone"
          type="tel"
          autoComplete="tel"
          placeholder={labels.phone}
          maxLength={CONTACT_FIELD_LIMITS.phone}
        />
      </label>
      <label className={styles.field}>
        <span className="visually-hidden">{labels.message}</span>
        <textarea
          name="message"
          required
          rows={5}
          placeholder={labels.message}
          maxLength={CONTACT_FIELD_LIMITS.message}
        />
      </label>
      <p className={styles.privacy}>
        {labels.privacyNote}{" "}
        <Link href={privacyHref}>{labels.privacyLinkLabel}</Link>.
      </p>
      {/* Slot for future Cloudflare Turnstile widget — empty until enabled. */}
      <div data-turnstile-slot="" />
      <Button type="submit" variant="primary" showArrow disabled={status === "sending"}>
        {status === "sending" ? labels.sending : labels.submit}
      </Button>
      {status === "success" || status === "error" ? (
        <p className={styles.formStatus} role="status" aria-live="polite">
          {status === "success" ? labels.success : labels.error}
        </p>
      ) : null}
    </form>
  );
}
