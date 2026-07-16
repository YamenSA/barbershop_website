'use client';

import React, { ReactNode } from 'react';
import Image from 'next/image';
import { useConsent } from '@/lib/consent';

interface ConsentGateProps {
  consentKey: string;
  fallbackAddress: {
    name: string;
    street: string;
    city: string;
    postalCode: string;
  };
  googleProfileUrl: string;
  previewSrc: string;
  previewAlt: string;
  children: ReactNode;
}

export default function ConsentGate({
  consentKey,
  fallbackAddress,
  googleProfileUrl,
  previewSrc,
  previewAlt,
  children,
}: ConsentGateProps) {
  const { granted, grant, revoke } = useConsent(consentKey);

  if (granted) {
    return (
      <div className="relative w-full h-full flex flex-col">
        <div className="relative flex-1 min-h-[350px] sm:min-h-[450px]">
          {children}
        </div>
        <div className="mt-3 flex justify-between items-center text-xs text-ash">
          <span>Google Maps ist geladen.</span>
          <button
            onClick={revoke}
            className="text-malachite hover:underline focus-visible:ring-1 focus-visible:ring-malachite px-2 py-1 rounded transition-all duration-[150ms] cursor-pointer"
            aria-label="Einwilligung für Google Maps widerrufen"
          >
            Karte deaktivieren (Einwilligung widerrufen)
          </button>
        </div>
      </div>
    );
  }

  const { name, street, city, postalCode } = fallbackAddress;
  const addressQuery = encodeURIComponent(`${street}, ${postalCode} ${city}`);
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${addressQuery}`;

  return (
    <div className="relative w-full h-[350px] sm:h-[450px] rounded-card border border-hairline bg-slate overflow-hidden flex flex-col justify-center items-center p-6 text-center">
      {/* Self-hosted background preview image with dark overlay */}
      <div className="absolute inset-0 z-0">
        <Image
          src={previewSrc}
          alt={previewAlt}
          fill
          sizes="(max-width: 768px) 100vw, 50vw"
          className="object-cover opacity-20 filter blur-[1px]"
          priority
        />
        <div className="absolute inset-0 bg-midnight/80" />
      </div>

      {/* Consent Content Card */}
      <div className="relative z-10 max-w-md space-y-5 px-4">
        <div className="w-12 h-12 rounded-full bg-malachite/10 border border-malachite/20 flex items-center justify-center mx-auto mb-2 text-malachite">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={1.5}
            stroke="currentColor"
            className="w-6 h-6"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              d="M9 12.75 11.25 15 15 9.75M21 12c0 1.268-.63 2.39-1.593 3.068a3.745 3.745 0 0 1-1.043 3.296 3.745 3.745 0 0 1-3.296 1.043A3.745 3.745 0 0 1 12 21c-1.268 0-2.39-.63-3.068-1.593a3.746 3.746 0 0 1-3.296-1.043 3.745 3.745 0 0 1-1.043-3.296A3.745 3.745 0 0 1 3 12c0-1.268.63-2.39 1.593-3.068a3.745 3.745 0 0 1 1.043-3.296 3.746 3.746 0 0 1 3.296-1.043A3.746 3.746 0 0 1 12 3c1.268 0 2.39.63 3.068 1.593a3.746 3.746 0 0 1 3.296 1.043 3.745 3.745 0 0 1 1.043 3.296A3.745 3.745 0 0 1 21 12Z"
            />
          </svg>
        </div>

        <h3 className="text-ink font-semibold text-lg sm:text-xl font-display tracking-tight">
          Google Maps aktivieren?
        </h3>

        <p className="text-ash text-sm leading-relaxed">
          Um die interaktive Karte anzuzeigen, ist Ihre Einwilligung erforderlich. 
          Beim Laden der Karte baut Ihr Browser eine Verbindung zu Google auf. 
          Dabei werden Cookies gesetzt und Ihre IP-Adresse an Google übertragen.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
          <button
            onClick={grant}
            className="w-full sm:w-auto px-5 py-2.5 bg-malachite hover:bg-malachite/90 text-midnight font-semibold text-sm rounded-btn transition-colors duration-[150ms] focus-visible:ring-2 focus-visible:ring-malachite cursor-pointer"
          >
            Karte laden
          </button>
          
          <a
            href={googleProfileUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="w-full sm:w-auto px-5 py-2.5 border border-white/10 hover:border-white/20 text-ink font-semibold text-sm rounded-btn transition-colors duration-[150ms] focus-visible:ring-2 focus-visible:ring-white/30"
          >
            Route auf Google Maps planen
          </a>
        </div>

        <div className="text-ash text-[11px] pt-2 border-t border-white/[0.04]">
          Sie können Ihre Einwilligung jederzeit widerrufen. Mehr Infos in der{' '}
          <a href="/datenschutz" className="text-malachite hover:underline">
            Datenschutzerklärung
          </a>
          .
        </div>
      </div>
    </div>
  );
}
