import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Impressum | Azzam Barbershop' },
  description: 'Gesetzliche Anbieterkennzeichnung gemäß § 5 DDG.',
  robots: { index: false },
};

export const revalidate = 3600;

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
            <p>
              Azzam Barbershop<br />
              Inhaber: Usama Azzam<br />
              Sielower Chaussee 38<br />
              03044 Cottbus<br />
              Deutschland
            </p>
          </section>

          <section aria-labelledby="kontakt-heading">
            <h2
              id="kontakt-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              Kontakt
            </h2>
            <ul className="space-y-1">
              <li>
                Telefon:{' '}
                <a
                  href="tel:+4917682200682"
                  className="text-brass hover:text-ink transition-colors duration-[150ms]"
                >
                  +49 176 82200682
                </a>
              </li>
              <li>
                E-Mail:{' '}
                <a
                  href="mailto:Oazzam412@gmail.com"
                  className="text-brass hover:text-ink transition-colors duration-[150ms]"
                >
                  Oazzam412@gmail.com
                </a>
              </li>
            </ul>
          </section>

          <section aria-labelledby="beruf-heading">
            <h2
              id="beruf-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              Berufsrechtliche Angaben
            </h2>
            <div className="space-y-4">
              <div>
                <h3 className="font-semibold text-ink mb-1">Berufsbezeichnung</h3>
                <p>Friseur (verliehen in der Bundesrepublik Deutschland)</p>
              </div>
              <div>
                <h3 className="font-semibold text-ink mb-1">Zuständige Kammer / Aufsichtsbehörde</h3>
                <p>
                  Handwerkskammer Cottbus<br />
                  Altmarkt 17<br />
                  03046 Cottbus<br />
                  Deutschland
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-ink mb-1">Berufsrechtliche Regelungen</h3>
                <p>
                  Es gelten die Handwerksordnung (HwO) sowie die ergänzenden
                  Vorschriften. Die Regelungen sind einsehbar unter{' '}
                  <a
                    href="https://www.gesetze-im-internet.de/hwo/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brass hover:text-ink transition-colors duration-[150ms]"
                  >
                    gesetze-im-internet.de/hwo
                  </a>
                  .
                </p>
              </div>
            </div>
          </section>

          <section aria-labelledby="redaktion-heading">
            <h2
              id="redaktion-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              Verantwortlich für den Inhalt nach § 18 Abs. 2 MStV
            </h2>
            <p>
              Usama Azzam<br />
              Sielower Chaussee 38<br />
              03044 Cottbus<br />
              Deutschland
            </p>
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
