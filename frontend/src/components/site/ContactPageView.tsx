import SitePageFrame from "./SitePageFrame";
import type { ReactNode } from "react";
import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import HomeLocationMap from "./HomeLocationMap";
import { salonToday, weekdayMonday0 } from "@/lib/time";
import { siteConfig } from "@/lib/site-config";
import type { SalonProfile, PublicSalonHoursRead } from "@/lib/types";
import styles from "./ContactPageView.module.css";

type ContactPageViewProps = {
  profile: SalonProfile | null;
  embedded?: boolean;
  hours: PublicSalonHoursRead[];
};

function ContactTile({ kind, label, href, external = false, children }: {
  kind: string;
  label: string;
  href: string;
  external?: boolean;
  children: ReactNode;
}) {
  return (
    <a data-contact={kind} href={href} target={external ? "_blank" : undefined} rel={external ? "noopener noreferrer" : undefined} className="flex min-h-[72px] items-center justify-between gap-4 rounded-xl border border-line bg-surface-card px-4 py-3.5 hover:bg-surface-hover lg:px-5">
      <span className="min-w-0">
        <span className="block text-[13px] leading-5 text-ink-subtle">{label}</span>
        <span className="mt-0.5 block break-words text-base font-semibold leading-6 lg:text-[17px]">{children}</span>
      </span>
      <span aria-hidden="true" className="shrink-0 text-xl text-gold-300">{external ? "↗" : "→"}</span>
      {external && <span className="sr-only"> (öffnet in neuem Tab)</span>}
    </a>
  );
}

const days = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];

export default function ContactPageView({ profile, hours, embedded = false }: ContactPageViewProps) {
  const today = weekdayMonday0(salonToday());
  const phoneHref = profile?.phone ? `tel:${profile.phone.replace(/\s/g, "")}` : undefined;
  const address = profile ? `${profile.street}, ${profile.postal_code} ${profile.city}` : null;
  const routeHref = address ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}` : null;
  const whatsappHref = siteConfig.whatsappNumber ? `https://wa.me/${siteConfig.whatsappNumber}` : null;

  return (
    <SitePageFrame profile={profile} hours={hours} embedded={embedded} activePath="/kontakt" className={`${styles.page} bg-surface-base font-text text-ink`}>
        <Container className="pb-12 pt-8 lg:pb-24 lg:pt-12">
          <p className="text-xs font-semibold uppercase tracking-[.14em] text-gold-500">Kontakt & Anfahrt</p>
          <h1 className="mt-3 max-w-[14ch] font-brand text-[40px] uppercase leading-[44px] text-balance lg:text-[72px] lg:leading-[76px]">So findest du uns</h1>
          <p className="mt-4 max-w-[60ch] leading-7 text-ink-muted">Ruf uns an, schreib uns oder komm im Salon vorbei. Mit oder ohne Termin.</p>
          <div className="mt-8 grid gap-8 lg:mt-10 lg:grid-cols-12 lg:gap-x-6 lg:gap-y-10">
            <section aria-labelledby="contact-details" className="lg:col-span-5">
              <h2 id="contact-details" className="sr-only">Kontaktmöglichkeiten</h2>
              <div className="space-y-2">
                {phoneHref && <ContactTile kind="phone" label="Telefon" href={phoneHref}><span className="tabular-nums">{profile?.phone}</span></ContactTile>}
                {whatsappHref && <ContactTile kind="whatsapp" label="WhatsApp" href={whatsappHref} external>Nachricht schreiben</ContactTile>}
                {routeHref && profile && <ContactTile kind="address" label="Adresse" href={routeHref} external>{profile.street}<br />{profile.postal_code} {profile.city}</ContactTile>}
                {profile?.email && <ContactTile kind="email" label="E-Mail" href={`mailto:${profile.email}`}>{profile.email}</ContactTile>}
                {!profile && <p role="status" className="rounded-xl border border-line bg-surface-card p-4 text-ink-muted">Die Kontaktdaten sind gerade nicht verfügbar. Bitte lade die Seite später erneut.</p>}
              </div>
              <Button href="/termin" className="mt-5">Termin buchen</Button>
            </section>
            <section aria-labelledby="contact-map" className="lg:col-span-6 lg:col-start-7 lg:row-span-2 lg:row-start-1">
              <h2 id="contact-map" className="mb-4 font-brand text-[28px] uppercase leading-8">Anfahrt</h2>
              <HomeLocationMap profile={profile} title="Interaktive Karte" />
            </section>
            <section aria-labelledby="contact-hours" className="lg:col-span-5 lg:row-start-2">
              <h2 id="contact-hours" className="mb-4 font-brand text-[28px] uppercase leading-8">Öffnungszeiten</h2>
              {hours.length > 0 ? <dl>
                {[...hours].sort((a, b) => a.day_of_week - b.day_of_week).map((day) => <div key={day.day_of_week} data-hours-day={day.day_of_week} className={`flex flex-wrap justify-between gap-x-4 border-b border-line py-2.5 text-[15px] leading-[22px] ${day.day_of_week === today ? "font-semibold text-gold-300" : "text-ink-muted"}`}>
                  <dt>{days[day.day_of_week]}{day.day_of_week === today ? " · heute" : ""}</dt>
                  <dd className="tabular-nums">{!day.is_open ? "geschlossen" : day.open_time && day.close_time ? `${day.open_time.slice(0,5)} – ${day.close_time.slice(0,5)}` : "Zeiten bitte erfragen"}</dd>
                </div>)}
              </dl> : <p role="status" className="text-ink-muted">Öffnungszeiten sind gerade nicht verfügbar. Bitte kontaktiere uns.</p>}
              <p className="mt-5 text-sm text-ink-muted">Zahlung vor Ort.</p>
            </section>
          </div>
        </Container>
    </SitePageFrame>
  );
}
