import type { SalonProfile, PublicSalonHoursRead } from './types';
import { siteConfig } from './site-config';

const SCHEMA_DAY: Record<number, string> = {
  0: 'https://schema.org/Monday',
  1: 'https://schema.org/Tuesday',
  2: 'https://schema.org/Wednesday',
  3: 'https://schema.org/Thursday',
  4: 'https://schema.org/Friday',
  5: 'https://schema.org/Saturday',
  6: 'https://schema.org/Sunday',
};

/**
 * Generates the schema.org/HairSalon (LocalBusiness) JSON-LD structure (T045 / FR-015).
 * Combines profile stammdaten (NAP), open hours, and geo coordinates from site-config.
 */
export function getLocalBusinessSchema(
  profile: SalonProfile,
  hours: PublicSalonHoursRead[]
) {
  const openHours = hours.filter(
    (h) => h.is_open && h.open_time && h.close_time
  );

  return {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    name: profile.name,
    image: [
      `${process.env.NEXT_PUBLIC_APP_URL || 'https://azzam-barbershop.de'}/images/map-preview.jpg`,
    ],
    '@id': `${process.env.NEXT_PUBLIC_APP_URL || 'https://azzam-barbershop.de'}#hairsalon`,
    url: process.env.NEXT_PUBLIC_APP_URL || 'https://azzam-barbershop.de',
    telephone: profile.phone,
    address: {
      '@type': 'PostalAddress',
      streetAddress: profile.street,
      postalCode: profile.postal_code,
      addressLocality: profile.city,
      addressCountry: profile.country,
    },
    geo: {
      '@type': 'GeoCoordinates',
      latitude: siteConfig.geo.lat,
      longitude: siteConfig.geo.lng,
    },
    ...(profile.email ? { email: profile.email } : {}),
    ...(openHours.length > 0
      ? {
          openingHoursSpecification: openHours.map((h) => ({
            '@type': 'OpeningHoursSpecification',
            dayOfWeek: SCHEMA_DAY[h.day_of_week],
            opens: h.open_time!.slice(0, 5),
            closes: h.close_time!.slice(0, 5),
          })),
        }
      : {}),
    sameAs: [
      siteConfig.instagramUrl,
      siteConfig.tiktokUrl,
      siteConfig.googleProfileUrl,
    ].filter(Boolean),
  };
}
