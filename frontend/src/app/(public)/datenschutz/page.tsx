import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: { absolute: 'Datenschutzerklärung | Azzam Barbershop' },
  description:
    'Informationen zur Verarbeitung personenbezogener Daten auf dieser Website.',
  robots: { index: false },
};

export const revalidate = 3600;

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

export default function DatenschutzPage() {
  return (
    <section className="px-4 sm:px-6 lg:px-8 py-16">
      <div className="max-w-3xl mx-auto">
        <h1
          className="font-display font-extrabold leading-[0.95] tracking-[-0.03em] text-ink mb-4"
          style={{ fontSize: 'clamp(2rem, 5vw, 3rem)' }}
        >
          Datenschutz&shy;erklärung
        </h1>
        <p className="text-ash text-sm mb-10">Stand: Juni 2026</p>

        <div className="space-y-10 text-ash text-base leading-relaxed">

          {/* 1. Verantwortlicher */}
          <section aria-labelledby="verantwortlicher-heading">
            <h2
              id="verantwortlicher-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              1. Verantwortlicher
            </h2>
            <PlaceholderBlock>
              <p>Verantwortliche Person/Stelle gemäß DSGVO Art. 4 Nr. 7 eintragen:</p>
              <ul className="mt-2 space-y-1 list-disc list-inside">
                <li>Vollständiger Name / Firma</li>
                <li>Vollständige Anschrift</li>
                <li>E-Mail-Adresse</li>
                <li>Telefonnummer</li>
              </ul>
            </PlaceholderBlock>
          </section>

          {/* 2. Allgemeine Hinweise */}
          <section aria-labelledby="allgemein-heading">
            <h2
              id="allgemein-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              2. Allgemeine Hinweise
            </h2>
            <p>
              Wir nehmen den Schutz Ihrer persönlichen Daten sehr ernst. Wir behandeln Ihre
              personenbezogenen Daten vertraulich und entsprechend der gesetzlichen
              Datenschutzvorschriften sowie dieser Datenschutzerklärung.
            </p>
            <p className="mt-3">
              Die Nutzung unserer Website ist in der Regel ohne Angabe personenbezogener Daten
              möglich. Soweit auf unseren Seiten personenbezogene Daten erhoben werden
              (zum Beispiel Name und Telefonnummer bei der Terminbuchung), erfolgt dies, soweit
              möglich, stets auf freiwilliger Basis.
            </p>
          </section>

          {/* 3. Cookies */}
          <section aria-labelledby="cookies-heading">
            <h2
              id="cookies-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              3. Cookies
            </h2>
            <p>
              Diese Website verwendet ausschließlich technisch notwendige Cookies. Es werden
              keine Tracking-Cookies, Analyse-Cookies oder Cookies zu Werbezwecken gesetzt.
              Ein Cookie-Consent-Banner ist daher nicht erforderlich.
            </p>
            <p className="mt-3">
              Technisch notwendige Cookies dienen der Sicherstellung des technischen Betriebs
              (z. B. Sitzungsverwaltung für den Administrationsbereich). Sie werden nicht an
              Dritte weitergegeben und werden nach Ablauf der Sitzung bzw. nach einem kurzen
              Zeitraum automatisch gelöscht.
            </p>
            <p className="mt-3">
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse am
              technischen Betrieb der Website).
            </p>
          </section>

          {/* 4. Server-Logfiles */}
          <section aria-labelledby="server-heading">
            <h2
              id="server-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              4. Server-Logfiles
            </h2>
            <p>
              Der Hosting-Anbieter dieser Website erhebt und speichert automatisch Informationen
              in sogenannten Server-Logfiles, die Ihr Browser automatisch übermittelt. Dies sind:
            </p>
            <ul className="mt-3 space-y-1 list-disc list-inside">
              <li>Browsertyp und Browserversion</li>
              <li>Verwendetes Betriebssystem</li>
              <li>Referrer-URL</li>
              <li>Hostname des zugreifenden Rechners</li>
              <li>Uhrzeit der Serveranfrage</li>
              <li>IP-Adresse (anonymisiert bzw. nach kurzer Zeit gelöscht)</li>
            </ul>
            <p className="mt-3">
              Diese Daten sind nicht bestimmten Personen zuordenbar. Eine Zusammenführung dieser
              Daten mit anderen Datenquellen wird nicht vorgenommen. Rechtsgrundlage ist Art. 6
              Abs. 1 lit. f DSGVO.
            </p>
            <div className="mt-3">
              <PlaceholderBlock>
                <p>Name und Datenschutzinformationen des Hosting-Anbieters eintragen (z. B. Hetzner, Uberspace, AWS, etc.) sowie dessen Datenschutzerklärung verlinken.</p>
              </PlaceholderBlock>
            </div>
          </section>

          {/* 5. Terminbuchung */}
          <section aria-labelledby="buchung-heading">
            <h2
              id="buchung-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              5. Terminbuchung
            </h2>
            <p>
              Bei der Online-Terminbuchung erheben wir folgende Daten, die für die Durchführung
              und Bestätigung des Termins erforderlich sind:
            </p>
            <ul className="mt-3 space-y-1 list-disc list-inside">
              <li>Name</li>
              <li>E-Mail-Adresse (für Buchungsbestätigung, Storno-Link und Erinnerung)</li>
              <li>Telefonnummer (optional)</li>
              <li>Gewünschte Dienstleistung und Wunschtermin</li>
            </ul>
            <p className="mt-3">
              Diese Daten werden ausschließlich für die Terminverwaltung verwendet. Sie werden
              nicht an unbeteiligte Dritte weitergegeben. Rechtsgrundlage ist Art. 6 Abs. 1
              lit. b DSGVO (Vertragsanbahnung bzw. -erfüllung).
            </p>
            <p className="mt-3">
              Termindaten werden gemäß unserer Aufbewahrungsfrist gespeichert und danach
              anonymisiert oder gelöscht.
            </p>

            <div className="mt-4 space-y-4">
              <div>
                <h3 className="font-semibold text-ink mb-2">Versand von Termin-Mails (Bestätigung, Erinnerung)</h3>
                <p>
                  Die Zustellung von Bestätigungs-E-Mails und Terminerinnerungen erfolgt über den Dienst{' '}
                  <strong className="text-ink">Twilio SendGrid</strong> (Twilio Inc.,
                  375 Beale Street, Suite 300, San Francisco, CA 94105, USA).
                </p>
                <p className="mt-2">
                  Dabei wird Ihre E-Mail-Adresse an SendGrid übermittelt. Twilio ist nach dem
                  EU-US Data Privacy Framework zertifiziert. Weitere Informationen finden Sie
                  in der Datenschutzerklärung von Twilio:{' '}
                  <a
                    href="https://www.twilio.com/en-us/legal/privacy"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brass hover:text-ink transition-colors duration-[150ms]"
                  >
                    twilio.com/en-us/legal/privacy
                  </a>
                </p>
                <p className="mt-2">
                  Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
                </p>
              </div>
            </div>
          </section>

          {/* 6. Speicherdauer */}
          <section aria-labelledby="speicher-heading">
            <h2
              id="speicher-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              6. Speicherdauer
            </h2>
            <p>
              Personenbezogene Daten werden nur so lange gespeichert, wie es für den jeweiligen
              Zweck erforderlich ist. Termindaten inaktiver Kundendaten werden nach{' '}
              <PlaceholderBlock>
                <p>Aufbewahrungsfrist gemäß betrieblicher Entscheidung eintragen (z. B. 24 Monate nach letztem Termin) und prüfen, ob handels- oder steuerrechtliche Aufbewahrungspflichten (6–10 Jahre) gelten.</p>
              </PlaceholderBlock>
            </p>
          </section>

          {/* 7. Ihre Rechte */}
          <section aria-labelledby="rechte-heading">
            <h2
              id="rechte-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              7. Ihre Rechte
            </h2>
            <p>Sie haben gegenüber uns folgende Rechte hinsichtlich Ihrer personenbezogenen Daten:</p>
            <ul className="mt-3 space-y-2 list-disc list-inside">
              <li>
                <strong className="text-ink">Auskunft</strong> (Art. 15 DSGVO): Sie können Auskunft über
                Ihre bei uns gespeicherten personenbezogenen Daten verlangen.
              </li>
              <li>
                <strong className="text-ink">Berichtigung</strong> (Art. 16 DSGVO): Sie haben das Recht,
                unrichtige Daten berichtigen zu lassen.
              </li>
              <li>
                <strong className="text-ink">Löschung</strong> (Art. 17 DSGVO): Sie können die Löschung
                Ihrer Daten verlangen, sofern keine gesetzlichen Aufbewahrungspflichten entgegenstehen.
              </li>
              <li>
                <strong className="text-ink">Einschränkung der Verarbeitung</strong> (Art. 18 DSGVO)
              </li>
              <li>
                <strong className="text-ink">Datenübertragbarkeit</strong> (Art. 20 DSGVO)
              </li>
              <li>
                <strong className="text-ink">Widerspruch</strong> (Art. 21 DSGVO): Sie können der
                Verarbeitung Ihrer Daten auf Basis berechtigter Interessen widersprechen.
              </li>
            </ul>
            <p className="mt-4">
              Zur Ausübung Ihrer Rechte wenden Sie sich bitte an die im Impressum genannte
              Kontaktadresse.
            </p>
          </section>

          {/* 8. Beschwerderecht */}
          <section aria-labelledby="beschwerde-heading">
            <h2
              id="beschwerde-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              8. Beschwerderecht bei der Aufsichtsbehörde
            </h2>
            <p>
              Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die
              Verarbeitung Ihrer personenbezogenen Daten durch uns zu beschweren.
            </p>
            <div className="mt-3">
              <PlaceholderBlock>
                <p>Zuständige Landesdatenschutzbehörde eintragen (richtet sich nach dem Bundesland des Betriebssitzes, z. B. Berliner Beauftragte für Datenschutz und Informationsfreiheit).</p>
              </PlaceholderBlock>
            </div>
          </section>

        </div>
      </div>
    </section>
  );
}
