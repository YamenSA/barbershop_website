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
            <p>Verantwortlich für die Datenverarbeitung auf dieser Website ist:</p>
            <p className="mt-3">
              Usama Azzam (Azzam Barbershop)<br />
              Sielower Chaussee 38<br />
              03044 Cottbus<br />
              Deutschland
            </p>
            <p className="mt-3">
              Telefon:{' '}
              <a
                href="tel:+4917682200682"
                className="text-brass hover:text-ink transition-colors duration-[150ms]"
              >
                +49 176 82200682
              </a>
              <br />
              E-Mail:{' '}
              <a
                href="mailto:Oazzam412@gmail.com"
                className="text-brass hover:text-ink transition-colors duration-[150ms]"
              >
                Oazzam412@gmail.com
              </a>
            </p>
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
                  <strong className="text-ink">Brevo</strong> (Brevo GmbH, vormals
                  Sendinblue GmbH, Köpenicker Straße 126, 10179 Berlin, Deutschland).
                </p>
                <p className="mt-2">
                  Dabei wird Ihre E-Mail-Adresse an Brevo übermittelt. Die Verarbeitung erfolgt
                  auf Servern innerhalb der Europäischen Union. Weitere Informationen finden Sie
                  in der Datenschutzerklärung von Brevo:{' '}
                  <a
                    href="https://www.brevo.com/de/legal/privacypolicy/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-brass hover:text-ink transition-colors duration-[150ms]"
                  >
                    brevo.com/de/legal/privacypolicy
                  </a>
                </p>
                <p className="mt-2">
                  Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO.
                </p>
              </div>
            </div>
          </section>

          {/* 6. Kundenkonto */}
          <section aria-labelledby="konto-heading">
            <h2
              id="konto-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              6. Kundenkonto (Self-Service-Portal)
            </h2>
            <p>
              Sie können freiwillig ein persönliches Kundenkonto anlegen. Die Registrierung
              erfordert eine Bestätigung Ihrer E-Mail-Adresse (Double-Opt-in). Im Rahmen des
              Kundenkontos verarbeiten wir folgende Daten:
            </p>
            <ul className="mt-3 space-y-1 list-disc list-inside">
              <li>Name, E-Mail-Adresse, Telefonnummer (optional)</li>
              <li>Sitzungstoken (HttpOnly-Cookie <code>customer_session</code>, max. 30 Tage)</li>
              <li>Verschlüsseltes Passwort (bcrypt, nicht rücklesbar)</li>
              <li>Terminhistorie (vergangene und kommende Buchungen)</li>
            </ul>
            <p className="mt-3">
              Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragserfüllung bzw.
              vorvertragliche Maßnahmen) und Art. 6 Abs. 1 lit. f DSGVO (berechtigtes Interesse
              am sicheren Betrieb des Portals).
            </p>
            <p className="mt-3">
              Sie können Ihr Konto jederzeit unter <strong>/konto/datenschutz</strong> löschen.
              Dabei werden kommende Termine storniert und vergangene Buchungsdaten anonymisiert.
              Sie können außerdem jederzeit eine maschinenlesbare Kopie Ihrer Daten
              (Art. 20 DSGVO) aus dem Portal herunterladen.
            </p>
          </section>

          {/* 7. Speicherdauer */}
          <section aria-labelledby="speicher-heading">
            <h2
              id="speicher-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              7. Speicherdauer
            </h2>
            <p>
              Personenbezogene Daten werden nur so lange gespeichert, wie es für den jeweiligen
              Zweck erforderlich ist. Im Einzelnen gelten folgende Fristen:
            </p>
            <ul className="mt-3 space-y-1 list-disc list-inside">
              <li>
                <strong className="text-ink">Termine ohne Kundenkonto (Gastbuchungen):</strong>{' '}
                Name und Telefonnummer werden 12 Monate nach dem Termin automatisch anonymisiert.
              </li>
              <li>
                <strong className="text-ink">Kundenkonten:</strong> Bei 24 Monaten ohne
                Aktivität werden die Kontodaten automatisch anonymisiert. Unabhängig davon
                können Sie Ihr Konto jederzeit selbst löschen.
              </li>
            </ul>
            <p className="mt-3">
              Soweit gesetzliche Aufbewahrungspflichten (z. B. handels- oder steuerrechtlicher
              Art) bestehen, werden die betroffenen Daten für die Dauer dieser Pflichten
              gespeichert und erst nach deren Ablauf gelöscht.
            </p>
          </section>

          {/* 8. Ihre Rechte */}
          <section aria-labelledby="rechte-heading">
            <h2
              id="rechte-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              8. Ihre Rechte
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

          {/* 9. Beschwerderecht */}
          <section aria-labelledby="beschwerde-heading">
            <h2
              id="beschwerde-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              9. Beschwerderecht bei der Aufsichtsbehörde
            </h2>
            <p>
              Sie haben das Recht, sich bei einer Datenschutz-Aufsichtsbehörde über die
              Verarbeitung Ihrer personenbezogenen Daten durch uns zu beschweren.
            </p>
            <p className="mt-3">Die für uns zuständige Aufsichtsbehörde ist:</p>
            <p className="mt-3">
              Die Landesbeauftragte für den Datenschutz und für das Recht auf
              Akteneinsicht Brandenburg (LDA Brandenburg)<br />
              Stahnsdorfer Damm 77<br />
              14532 Kleinmachnow<br />
              Deutschland<br />
              <a
                href="https://www.lda.brandenburg.de"
                target="_blank"
                rel="noopener noreferrer"
                className="text-brass hover:text-ink transition-colors duration-[150ms]"
              >
                www.lda.brandenburg.de
              </a>
            </p>
          </section>

          {/* 10. Drittanbieter-Dienste und externe Links */}
          <section aria-labelledby="drittanbieter-heading">
            <h2
              id="drittanbieter-heading"
              className="font-display font-bold text-lg text-ink mb-3 tracking-[-0.01em]"
            >
              10. Drittanbieter-Dienste und externe Links
            </h2>
            <p>
              Wir binden auf unserer Website verschiedene externe Dienste und Links ein, um Ihnen
              die Kontaktaufnahme zu erleichtern, unseren Standort zu zeigen und unsere Social-Media-Kanäle
              zugänglich zu machen.
            </p>

            <div className="mt-4 space-y-6">
              <div>
                <h3 className="font-semibold text-ink mb-2">Google Maps</h3>
                <p>
                  Auf dieser Website nutzen wir das Angebot von Google Maps (Google Ireland Limited, Gordon House, Barrow Street, Dublin 4, Irland).
                  Damit können wir Ihnen eine interaktive Karte direkt auf der Website anzeigen.
                </p>
                <p className="mt-2">
                  <strong>Zweistufige Lösung (Click-to-Load):</strong> Um Ihre Privatsphäre zu schützen, ist die Karte standardmäßig deaktiviert.
                  Erst wenn Sie aktiv auf „Karte laden“ klicken (Einwilligung gemäß Art. 6 Abs. 1 lit. a DSGVO, § 25 Abs. 1 TTDSG),
                  baut Ihr Browser eine direkte Verbindung zu den Servern von Google auf. Google erhält dadurch die Information, dass Sie die
                  entsprechende Unterseite unserer Website aufgerufen haben, sowie Ihre IP-Adresse und ggf. weitere Browserdaten.
                  Es können Cookies auf Ihrem Gerät gespeichert werden. Die Datenübertragung kann auch an Server der Google LLC in den USA erfolgen.
                </p>
                <p className="mt-2">
                  <strong>Widerrufsrecht:</strong> Sie können Ihre Einwilligung jederzeit widerrufen, indem Sie auf die Schaltfläche „Karte deaktivieren“
                  unterhalb der geladenen Karte klicken. Die Entscheidung wird clientseitig in Ihrem Browser (im LocalStorage unter dem Schlüssel{' '}
                  <code>consent:maps</code>) gespeichert.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink mb-2">WhatsApp-Kontakt</h3>
                <p>
                  Sie können uns über den Instant-Messaging-Dienst WhatsApp kontaktieren. WhatsApp wird von der WhatsApp Ireland Limited (4 Grand Canal Square, Grand Canal Harbour, Dublin 2, Irland) betrieben.
                </p>
                <p className="mt-2">
                  Die Kommunikation erfolgt über eine direkte Verlinkung auf unserer Website (reine Link-Schaltfläche). Es werden beim bloßen Besuch unserer Seite
                  keine Daten an WhatsApp oder Meta übermittelt. Erst wenn Sie auf den Link klicken, werden Sie zu WhatsApp weitergeleitet.
                  Bei der Kontaktaufnahme übermitteln Sie uns Ihre Telefonnummer sowie den Inhalt Ihrer Nachricht.
                  Rechtsgrundlage ist Art. 6 Abs. 1 lit. b DSGVO (Vertragsanbahnung bzw. -erfüllung).
                  Bitte beachten Sie, dass WhatsApp Daten in Drittländer (insbesondere in die USA) übertragen kann.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink mb-2">Google-Bewertungen (Statischer Snapshot)</h3>
                <p>
                  Wir zeigen auf unserer Website ausgewählte Google-Bewertungen an. Diese Bewertungen werden als statischer Text (Snapshot)
                  direkt aus dem Quellcode unserer Website geladen.
                </p>
                <p className="mt-2">
                  Es erfolgt beim Anzeigen dieser Bewertungen <strong>keine</strong> Verbindung zu den Google-Servern und es werden keine
                  Skripte oder Cookies von Google geladen (einwilligungsfreie Darstellung).
                  Wir verarbeiten dabei die Rezensenten-Namen und Bewertungstexte, die Sie bereits öffentlich auf Google publiziert haben.
                  Sollten Sie eine von Ihnen verfasste Bewertung auf unserer Website entdecken und die Entfernung wünschen, können Sie uns dies
                  jederzeit mitteilen (z.B. per E-Mail). Wir werden den Text dann umgehend aus unserem Repository löschen.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink mb-2">Social-Media-Links (Instagram)</h3>
                <p>
                  Wir verlinken auf unserer Website auf unser Profil bei Instagram. Es handelt sich hierbei um einen einfachen HTML-Link,
                  nicht um eingebettete Feeds, Widgets oder Social-Plug-ins.
                </p>
                <p className="mt-2">
                  Beim Besuch unserer Website werden keine Daten an diese Plattformen übermittelt. Erst wenn Sie die Links anklicken und zu den
                  entsprechenden Plattformen weitergeleitet werden, erfassen diese Anbieter Ihre Daten (z. B. IP-Adresse, Cookies).
                  Bitte informieren Sie sich in den Datenschutzerklärungen der jeweiligen Anbieter über deren Datenverarbeitung.
                </p>
              </div>

              <div>
                <h3 className="font-semibold text-ink mb-2">Hinweis zur Datenübermittlung in Drittstaaten</h3>
                <p>
                  Einige der oben genannten Anbieter (z. B. Google LLC, Meta Platforms Inc.) haben ihren Hauptsitz in den USA.
                  Die Übermittlung personenbezogener Daten in die USA erfolgt auf Grundlage des EU-US Data Privacy Frameworks (DPF)
                  bzw. auf Basis von Standardvertragsklauseln der EU-Kommission.
                </p>
              </div>
            </div>
          </section>

        </div>
      </div>
    </section>
  );
}

