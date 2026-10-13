"use client";

import Image from "next/image";
import Link from "next/link";
import { useConsent } from "@/lib/consent";
import type { SalonProfile } from "@/lib/types";
import Button from "@/components/ui/Button";
import TextLink from "@/components/ui/TextLink";

export default function HomeLocationMap({ profile }: { profile: SalonProfile | null }) {
  const { granted, grant, revoke } = useConsent("maps");
  const query = profile ? `${profile.street}, ${profile.postal_code} ${profile.city}` : null;
  if (!query) return <p className="rounded-xl border border-line bg-surface-card p-6 text-ink-muted">Standortdaten sind gerade nicht verfügbar. Bitte versuche es später erneut.</p>;
  const route = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;

  return (
    <div className="overflow-hidden rounded-xl border border-line bg-surface-card">
      {granted ? <>
        <iframe title="Google Maps: Standort Azzam Salon" src={`https://www.google.com/maps?q=${encodeURIComponent(query)}&output=embed`} className="h-[360px] w-full border-0 lg:h-[460px]" loading="lazy" referrerPolicy="no-referrer" />
        <div className="flex flex-wrap justify-between gap-3 p-4"><TextLink href={route} target="_blank" rel="noopener noreferrer">Route planen</TextLink><button type="button" onClick={revoke} className="min-h-12 text-sm text-ink-muted underline underline-offset-4 hover:text-gold-300 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300">Einwilligung widerrufen</button></div>
      </> : <>
        <div className="relative h-48 lg:h-64"><Image src="/images/map-preview.jpg" alt="Statische Standortvorschau" fill sizes="(min-width: 1024px) 58vw, 100vw" className="object-cover" /></div>
        <div className="flex flex-col items-start gap-4 p-6">
          <h3 className="text-lg font-semibold">So findest du uns</h3>
          <p className="max-w-[44ch] text-sm leading-6 text-ink-muted">Beim Laden der Karte werden Daten an Google übertragen. Wir laden sie erst nach deiner Zustimmung. <Link href="/datenschutz" className="text-gold-300 underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-gold-300">Datenschutz</Link></p>
          <Button variant="secondary" onClick={grant}>Google Maps laden</Button>
          <TextLink href={route} target="_blank" rel="noopener noreferrer">Route in neuem Tab planen</TextLink>
        </div>
      </>}
    </div>
  );
}
