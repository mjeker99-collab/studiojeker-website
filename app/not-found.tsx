import { SiteChrome } from "@/components/layout/SiteChrome";
import { Container } from "@/components/layout/Container";
import { Button } from "@/components/ui/Button";

export default function NotFound() {
  return (
    <SiteChrome locale="de">
      <section className="foundation-panel">
        <Container>
          <h1 className="headline">404</h1>
          <p className="subheadline prose">Seite nicht gefunden.</p>
          <Button href="/">Studiojeker</Button>
        </Container>
      </section>
    </SiteChrome>
  );
}
