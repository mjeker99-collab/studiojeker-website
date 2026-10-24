import WebsiteBuilder from "./WebsiteBuilder";
export default function Website({
  initialProjectId,
}: {
  initialProjectId?: string;
}) {
  return (
    <>
      <WebsiteBuilder initialProjectId={initialProjectId} />
      <section className="panel cms-panel" aria-label="Website-Verwaltung">
        <h2>Website-Inhalte verwalten</h2>
        <p>Texte, Bilder und Projekte von studiojeker.ch bearbeiten.</p>
        <div className="actions">
          <a
            href="https://studiojeker.sanity.studio/structure"
            target="_blank"
            rel="noopener noreferrer"
          >
            Website bearbeiten ↗
          </a>
          <a
            href="https://studiojeker.ch"
            target="_blank"
            rel="noopener noreferrer"
          >
            Website ansehen ↗
          </a>
        </div>
        <p className="muted">
          Der Editor öffnet in einem neuen Tab und verwendet deine
          Sanity-Anmeldung. Änderungen werden nach der Bereitstellung der
          Website sichtbar.
        </p>
      </section>
    </>
  );
}
