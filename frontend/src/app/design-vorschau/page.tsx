import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Button from "@/components/ui/Button";
import SiteHeader from "@/components/site/SiteHeader";
import BottomBar, { BottomBarSpacer } from "@/components/site/BottomBar";
import SiteFooter from "@/components/site/SiteFooter";
import Container from "@/components/ui/Container";
import Section from "@/components/ui/Section";
import Badge from "@/components/ui/Badge";
import TextLink from "@/components/ui/TextLink";
import Card from "@/components/ui/Card";

export const metadata: Metadata = {
  title: "Design-Vorschau",
  robots: { index: false },
};

export default function DesignVorschauPage() {
  if (process.env.NODE_ENV === "production") notFound();

  return (
    <>
    <SiteHeader phone="Platzhalter" phoneHref="tel:+490000000" />
    <main id="main-content" className="min-h-screen bg-surface-base py-12 font-text text-ink">
      <Section tone="raise" aria-labelledby="section-preview" className="mb-12">
        <h1 id="section-preview" className="font-brand text-4xl">Bausteine gemeinsam prüfen</h1>
        <p className="mt-3 max-w-[65ch] text-ink-muted">Section mit hellerer Fläche und integriertem Container: volle Hintergrundbreite, zentrierter Inhalt bis 1200 px, seitlich 16 px mobil und 32 px ab 768 px. Abstand oben und unten: 48 px, ab 1024 px jeweils 96 px.</p>
        <Card className="mt-6" aria-labelledby="card-preview">
          <h2 id="card-preview" className="font-brand text-3xl">Karte · Inhaltsfläche</h2>
          <p className="mt-2 max-w-[65ch] text-ink-muted">12 px Radius, feiner Rahmen, keine Schatten. Diese Karte ist eine Inhaltsfläche; der Link darin ist separat bedienbar.</p>
          <h3 className="mt-6 font-semibold">Badge · fünf Beispielzustände</h3>
          <p className="mt-2 text-sm text-ink-muted">Nur Design-Beispiele, keine echten Leistungs- oder Verfügbarkeitsangaben.</p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Badge>Beliebt</Badge>
            <Badge variant="outline">ab-Preis</Badge>
            <Badge variant="success">● Heute frei</Badge>
            <Badge variant="danger">✕ Ausgebucht</Badge>
            <Badge variant="placeholder">PLATZHALTER</Badge>
          </div>
          <h3 className="mt-6 font-semibold">TextLink · bündig mit dem Inhalt</h3>
          <TextLink href="/dienstleistungen">Leistungen & Preise ansehen</TextLink>
        </Card>
      </Section>
      <Container>
      <section aria-labelledby="container-preview" className="mb-12 border border-line bg-surface-card p-4">
        <h2 id="container-preview" className="font-brand text-3xl">Container-Vorschau</h2>
        <p className="mt-2 text-ink-muted">Zentriert, maximal 1200 px breit. Innenabstand: 16 px mobil, 32 px ab 768 px. Der Rahmen zeigt die Inhaltsgrenzen.</p>
      </section>
      <h2 className="mb-8 font-brand text-4xl">Button-Vorschau</h2>
      <div className="grid gap-8 sm:grid-cols-2">
        {(["primary", "secondary", "text"] as const).flatMap((variant) =>
          (["md", "lg"] as const).map((size) => (
            <section key={`${variant}-${size}`} className="flex flex-col items-start gap-3">
              <h2 className="text-ink-muted">{variant} · {size}</h2>
              <Button variant={variant} size={size} href="#disabled">
                {variant === "primary" ? "Termin buchen" : variant === "secondary" ? "Preise ansehen" : "Alle Leistungen"}
              </Button>
            </section>
          )),
        )}
        <section id="disabled" className="flex flex-col items-start gap-3">
          <h2 className="text-ink-muted">primary · md · disabled</h2>
          <Button disabled>Termin buchen</Button>
        </section>
      </div>
      <div className="mt-8 h-[150vh] border border-line bg-surface-card p-6 text-ink-muted">
        Platzhalter zum Testen des Scrollens
      </div>
      </Container>
    </main>
    <SiteFooter
      copyrightYear={2026}
      description="Vorschau mit Platzhalterdaten, keine echten Salonangaben."
      profile={{ name: "Platzhalter", street: "Platzhalter-Straße", postal_code: "00000", city: "Platzhalter-Ort", country: "DE", phone: "+49 000 000000" }}
      hours={Array.from({ length: 7 }, (_, day_of_week) => ({ day_of_week, is_open: day_of_week < 6, open_time: "09:00", close_time: "18:00" }))}
      contactLinks={[{ label: "Kontakt (Vorschau)", href: "/kontakt" }]}
    />
    <BottomBarSpacer />
    <BottomBar />
    </>
  );
}
