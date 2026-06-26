import type { SalonProfile, PublicSalonHoursRead } from '@/lib/types';
import { getLocalBusinessSchema } from '@/lib/seo';

interface JsonLdProps {
  profile: SalonProfile;
  hours: PublicSalonHoursRead[];
}

export default function JsonLd({ profile, hours }: JsonLdProps) {
  const schema = getLocalBusinessSchema(profile, hours);

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  );
}

