'use client';

import { siteConfig } from '@/lib/site-config';
import type { SalonProfile } from '@/lib/types';
import ConsentGate from './ConsentGate';

interface LocationMapProps {
  profile: SalonProfile;
}

export default function LocationMap({ profile }: LocationMapProps) {
  const fallbackAddress = {
    name: profile.name,
    street: profile.street,
    city: profile.city,
    postalCode: profile.postal_code,
  };

  return (
    <div className="w-full">
      <ConsentGate
        consentKey="maps"
        fallbackAddress={fallbackAddress}
        googleProfileUrl={siteConfig.googleProfileUrl}
        previewSrc="/images/map-preview.jpg"
        previewAlt="Vorschau der Straßenkarte Azzam Barbershop"
      >
        <iframe
          src={siteConfig.mapEmbedUrl}
          title="Google Maps Standort Azzam Barbershop"
          width="100%"
          height="100%"
          style={{ border: 0 }}
          allowFullScreen={false}
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          className="w-full h-full rounded-card min-h-[350px] sm:min-h-[450px]"
        />
      </ConsentGate>
    </div>
  );
}
