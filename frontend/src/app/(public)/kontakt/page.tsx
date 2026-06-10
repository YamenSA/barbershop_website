import type { Metadata } from 'next';
import { getPublicSalonProfile, getPublicSalonHours } from '@/lib/api';
import type { SalonProfile, PublicSalonHoursRead } from '@/lib/types';
import JsonLd from '@/components/public/JsonLd';

export const metadata: Metadata = {
  title: 'Kontakt & Öffnungszeiten',
  description:
    'Adresse, Telefon und Öffnungszeiten des Azzam Barbershop — wir freuen uns auf Ihren Besuch.',
};

export const revalidate = 60;

const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  return t.slice(0, 5);
}

export default async function KontaktPage() {
  let profile: SalonProfile | null = null;
  let hours: PublicSalonHoursRead[] = [];

  try {
    [profile, hours] = await Promise.all([
      getPublicSalonProfile(),
      getPublicSalonHours(),
    ]);
  } catch {
    // Backend unavailable — render degraded view
  }

  return (
    <>
      {profile && hours.length > 0 && (
        <JsonLd profile={profile} hours={hours} />
      )}

      <section className="px-4 sm:px-6 lg:px-8 py-16">
        <div className="max-w-7xl mx-auto">
          <h1
            className="font-display font-extrabold leading-[0.95] tracking-[-0.03em] text-ink mb-12"
            style={{ fontSize: 'clamp(2rem, 5vw, 3.5rem)' }}
          >
            Kontakt
          </h1>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-12 lg:gap-20">

            {/* Contact details */}
            <div className="space-y-8">
              {profile ? (
                <>
                  <div>
                    <h2 className="text-ink font-semibold text-xs uppercase tracking-[0.08em] mb-4">
                      Adresse
                    </h2>
                    <address className="not-italic text-ash leading-relaxed space-y-1">
                      <p className="text-ink font-semibold">{profile.name}</p>
                      <p>{profile.street}</p>
                      <p>{profile.postal_code} {profile.city}</p>
                    </address>
                  </div>

                  <div>
                    <h2 className="text-ink font-semibold text-xs uppercase tracking-[0.08em] mb-4">
                      Erreichbar
                    </h2>
                    <div className="space-y-2">
                      <p>
                        <a
                          href={`tel:${profile.phone.replace(/\s/g, '')}`}
                          className="text-ash hover:text-ink transition-colors duration-[150ms]"
                        >
                          {profile.phone}
                        </a>
                      </p>
                      {profile.email && (
                        <p>
                          <a
                            href={`mailto:${profile.email}`}
                            className="text-ash hover:text-ink transition-colors duration-[150ms]"
                          >
                            {profile.email}
                          </a>
                        </p>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <p className="text-ash">
                  Kontaktdaten werden gerade aktualisiert — bitte später erneut versuchen.
                </p>
              )}
            </div>

            {/* Opening hours */}
            <div>
              <h2 className="text-ink font-semibold text-xs uppercase tracking-[0.08em] mb-4">
                Öffnungszeiten
              </h2>
              {hours.length > 0 ? (
                <dl className="space-y-2">
                  {hours.map((h) => (
                    <div
                      key={h.day_of_week}
                      className="flex justify-between gap-6 py-2 border-b border-[oklch(0.95_0.004_140/0.06)]"
                    >
                      <dt className="text-ash">{DAY_NAMES[h.day_of_week]}</dt>
                      <dd className={h.is_open ? 'text-ink' : 'text-ash'}>
                        {h.is_open
                          ? `${formatTime(h.open_time)} – ${formatTime(h.close_time)} Uhr`
                          : 'Geschlossen'}
                      </dd>
                    </div>
                  ))}
                </dl>
              ) : (
                <p className="text-ash">
                  Öffnungszeiten werden gerade aktualisiert.
                </p>
              )}
            </div>

          </div>
        </div>
      </section>
    </>
  );
}
