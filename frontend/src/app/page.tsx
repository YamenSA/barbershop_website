import type { Metadata } from 'next';
import Link from 'next/link';
import Image from 'next/image';
import Nav from '@/components/public/Nav';
import Footer from '@/components/public/Footer';
import BookingCta from '@/components/public/BookingCta';
import HeroVideo from '@/components/public/HeroVideo';
import PromotionsSection from '@/components/public/PromotionsSection';
import TeamCard from '@/components/public/TeamCard';
import BeforeAfterGallery from '@/components/public/BeforeAfterGallery';
import {
  getPublicPromotions,
  getPublicServices,
  getPublicTeamMembers,
  getPublicSalonHours,
  getPublicSalonProfile,
} from '@/lib/api';
import { loadGallery } from '@/lib/content';
import { ueberUns } from '@/content/ueber-uns';
import { siteConfig } from '@/lib/site-config';
import type { PublicServiceRead } from '@/lib/types';

export const metadata: Metadata = {
  title: { absolute: 'Azzam Barbershop — Friseur & Barbershop in Cottbus' },
  description:
    'Präzise Schnitte, professionelle Bartpflege und klassische Fades — Ihr Barbershop in Cottbus. Online buchen, ohne Wartezeit.',
};

// Die Startseite rendert den async <Footer /> und ruft zusätzlich selbst
// getPublicSalonProfile/-Hours (u.a.) auf. Beim statischen Prerender zur Build-Zeit
// läuft das Backend nicht → der Fetch hängt bis zum Timeout und der Build bricht ab.
// Sie liegt außerhalb (public), daher greift der Layout-Fix hier nicht.
// force-dynamic rendert die Seite zur Laufzeit; das frühere `revalidate = 60` entfällt,
// weil es bei dynamischem Per-Request-Rendering wirkungslos und widersprüchlich wäre.
export const dynamic = 'force-dynamic';

const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

// Surface a few signature services first, then fill to four for the teaser.
const HIGHLIGHT_ORDER = ['Herrenhaarschnitt', 'Fade Cut', 'Bartpflege', 'Nassrasur'];

function pickHighlights(services: PublicServiceRead[]): PublicServiceRead[] {
  const score = (s: PublicServiceRead) => {
    const i = HIGHLIGHT_ORDER.findIndex((p) => s.name.toLowerCase().startsWith(p.toLowerCase()));
    return i === -1 ? HIGHLIGHT_ORDER.length : i;
  };
  return [...services].sort((a, b) => score(a) - score(b)).slice(0, 4);
}

function formatPrice(cents: number): string {
  return `${(cents / 100).toFixed(2).replace('.', ',')} €`;
}

function formatTime(t: string | null | undefined): string {
  return t ? t.slice(0, 5) : '';
}

export default async function HomePage() {
  const [promotions, services, team, hours, profile] = await Promise.all([
    getPublicPromotions().catch(() => []),
    getPublicServices().catch(() => []),
    getPublicTeamMembers().catch(() => []),
    getPublicSalonHours().catch(() => []),
    getPublicSalonProfile().catch(() => null),
  ]);

  const highlights = pickHighlights(services);
  const teamTeaser = team.slice(0, 3);
  const galleryPreview = loadGallery().slice(0, 2);

  const mapsQuery = profile
    ? encodeURIComponent(`${profile.name}, ${profile.street}, ${profile.postal_code} ${profile.city}`)
    : '';
  const mapsLink = profile
    ? `https://www.google.com/maps/search/?api=1&query=${mapsQuery}`
    : siteConfig.googleProfileUrl;

  return (
    <>
      <Nav />
      <main id="main-content" className="flex-1 flex flex-col">
        {/* 1 — Hero */}
        <section className="relative overflow-hidden flex flex-col justify-center px-4 sm:px-6 lg:px-8 py-20 min-h-[80svh]">
          <HeroVideo />
          <div className="max-w-7xl mx-auto w-full">
            <h1
              className="font-display font-extrabold leading-[0.95] tracking-[-0.03em] text-ink text-balance mb-6"
              style={{ fontSize: 'clamp(3rem, 8vw, 6rem)' }}
            >
              Präzision.
              <br />
              Jeder Schnitt.
            </h1>
            <p className="text-secondary text-lg leading-relaxed max-w-[55ch] mb-10 text-pretty">
              Herrenhaarschnitt, Bartpflege und Fade — handwerklich präzise, ohne Kompromisse.
              Ihr Barbershop in Cottbus.
            </p>
            <BookingCta />
          </div>
        </section>

        {/* Promotions — auto-hidden when no active promotion */}
        <PromotionsSection promotions={promotions} />

        {/* 2 — Leistungs-Highlights */}
        {highlights.length > 0 && (
          <section className="px-4 sm:px-6 lg:px-8 py-20 bg-slate">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-end justify-between gap-4 mb-10">
                <h2 className="font-display font-bold text-3xl md:text-4xl tracking-[-0.02em] text-ink">
                  Beliebte Leistungen
                </h2>
                <Link
                  href="/dienstleistungen"
                  className="text-malachite font-semibold text-sm hover:underline shrink-0"
                >
                  Alle Preise &rarr;
                </Link>
              </div>
              <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                {highlights.map((s) => (
                  <li
                    key={s.id}
                    className="bg-midnight rounded-[8px] p-5 border border-white/[0.04] flex flex-col gap-3"
                  >
                    <h3 className="font-bold text-ink text-base leading-snug">{s.name}</h3>
                    <p className="text-tertiary text-xs font-medium">
                      {s.duration_minutes} Min.
                    </p>
                    <span className="mt-auto w-fit px-3 py-1 rounded-[4px] text-sm font-semibold tabular-nums text-brass bg-brass/10 border border-brass/10">
                      {formatPrice(s.price_cents)}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* 3 — Team-Teaser */}
        {teamTeaser.length > 0 && (
          <section className="px-4 sm:px-6 lg:px-8 py-20 border-t border-[oklch(0.95_0.004_140/0.08)]">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-end justify-between gap-4 mb-10">
                <h2 className="font-display font-bold text-3xl md:text-4xl tracking-[-0.02em] text-ink">
                  Unser Team
                </h2>
                <Link
                  href="/team"
                  className="text-malachite font-semibold text-sm hover:underline shrink-0"
                >
                  Team kennenlernen &rarr;
                </Link>
              </div>
              <ul className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3" aria-label="Teammitglieder">
                {teamTeaser.map((member, i) => (
                  <li key={member.id}>
                    <TeamCard member={member} priority={i === 0} />
                  </li>
                ))}
              </ul>
            </div>
          </section>
        )}

        {/* 4 — Galerie-Vorschau */}
        {galleryPreview.length > 0 && (
          <section className="px-4 sm:px-6 lg:px-8 py-20 bg-slate">
            <div className="max-w-3xl mx-auto">
              <div className="flex items-end justify-between gap-4 mb-10">
                <h2 className="font-display font-bold text-3xl md:text-4xl tracking-[-0.02em] text-ink">
                  Vorher / Nachher
                </h2>
                <Link
                  href="/galerie"
                  className="text-malachite font-semibold text-sm hover:underline shrink-0"
                >
                  Zur Galerie &rarr;
                </Link>
              </div>
              <BeforeAfterGallery items={galleryPreview} />
            </div>
          </section>
        )}

        {/* 5 — Warum wir (excerpt of Über uns) */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 border-t border-[oklch(0.95_0.004_140/0.08)]">
          <div className="max-w-7xl mx-auto">
            <h2 className="font-display font-bold text-3xl md:text-4xl tracking-[-0.02em] text-ink mb-6">
              Warum Azzam Barbershop?
            </h2>
            <p className="text-secondary text-lg leading-relaxed max-w-[65ch] mb-8 text-pretty">
              {ueberUns.intro}
            </p>
            <Link
              href="/ueber-uns"
              className="text-malachite font-semibold text-sm hover:underline"
            >
              Mehr über uns &rarr;
            </Link>
          </div>
        </section>

        {/* 6 — Öffnungszeiten + Standort */}
        <section className="px-4 sm:px-6 lg:px-8 py-20 bg-slate">
          <div className="max-w-7xl mx-auto grid gap-10 md:grid-cols-2">
            {/* Öffnungszeiten */}
            <div>
              <h2 className="font-display font-bold text-3xl md:text-4xl tracking-[-0.02em] text-ink mb-6">
                Öffnungszeiten
              </h2>
              {hours.length > 0 ? (
                <ul className="text-secondary text-sm max-w-sm">
                  {hours.map((h) => (
                    <li
                      key={h.day_of_week}
                      className="flex justify-between gap-4 py-2 border-b border-white/[0.06]"
                    >
                      <span>{DAY_NAMES[h.day_of_week]}</span>
                      <span className="tabular-nums text-ink">
                        {h.is_open
                          ? `${formatTime(h.open_time)} – ${formatTime(h.close_time)}`
                          : 'Geschlossen'}
                      </span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="text-secondary text-sm">Öffnungszeiten folgen in Kürze.</p>
              )}
            </div>

            {/* Standort */}
            <div>
              <h2 className="font-display font-bold text-3xl md:text-4xl tracking-[-0.02em] text-ink mb-6">
                Standort
              </h2>
              {profile && (
                <address className="not-italic text-secondary text-sm leading-relaxed mb-5">
                  <p className="text-ink font-semibold">{profile.name}</p>
                  <p>{profile.street}</p>
                  <p>{profile.postal_code} {profile.city}</p>
                </address>
              )}
              {/* Static, consent-free map preview (no Google embed/script at rest). */}
              <Link
                href={mapsLink}
                target="_blank"
                rel="noopener noreferrer"
                className="group block relative w-full overflow-hidden rounded-[8px] border border-white/[0.06]"
                style={{ aspectRatio: '16 / 9' }}
                aria-label="Standort auf Google Maps öffnen (öffnet in neuem Tab)"
              >
                <Image
                  src="/images/map-preview.jpg"
                  alt={`Lage des Salons in ${profile?.city ?? 'Cottbus'}`}
                  fill
                  sizes="(min-width: 768px) 50vw, 100vw"
                  className="object-cover transition-transform duration-[200ms] ease-out group-hover:scale-[1.03]"
                />
                <span className="absolute bottom-3 left-3 px-3 py-1.5 rounded-[4px] bg-malachite text-midnight text-xs font-semibold">
                  Route planen
                </span>
              </Link>
            </div>
          </div>
        </section>

        {/* 7 — Finaler CTA */}
        <section className="px-4 sm:px-6 lg:px-8 py-24 border-t border-[oklch(0.95_0.004_140/0.08)]">
          <div className="max-w-3xl mx-auto text-center flex flex-col items-center">
            <h2 className="font-display font-extrabold text-4xl md:text-5xl tracking-[-0.02em] text-ink mb-5 text-balance">
              Bereit für Ihren Schnitt?
            </h2>
            <p className="text-secondary text-lg max-w-[50ch] mb-9 text-pretty">
              Buchen Sie online in unter einer Minute — Bezahlung bequem vor Ort (bar oder Karte).
            </p>
            <BookingCta />
          </div>
        </section>
      </main>

      {/* 8 — Footer */}
      <Footer />
    </>
  );
}
