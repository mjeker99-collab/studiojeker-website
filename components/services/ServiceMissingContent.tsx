type ServiceMissingContentProps = {
  items: string[];
  locale: "de" | "en";
};

/**
 * Internal preview only — lists media still awaiting Martin’s approved assets.
 * Never rendered in production builds.
 */
export function ServiceMissingContent({
  items,
  locale,
}: ServiceMissingContentProps) {
  if (process.env.NODE_ENV === "production" || items.length === 0) {
    return null;
  }

  const title =
    locale === "en"
      ? "Internal preview — missing content"
      : "Interne Vorschau — fehlende Inhalte";

  return (
    <aside
      style={{
        margin: "0 var(--page-padding-inline, 1.25rem) var(--space-4)",
        padding: "1rem 1.25rem",
        border: "1px dashed #0aa",
        background: "#f4fbfb",
        color: "#111",
        fontSize: "0.875rem",
        lineHeight: 1.5,
      }}
      data-preview-missing-content
    >
      <p style={{ margin: "0 0 0.5rem", fontWeight: 600 }}>{title}</p>
      <ul style={{ margin: 0, paddingInlineStart: "1.25rem" }}>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </aside>
  );
}
