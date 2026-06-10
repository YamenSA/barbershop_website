import type { SalonProfile, PublicSalonHoursRead } from '@/lib/types';

const SCHEMA_DAY: Record<number, string> = {
  0: 'https://schema.org/Monday',
  1: 'https://schema.org/Tuesday',
  2: 'https://schema.org/Wednesday',
  3: 'https://schema.org/Thursday',
  4: 'https://schema.org/Friday',
  5: 'https://schema.org/Saturday',
  6: 'https://schema.org/Sunday',
};

interface JsonLdProps {
  profile: SalonProfile;
  hours: PublicSalonHoursRead[];
}

export default function JsonLd({ profile, hours }: JsonLdProps) {
  const openHours = hours.filter(
    (h) => h.is_open && h.open_time && h.close_time,
  );

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'HairSalon',
    name: profile.name,
    address: {
      '@type': 'PostalAddress',
      streetAddress: profile.street,
      postalCode: profile.postal_code,
      addressLocality: profile.city,
      addressCountry: profile.country,
    },
    telephone: profile.phone,
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
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}
