import SitePageFrame from "./SitePageFrame";
import Image from "next/image";
import Link from "next/link";
import Container from "@/components/ui/Container";
import Section from "@/components/ui/Section";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import TextLink from "@/components/ui/TextLink";
import HomeLocationMap from "./HomeLocationMap";
import { photoTreatment, photoShading } from "./photo-treatment";
import type { PublicServiceRead, PublicTeamMemberRead, PublicSalonHoursRead, SalonProfile, Review } from "@/lib/types";
import { salonToday, weekdayMonday0 } from "@/lib/time";
import { siteConfig } from "@/lib/site-config";

export type HomePageViewProps = {
  services: PublicServiceRead[];
  team: PublicTeamMemberRead[];
  hours: PublicSalonHoursRead[];
  profile: SalonProfile | null;
  embedded?: boolean;
  reviews?: Review[];
};

const heading = "font-brand text-[32px] font-medium uppercase leading-9 text-balance lg:text-[56px] lg:leading-[60px]";
const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300";
const dayNames = ["Montag", "Dienstag", "Mittwoch", "Donnerstag", "Freitag", "Samstag", "Sonntag"];
const price = (cents: number) => new Intl.NumberFormat("de-DE", { style: "currency", currency: "EUR" }).format(cents / 100);

export default function HomePageView({ services, team, hours, profile, reviews = [], embedded = false }: HomePageViewProps) {
  const today = weekdayMonday0(salonToday());
  const phoneHref = profile?.phone ? `tel:${profile.phone.replace(/\s/g, "")}` : undefined;

  return (
    <SitePageFrame profile={profile} hours={hours} embedded={embedded} activePath="/" className="bg-surface-base font-text text-ink">
        <Container className="pb-10 pt-4 lg:pb-10 lg:pt-8">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
            <div className="relative h-[clamp(220px,42svh,340px)] overflow-hidden rounded-arch border border-gold-700 lg:order-2 lg:col-span-5 lg:col-start-8 lg:aspect-[3/4] lg:h-auto lg:w-[min(100%,43.5svh,360px)] lg:justify-self-center">
              <Image src="/brand/home/hero-salon.jpeg" alt="Salon mit goldgerahmten Bogenspiegeln, Barberstühlen und Lichtdecke" fill priority sizes="(min-width: 1024px) 360px, (min-width: 768px) 736px, 100vw" className={photoTreatment} />
              <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={photoShading} />
            </div>
            <div className="min-w-0 lg:col-span-6 lg:row-start-1">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-gold-500">Friseur · Damen & Herren{profile?.city ? ` · ${profile.city}` : ""}</p>
              <h1 className="mt-4 font-brand text-[48px] font-medium uppercase leading-[48px] text-balance lg:text-[clamp(64px,6vw,88px)] lg:leading-[.98]">Dein Schnitt.<br />Deine Zeit.</h1>
              <p className="mt-4 max-w-[44ch] text-[17px] leading-[27px] text-ink-muted lg:text-lg lg:leading-7">Schneiden, Färben, Bart und Styling. Für Damen und Herren, mit oder ohne Termin.</p>
              <div className="mt-6 flex flex-col gap-3 sm:flex-row">
                <Button size="lg" href="/termin">Termin buchen</Button>
                <Button size="lg" variant="secondary" href="/dienstleistungen">Preise ansehen</Button>
              </div>
              <p className="mt-4 text-sm text-ink-muted">Zahlung vor Ort.</p>
            </div>
          </div>
        </Container>

        <Section tone="raise" aria-labelledby="home-services">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-3 lg:mb-10">
            <h2 id="home-services" className={heading}>Leistungen</h2>
            <TextLink href="/dienstleistungen">Alle Leistungen</TextLink>
          </div>
          <div className="grid gap-4 lg:grid-cols-2 lg:gap-6">
            {(["DAMEN", "HERREN"] as const).map((group) => {
              const matching = services.filter((service) => service.target_group === group);
              const minimum = matching.length ? Math.min(...matching.map((service) => service.price_cents)) : null;
              return (
                <Link key={group} href="/dienstleistungen" className={`group flex items-center gap-4 rounded-xl border border-line bg-surface-card p-4 hover:bg-surface-hover lg:gap-6 lg:p-6 ${focus}`}>
                  <div className="relative h-[120px] w-24 shrink-0 overflow-hidden rounded-arch border border-gold-700 lg:h-[220px] lg:w-36">
                    <Image src={group === "DAMEN" ? "/brand/home/leistungen-damen.jpeg" : "/brand/home/leistungen-herren.jpeg"} alt={group === "DAMEN" ? "Stylingplätze mit beleuchteten Spiegeln im Damenbereich" : "Barber bei der Arbeit im Herrenbereich des Salons"} fill sizes="(min-width: 1024px) 144px, 96px" className={`${photoTreatment} motion-safe:transition-transform motion-safe:duration-200 motion-safe:ease-out motion-safe:group-hover:scale-[1.025] motion-safe:group-focus-visible:scale-[1.025]`} />
                    <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={photoShading} />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-brand text-[28px] font-medium uppercase leading-none lg:text-5xl">{group === "DAMEN" ? "Damen" : "Herren"}</h3>
                    <p className="mt-3 text-sm leading-6 text-ink-muted">{group === "DAMEN" ? "Schnitt, Farbe & Styling" : "Schnitt, Bart & Styling"}</p>
                    <p className="mt-3 text-sm font-semibold text-gold-300">{minimum !== null ? `${matching.length} Leistungen · ab ${price(minimum)}` : "Leistungen & Preise ansehen"}<span aria-hidden="true"> →</span></p>
                  </div>
                </Link>
              );
            })}
          </div>
        </Section>

        <Section aria-labelledby="home-prices">
          <div className="grid gap-6 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-4">
              <h2 id="home-prices" className={heading}>Preise auf einen Blick</h2>
              <p className="mt-4 text-ink-muted">Preise vorab ansehen. Bezahlt wird vor Ort.</p>
              <TextLink href="/dienstleistungen" className="mt-4">Alle Preise</TextLink>
            </div>
            <div className="lg:col-span-7 lg:col-start-6">
              {services.length ? (
                <ul className="border-t border-line">
                  {services.slice(0, 5).map((service) => (
                    <li key={service.id} className="flex items-start justify-between gap-4 border-b border-line py-4 lg:py-5">
                      <div className="min-w-0"><h3 className="font-semibold">{service.name}</h3><p className="mt-1 text-sm text-ink-subtle">{service.target_group === "DAMEN" ? "Damen" : service.target_group === "HERREN" ? "Herren" : "Kinder"} · {service.duration_minutes} Min.</p></div>
                      <span className="shrink-0 font-semibold tabular-nums">{service.price_is_from ? "ab " : ""}{price(service.price_cents)}</span>
                    </li>
                  ))}
                </ul>
              ) : <p className="text-ink-muted">Preise sind gerade nicht verfügbar. Bitte kontaktiere uns oder versuche es später erneut.</p>}
              <p className="mt-4 rounded-lg border border-line bg-surface-raise p-4 text-sm text-ink-muted">Zahlung vor Ort. Bei „ab“-Preisen richtet sich der Endpreis nach dem Aufwand.</p>
            </div>
          </div>
        </Section>

        <Section tone="raise" aria-labelledby="home-about">
          <div className="grid gap-6 lg:grid-cols-12 lg:items-center">
            <div className="relative aspect-[4/3] overflow-hidden rounded-xl lg:col-span-6">
              <Image src="/brand/home/salon-innenraum.jpeg" alt="Innenraum des Azzam Salons mit Sitzplätzen, Marmorboden und Lichtdecke" fill sizes="(min-width: 1200px) 556px, (min-width: 1024px) 50vw, 100vw" className={photoTreatment} />
              <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={photoShading} />
            </div>
            <div className="lg:col-span-5 lg:col-start-8">
              <h2 id="home-about" className={heading}>Ein Salon für beide</h2>
              <p className="mt-5 text-base leading-7 text-ink-muted lg:text-[17px]">Damen und Herren bekommen bei uns dieselbe Aufmerksamkeit. Mit oder ohne Termin: Wir freuen uns auf deinen Besuch.</p>
              {team.length > 0 && <ul aria-label="Unser Team" className="mt-6 grid grid-cols-2 gap-4">
                {team.slice(0, 4).map((member) => <li key={member.id}>
                  <div aria-hidden="true" className="flex aspect-[3/4] max-h-36 items-center justify-center rounded-arch border border-gold-700 bg-surface-card font-brand text-5xl text-gold-300">{member.name.trim().charAt(0).toUpperCase()}</div>
                  <p className="mt-2 font-brand text-xl uppercase">{member.name}</p>
                  <p className="text-xs text-ink-subtle">Porträt folgt</p>
                </li>)}
              </ul>}
              <TextLink href="/ueber-uns" className="mt-4">Team kennenlernen</TextLink>
            </div>
          </div>
        </Section>

        {reviews.length > 0 && <Section aria-labelledby="home-reviews">
          <h2 id="home-reviews" className={heading}>Das sagen Kund:innen</h2>
          <ul className="mt-6 flex snap-x snap-mandatory gap-4 overflow-x-auto pb-4 lg:grid lg:grid-cols-3 lg:overflow-visible">
            {reviews.slice(0, 3).map((review) => <li key={review.id} className="w-[min(300px,85vw)] shrink-0 snap-start lg:w-auto"><Card className="h-full"><blockquote className="leading-7">„{review.text}“</blockquote><p className="mt-4 text-sm text-ink-muted">{review.author}</p></Card></li>)}
          </ul>
          <TextLink href={siteConfig.googleProfileUrl} target="_blank" rel="noopener noreferrer">Kundenstimmen auf Google ansehen</TextLink>
        </Section>}

        <Section tone="raise" aria-labelledby="home-location">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-12">
            <div className="lg:col-span-4">
              <h2 id="home-location" className={heading}>Anfahrt & Zeiten</h2>
              {profile && <address className="mt-5 not-italic"><p className="font-semibold">{profile.street}</p><p className="text-ink-muted">{profile.postal_code} {profile.city}</p></address>}
              {hours.length > 0 ? <ul className="mt-6">
                {[...hours].sort((a,b) => a.day_of_week-b.day_of_week).map((day) => <li key={day.day_of_week} className={`flex flex-wrap justify-between gap-x-3 border-b border-line py-2.5 text-sm ${day.day_of_week === today ? "font-semibold text-gold-300" : "text-ink-muted"}`}>
                  <span>{dayNames[day.day_of_week]}{day.day_of_week === today ? " · heute" : ""}</span>
                  <span className="tabular-nums">{day.is_open ? `${day.open_time?.slice(0,5)} – ${day.close_time?.slice(0,5)}` : "geschlossen"}</span>
                </li>)}
              </ul> : <p className="mt-5 text-ink-muted">Öffnungszeiten sind gerade nicht verfügbar.</p>}
              {phoneHref && <TextLink href={phoneHref} className="mt-4">Anrufen</TextLink>}
            </div>
            <div className="lg:col-span-7 lg:col-start-6"><HomeLocationMap profile={profile} /></div>
          </div>
        </Section>
        <Section aria-labelledby="home-booking">
          <div className="flex flex-col items-start gap-5 sm:items-center sm:text-center">
            <h2 id="home-booking" className={heading}>Dein nächster Schnitt?</h2>
            <p className="text-ink-muted">Buche deinen Termin online oder komm einfach vorbei. Zahlung vor Ort.</p>
            <Button size="lg" href="/termin">Termin buchen</Button>
          </div>
        </Section>
    </SitePageFrame>
  );
}
