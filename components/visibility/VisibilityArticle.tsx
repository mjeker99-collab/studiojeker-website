import Image from "next/image";
import Link from "next/link";

const sections = [
  {
    title: "Das Tagesgeschäft geht vor",
    paragraphs: [
      "Kunden betreuen, Offerten schreiben, Mitarbeitende führen und Aufträge abwickeln: In Gewerbebetrieben und kleineren KMU ist der Alltag dicht. Für Marketing bleibt häufig nur wenig Zeit.",
      "Dabei entstehen laufend Geschichten, die es wert wären, erzählt zu werden: neue Projekte, innovative Produkte, engagierte Mitarbeitende und besondere Kundenlösungen. Doch oft fehlt jemand, der diese Themen regelmässig aufbereitet und veröffentlicht.",
    ],
  },
  {
    title: "Marketing nebenbei funktioniert selten dauerhaft",
    paragraphs: [
      "Eine eigene Marketingabteilung können sich viele kleinere Unternehmen nicht leisten. Die Geschäftsleitung, der Verkauf oder die Administration übernehmen Social Media zusätzlich zu ihren eigentlichen Aufgaben.",
      "Nach einem motivierten Start wird die Kommunikation unregelmässig. Nicht weil es an guten Inhalten fehlt, sondern an Zeit, Personal und einem verlässlichen Ablauf.",
    ],
  },
  {
    title: "Sichtbarkeit entsteht durch Kontinuität",
    paragraphs: [
      "Wer online kaum präsent ist, verpasst Gelegenheiten, potenzielle Kunden, Partner und Mitarbeitende auf sich aufmerksam zu machen. Ein einzelner Beitrag kann Interesse wecken. Eine kontinuierliche, glaubwürdige Präsenz hilft, im Gedächtnis zu bleiben und Vertrauen aufzubauen.",
      "Dafür braucht es nicht jede Woche eine aufwendige Produktion. Oft genügen ein gutes vorhandenes Bild, ein verständlicher Text und eine klare Botschaft – vorausgesetzt, die Beiträge erscheinen regelmässig.",
    ],
  },
  {
    title: "Sichtbarkeit im Abo: Entlastung für KMU",
    paragraphs: [
      "Mit «Sichtbarkeit im Abo» übernimmt Studiojeker die laufende Social-Media-Kommunikation: Themen recherchieren, Texte formulieren, vorhandenes Bildmaterial optimieren, Beiträge gestalten und auf den vereinbarten Kanälen veröffentlichen.",
      "Das Unternehmen liefert Einblicke in seine Arbeit und konzentriert sich auf sein Kerngeschäft. Wir sorgen für einen planbaren Kommunikationsrhythmus.",
      "Visibility Start umfasst vier unterschiedliche Beiträge pro Monat auf bis zu zwei Kanälen für CHF 650 monatlich. Visibility Plus bietet acht Beiträge auf bis zu drei Kanälen ab CHF 1’150 monatlich. Für weitergehende Anforderungen entwickeln wir individuelle Lösungen. Neue Foto- und Videoproduktionen sind im Start-Paket nicht enthalten.",
    ],
  },
];

export function VisibilityArticle({ teaser = false }: { teaser?: boolean }) {
  return (
    <section aria-labelledby="visibility-article-title" className="bg-white text-black">
      <div className="mx-auto max-w-7xl px-6 py-16 md:px-10 md:py-24">
        <div className="grid gap-10 md:grid-cols-[minmax(0,1fr)_minmax(240px,0.7fr)] md:items-start">
          <div>
            <p className="mb-5 text-xs font-bold uppercase tracking-[0.18em] text-neutral-600">Ein Beitrag von Martin Jeker · Studiojeker</p>
            <h2 id="visibility-article-title" className="max-w-3xl text-3xl font-bold leading-tight md:text-5xl">
              Sichtbarkeit ist kein Luxus. Aber wer hat im KMU-Alltag Zeit dafür?
            </h2>
            <p className="mt-6 max-w-2xl text-lg leading-relaxed">
              Gute Unternehmen haben viel zu erzählen. Doch oft fehlen Zeit und Personal, um auf LinkedIn, Facebook und Instagram kontinuierlich präsent zu sein.
            </p>
            {teaser ? (
              <Link className="mt-8 inline-block border-b-2 border-cyan-400 pb-2 font-semibold focus-visible:outline-2 focus-visible:outline-offset-4" href="/content-abo#visibility-fachartikel">
                Fachartikel lesen →
              </Link>
            ) : null}
          </div>
          <Image src="/images/team/Martin.jpg" alt="Martin Jeker, Studiojeker" width={1920} height={1280} sizes="(max-width: 768px) 100vw, 36vw" className="h-auto w-full object-cover" />
        </div>
        {!teaser ? (
          <article id="visibility-fachartikel" className="mt-14 max-w-3xl scroll-mt-24">
            {sections.map((section) => (
              <div key={section.title} className="mb-12">
                <h3 className="mb-5 text-2xl font-bold">{section.title}</h3>
                {section.paragraphs.map((paragraph) => (
                  <p key={paragraph} className="mb-4 text-base leading-8 text-neutral-800">{paragraph}</p>
                ))}
              </div>
            ))}
            <div className="border-l-4 border-cyan-400 pl-6">
              <h3 className="text-2xl font-bold">Gute Unternehmen verdienen es, gesehen zu werden.</h3>
              <p className="mt-4 leading-8">Zum Start schenken wir Neukunden bis 30. November 2026 den ersten Monat inklusive Recherche und Konzeption. Mindestlaufzeit sechs Monate, danach monatlich kündbar.</p>
              <Link href="/contact" className="mt-5 inline-block border-b-2 border-cyan-400 pb-2 font-semibold">Unverbindliches Erstgespräch vereinbaren →</Link>
            </div>
          </article>
        ) : null}
      </div>
    </section>
  );
}
