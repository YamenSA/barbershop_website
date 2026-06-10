import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Impressum | Azzam Barbershop' },
  description: 'Gesetzliche Anbieterkennzeichnung gemäß § 5 DDG.',
  robots: { index: false },
};

export const revalidate = 3600;

function Placeholder({ label }: { label: string }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-xs font-semibold"
      style={{
        background: 'oklch(0.88 0.12 55 / 0.12)',
        color: 'oklch(0.88 0.12 55)',
        border: '1px solid oklch(0.88 0.12 55 / 0.3)',
      }}
      aria-label={`Platzhalter: ${label}`}
    >
      ⚠ {label}
    </span>
  );
}

function PlaceholderBlock({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="rounded-[6px] p-4 text-sm leading-relaxed"
      style={{
        background: 'oklch(0.88 0.12 55 / 0.06)',
        border: '1px solid oklch(0.88 0.12 55 / 0.25)',
        color: 'oklch(0.88 0.12 55 / 0.85)',
      }}
    >
      <p className="font-semibold mb-1 text-xs uppercase tracking-[0.08em]">
        Betreiber einzutragen
      </p>
      {children}
    </div>
  );
}

export default function ImpressumPage() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-3xl mx-auto">
        <h1
          className="font-display font-extrabold leading-[0.95] tracking-[-0.03em] text-ink mb-10"
          style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}
        >
          Impressum
        </h1>

        {/* § 5 DDG */}
        <div className="space-y-10 text-ash text-base leading-relaxed">

          <section aria-labelledby="anbieter-heading">
            <h2
              id="anbieter-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              Angaben gemäß § 5 DDG
            </h2>
            <PlaceholderBlock>
              <p>Bitte vollständige Anbieterkennung eintragen:</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Vollständiger Name / Firma (bei GmbH: Rechtsform + Vertretungsberechtigte)</li>
                <li>Straße und Hausnummer</li>
                <li>PLZ und Ort</li>
                <li>Land</li>
              </ul>
            </PlaceholderBlock>
          </section>

          <section aria-labelledby="kontakt-heading">
            <h2
              id="kontakt-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              Kontakt
            </h2>
            <PlaceholderBlock>
              <ul className="space-y-1 list-disc list-inside">
                <li>Telefon: [Telefonnummer eintragen]</li>
                <li>E-Mail: [E-Mail-Adresse eintragen]</li>
              </ul>
            </PlaceholderBlock>
          </section>

          <section aria-labelledby="register-heading">
            <h2
              id="register-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              Unternehmensangaben <Placeholder label="wenn zutreffend" />
            </h2>
            <PlaceholderBlock>
              <ul className="space-y-1 list-disc list-inside">
                <li>Handelsregister: Registergericht und Registernummer (falls eingetragen)</li>
                <li>Umsatzsteuer-Identifikationsnummer gemäß § 27 a UStG (falls vorhanden)</li>
                <li>Bei GmbH / UG: Angabe des Stammkapitals</li>
              </ul>
            </PlaceholderBlock>
          </section>

          <section aria-labelledby="redaktion-heading">
            <h2
              id="redaktion-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
            </h2>
            <PlaceholderBlock>
              <ul className="space-y-1 list-disc list-inside">
                <li>Vollständiger Name der verantwortlichen Person</li>
                <li>Vollständige Anschrift (Straße, PLZ, Ort)</li>
              </ul>
            </PlaceholderBlock>
          </section>

          <section aria-labelledby="haftung-heading">
            <h2
              id="haftung-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              Haftungsausschluss
            </h2>

            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-ink mb-1">Haftung für Inhalte</h3>
                <p>
                  Als Diensteanbieter sind wir gemäß § 7 Abs. 1 DDG für eigene Inhalte auf
                  diesen Seiten nach den allgemeinen Gesetzen verantwortlich. Nach §§ 8 bis 10
                  DDG sind wir als Diensteanbieter jedoch nicht verpflichtet, übermittelte oder
                  gespeicherte fremde Informationen zu überwachen oder nach Umständen zu forschen,
                  die auf eine rechtswidrige Tätigkeit hinweisen.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink mb-1">Haftung für Links</h3>
                <p>
                  Unser Angebot enthält Links zu externen Websites Dritter, auf deren Inhalte wir
                  keinen Einfluss haben. Deshalb können wir für diese fremden Inhalte auch keine
                  Gewähr übernehmen. Für die Inhalte der verlinkten Seiten ist stets der jeweilige
                  Anbieter oder Betreiber der Seiten verantwortlich.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink mb-1">Urheberrecht</h3>
                <p>
                  Die durch die Seitenbetreiber erstellten Inhalte und Werke auf diesen Seiten
                  unterliegen dem deutschen Urheberrecht. Die Vervielfältigung, Bearbeitung,
                  Verbreitung und jede Art der Verwertung außerhalb der Grenzen des Urheberrechts
                  bedürfen der schriftlichen Zustimmung des jeweiligen Autors bzw. Erstellers.
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="streit-heading">
            <h2
              id="streit-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              Streitschlichtung
            </h2>
            <p>
              Die Europäische Kommission stellt eine Plattform zur Online-Streitbeilegung (OS)
              bereit:{' '}
              <a
                href="https://ec.europa.eu/consumers/odr/"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brass hover:text-ink transition-colors duration-[150ms]"
              >
                https://ec.europa.eu/consumers/odr/
              </a>
              . Unsere E-Mail-Adresse finden Sie oben im Impressum.
            </p>
            <p className="mt-3">
              Wir sind nicht bereit oder verpflichtet, an Streitbeilegungsverfahren vor einer
              Verbraucherschlichtungsstelle teilzunehmen.
            </p>
          </section>

        </div>
      </div>
    </section>
  );
}
