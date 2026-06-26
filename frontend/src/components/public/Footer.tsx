import Link from 'next/link';
import { getPublicSalonProfile, getPublicSalonHours } from '@/lib/api';
import type { PublicSalonHoursRead, SalonProfile } from '@/lib/types';
import { siteConfig } from '@/lib/site-config';

const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

function formatTime(t: string | null | undefined): string {
  if (!t) return '';
  return t.slice(0, 5);
}

export default async function Footer() {
  let profile: SalonProfile | null = null;
  let hours: PublicSalonHoursRead[] = [];

  try {
    [profile, hours] = await Promise.all([
      getPublicSalonProfile(),
      getPublicSalonHours(),
    ]);
  } catch {
    // Backend unavailable at build time — render minimal footer
  }

  return (
    <footer className="bg-slate border-t border-[oklch(0.95_0.004_140/0.08)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-10">

          {/* Brand */}
          <div>
            <p className="font-display font-extrabold text-xl tracking-[-0.02em] text-ink mb-2">
              AZZAM BARBERSHOP
            </p>
            <p className="text-ash text-sm leading-relaxed">
              Präzise Schnitte.<br />Ihr Barbershop.
            </p>
          </div>

          {/* Contact */}
          {profile && (
            <div>
              <h2 className="text-ink font-semibold text-xs uppercase tracking-[0.08em] mb-3">
                Kontakt
              </h2>
              <address className="not-italic text-ash text-sm space-y-1.5 leading-relaxed">
                <p>{profile.street}</p>
                <p>{profile.postal_code} {profile.city}</p>
                {profile.phone && (
                  <p>
                    <a
                      href={`tel:${profile.phone.replace(/\s/g, '')}`}
                      className="hover:text-ink transition-colors duration-[150ms]"
                    >
                      {profile.phone}
                    </a>
                  </p>
                )}
                {profile.email && (
                  <p>
                    <a
                      href={`mailto:${profile.email}`}
                      className="hover:text-ink transition-colors duration-[150ms]"
                    >
                      {profile.email}
                    </a>
                  </p>
                )}
              </address>
            </div>
          )}

          {/* Hours */}
          {hours.length > 0 && (
            <div>
              <h2 className="text-ink font-semibold text-xs uppercase tracking-[0.08em] mb-3">
                Öffnungszeiten
              </h2>
              <ul className="text-ash text-sm space-y-1.5">
                {hours.map((h) => (
                  <li key={h.day_of_week} className="flex justify-between gap-4">
                    <span>{DAY_NAMES[h.day_of_week]}</span>
                    <span>
                      {h.is_open
                        ? `${formatTime(h.open_time)} – ${formatTime(h.close_time)}`
                        : 'Geschlossen'}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {/* Social Links */}
          <div>
            <h2 className="text-ink font-semibold text-xs uppercase tracking-[0.08em] mb-3">
              Social Media
            </h2>
            <ul className="text-ash text-sm space-y-1.5">
              {siteConfig.instagramUrl && (
                <li>
                  <a
                    href={siteConfig.instagramUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-ink transition-colors duration-[150ms]"
                  >
                    Instagram
                  </a>
                </li>
              )}
              {siteConfig.tiktokUrl && (
                <li>
                  <a
                    href={siteConfig.tiktokUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-ink transition-colors duration-[150ms]"
                  >
                    TikTok
                  </a>
                </li>
              )}
              <li>
                <a
                  href={`https://wa.me/${siteConfig.whatsappNumber}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink transition-colors duration-[150ms]"
                >
                  WhatsApp Chat
                </a>
              </li>
              <li>
                <a
                  href={siteConfig.writeReviewUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-ink transition-colors duration-[150ms]"
                >
                  Bewertung schreiben
                </a>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Legal bar */}
      <div className="border-t border-[oklch(0.95_0.004_140/0.08)]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4 flex flex-wrap gap-6">
          <Link
            href="/impressum"
            className="text-ash text-sm hover:text-ink transition-colors duration-[150ms]"
          >
            Impressum
          </Link>
          <Link
            href="/datenschutz"
            className="text-ash text-sm hover:text-ink transition-colors duration-[150ms]"
          >
            Datenschutz
          </Link>
        </div>
      </div>
    </footer>
  );
}
