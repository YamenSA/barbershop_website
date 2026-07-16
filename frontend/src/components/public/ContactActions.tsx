'use client';

import { siteConfig } from '@/lib/site-config';
import type { SalonProfile } from '@/lib/types';

interface ContactActionsProps {
  profile: SalonProfile;
}

export default function ContactActions({ profile }: ContactActionsProps) {
  // Clean phone number for tel link (remove spaces)
  const cleanPhone = profile.phone.replace(/\s/g, '');

  const actions = [
    {
      title: 'Termin buchen',
      description: 'Buchen Sie Ihren Termin einfach online',
      href: '/termin',
      cta: 'Zur Online-Buchung',
      isPrimary: true,
      external: false,
    },
    {
      title: 'WhatsApp Chat',
      description: 'Schnelle Nachricht an unser Team',
      href: `https://wa.me/${siteConfig.whatsappNumber}`,
      cta: 'Jetzt chatten',
      isPrimary: false,
      external: true,
    },
    {
      title: 'Anrufen',
      description: 'Bei Fragen oder Terminwünschen',
      href: `tel:${cleanPhone}`,
      cta: profile.phone,
      isPrimary: false,
      external: true,
    },
    {
      title: 'E-Mail schreiben',
      description: 'Schreiben Sie uns eine E-Mail',
      href: profile.email ? `mailto:${profile.email}` : '#',
      cta: profile.email || 'Nicht verfügbar',
      isPrimary: false,
      external: true,
      disabled: !profile.email,
    },
    {
      title: 'Bewertung schreiben',
      description: 'Teilen Sie Ihre Erfahrung auf Google',
      href: siteConfig.writeReviewUrl,
      cta: 'Bewertung abgeben',
      isPrimary: false,
      external: true,
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 w-full">
      {actions.map((act, index) => {
        if (act.disabled) return null;

        const isMainCta = act.isPrimary;
        return (
          <a
            key={index}
            href={act.href}
            target={act.external ? '_blank' : undefined}
            rel={act.external ? 'noopener noreferrer' : undefined}
            className={`flex flex-col justify-between p-6 rounded-[8px] border transition-all duration-150 ease-out active:scale-97 ${
              isMainCta
                ? 'bg-slate border-malachite/20 shadow-bevel hover:border-malachite/40 hover:shadow-lift hover:-translate-y-0.5 text-ink'
                : 'bg-slate border-hairline shadow-bevel hover:border-hairline-strong hover:shadow-lift hover:-translate-y-0.5 text-ink'
            }`}
          >
            <div className="mb-6">
              <h3 className="font-display font-bold text-lg mb-1 leading-tight">
                {act.title}
              </h3>
              <p className="text-ash text-sm leading-relaxed">
                {act.description}
              </p>
            </div>
            
            <span
              className={`inline-block py-2.5 px-4 rounded-[4px] text-sm font-semibold text-center w-full transition-colors ${
                isMainCta
                  ? 'bg-malachite text-midnight hover:bg-malachite/90'
                  : 'bg-white/5 text-ink hover:bg-white/10'
              }`}
            >
              {act.cta}
            </span>
          </a>
        );
      })}
    </div>
  );
}
