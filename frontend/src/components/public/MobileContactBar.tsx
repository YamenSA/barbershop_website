'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { getPublicSalonProfile } from '@/lib/api';
import { siteConfig } from '@/lib/site-config';

export default function MobileContactBar() {
  const [phone, setPhone] = useState<string>('');

  useEffect(() => {
    getPublicSalonProfile()
      .then((profile) => {
        if (profile?.phone) {
          setPhone(profile.phone.replace(/\s/g, ''));
        }
      })
      .catch(() => {
        // Fallback if API fails
      });
  }, []);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-50 md:hidden bg-slate border-t border-white/10 px-4 py-2 flex items-center justify-between gap-3 shadow-[0_-4px_12px_rgba(0,0,0,0.5)]">
      {/* WhatsApp Button */}
      <a
        href={`https://wa.me/${siteConfig.whatsappNumber}`}
        target="_blank"
        rel="noopener noreferrer"
        className="flex-1 flex flex-col items-center justify-center py-2 px-1 text-xs font-semibold rounded-[4px] bg-white/5 text-ink active:scale-95 transition-all duration-150 ease-out"
      >
        <svg
          className="w-5 h-5 mb-1 text-malachite"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M12 2C6.48 2 2 6.48 2 12c0 2.17.69 4.19 1.86 5.86L2.61 22.02l4.33-1.13C8.42 21.49 10.15 22 12 22c5.52 0 10-4.48 10-10S17.52 2 12 2z"
          />
        </svg>
        WhatsApp
      </a>

      {/* Call Button */}
      <a
        href={phone ? `tel:${phone}` : '#'}
        className={`flex-1 flex flex-col items-center justify-center py-2 px-1 text-xs font-semibold rounded-[4px] bg-white/5 text-ink active:scale-95 transition-all duration-150 ease-out ${
          !phone ? 'opacity-50 pointer-events-none' : ''
        }`}
      >
        <svg
          className="w-5 h-5 mb-1 text-brass"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"
          />
        </svg>
        Anrufen
      </a>

      {/* Book Appointment Button */}
      <Link
        href="/termin"
        className="flex-[1.5] flex flex-col items-center justify-center py-2 px-1 text-xs font-bold rounded-[4px] bg-malachite text-midnight active:scale-95 transition-all duration-150 ease-out"
      >
        <svg
          className="w-5 h-5 mb-1 text-midnight"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
          />
        </svg>
        Termin buchen
      </Link>
    </div>
  );
}
