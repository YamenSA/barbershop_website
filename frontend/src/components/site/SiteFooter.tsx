"use client";

import Image from "next/image";
import Link from "next/link";
import { useId, useRef } from "react";
import { useConsent } from "@/lib/consent";
import type { PublicSalonHoursRead, SalonProfile } from "@/lib/types";

type SiteFooterProps = {
  profile?: SalonProfile | null;
  hours?: PublicSalonHoursRead[];
  contactLinks?: { label: string; href: string }[];
  description?: string;
  copyrightYear: number;
};

const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300";
const linkStyle = `inline-flex min-h-12 items-center text-ink-muted hover:text-gold-300 ${focus}`;

export default function SiteFooter({ profile, hours = [], contactLinks = [], description, copyrightYear }: SiteFooterProps) {
  const settingsRef = useRef<HTMLDialogElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const { granted, revoke } = useConsent("maps");

  function revokeMaps() {
    revoke();
    // All mounted map gates must read the revoked consent before embedding again.
    window.location.reload();
  }

  return (
    <footer className="border-t border-line bg-surface-pitch px-4 pb-8 pt-12 font-text text-sm leading-[22px] text-ink-muted md:px-8 md:pb-10 md:pt-[72px]">
      <div className="mx-auto grid max-w-[1200px] grid-cols-2 gap-x-6 gap-y-10 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
        <div className="col-span-2 flex flex-col items-start gap-4 lg:col-span-1">
          <Link href="/" aria-label="Azzam Salon Startseite" className={focus}>
            <Image src="/brand/logo-256.png" alt="" width={120} height={120} />
          </Link>
          {description && <p className="max-w-[32ch]">{description}</p>}
        </div>
        {profile && (
          <section className="min-w-0">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-gold-500">Salon</h2>
            <address className="not-italic">
              <p>{profile.street}<br />{profile.postal_code} {profile.city}</p>
              {profile.phone && <a href={`tel:${profile.phone.replace(/\s/g, "")}`} className={`${linkStyle} break-all tabular-nums`}>{profile.phone}</a>}
              {profile.email && <a href={`mailto:${profile.email}`} className={`${linkStyle} break-all`}>{profile.email}</a>}
            </address>
          </section>
        )}
        {hours.length > 0 && (
          <section className="min-w-0">
            <h2 className="mb-3 text-xs font-semibold uppercase tracking-[.12em] text-gold-500">Öffnungszeiten</h2>
            <ul className="space-y-2">
              {[...hours].sort((a, b) => a.day_of_week - b.day_of_week).map((day) => (
                <li key={day.day_of_week} className="flex flex-wrap justify-between gap-x-4">
                  <span>{days[day.day_of_week]}</span>
                  <span className="tabular-nums text-ink">{day.is_open ? `${day.open_time?.slice(0, 5) ?? ""} – ${day.close_time?.slice(0, 5) ?? ""}` : "geschlossen"}</span>
                </li>
              ))}
            </ul>
          </section>
        )}
        {contactLinks.length > 0 && (
          <section className="min-w-0">
            <h2 className="mb-2 text-xs font-semibold uppercase tracking-[.12em] text-gold-500">Folgen & Kontakt</h2>
            <ul>
              {contactLinks.map(({ label, href }) => (
                <li key={href}><a href={href} target="_blank" rel="noopener noreferrer" className={linkStyle}>{label}<span aria-hidden="true" className="ml-1">↗</span><span className="sr-only"> (öffnet in neuem Tab)</span></a></li>
              ))}
            </ul>
          </section>
        )}
      </div>
      <div className="mx-auto mt-10 flex max-w-[1200px] flex-wrap items-center justify-between gap-x-6 gap-y-2 border-t border-line pt-5 text-[13px] leading-5">
        <p className="text-ink-subtle">© {copyrightYear} Azzam Salon</p>
        <nav aria-label="Rechtliches" className="flex flex-wrap gap-x-5">
          <Link href="/impressum" className={linkStyle}>Impressum</Link>
          <Link href="/datenschutz" className={linkStyle}>Datenschutz</Link>
          <button ref={settingsButtonRef} type="button" onClick={() => settingsRef.current?.showModal()} className={linkStyle}>Cookie-Einstellungen</button>
        </nav>
      </div>
      <dialog ref={settingsRef} aria-labelledby={titleId} onClose={() => settingsButtonRef.current?.focus()} className="m-auto w-[calc(100%-2rem)] max-w-lg rounded-xl border border-line bg-surface-card p-6 font-text text-ink backdrop:bg-surface-pitch/80">
        <h2 id={titleId} className="font-brand text-3xl">Cookie-Einstellungen</h2>
        <p className="mt-4 text-ink-muted">Google Maps wird erst nach deiner Einwilligung geladen. Diese Entscheidung wird lokal in deinem Browser gespeichert.</p>
        <p role="status" className="mt-4">Google Maps: {granted ? "Einwilligung erteilt" : "Einwilligung nicht erteilt"}</p>
        {granted && <button type="button" onClick={revokeMaps} className={`${linkStyle} mt-2 underline underline-offset-4`}>Einwilligung widerrufen</button>}
        <form method="dialog" className="mt-4"><button className={`${linkStyle} font-bold`}>Schließen</button></form>
      </dialog>
    </footer>
  );
}
