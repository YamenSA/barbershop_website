import Image from "next/image";
import Container from "@/components/ui/Container";
import Section from "@/components/ui/Section";
import TextLink from "@/components/ui/TextLink";
import Button from "@/components/ui/Button";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import BottomBar, { BottomBarSpacer } from "./BottomBar";
import { photoTreatment, photoShading } from "./photo-treatment";
import { salonToday } from "@/lib/time";
import { siteConfig } from "@/lib/site-config";
import type { PublicTeamMemberRead, PublicSalonHoursRead, SalonProfile } from "@/lib/types";
import styles from "./AboutPageView.module.css";

type AboutPageViewProps = {
  team: PublicTeamMemberRead[];
  hours: PublicSalonHoursRead[];
  profile: SalonProfile | null;
};

const values = [
  { title: "Zeit", description: "Deine Wünsche stehen am Anfang. Wir nehmen uns Zeit, sie zu verstehen." },
  { title: "Präzision", description: "Saubere Übergänge, klare Linien und ehrliche Beratung." },
  { title: "Beide", description: "Damen und Herren bekommen dieselbe Aufmerksamkeit." },
  { title: "Klarheit", description: "Preise vorab ansehen. Bezahlt wird bar vor Ort." },
];

export default function AboutPageView({ team, hours, profile }: AboutPageViewProps) {
  const phoneHref = profile?.phone ? `tel:${profile.phone.replace(/\s/g, "")}` : undefined;
  const contactLinks = [
    ...(siteConfig.instagramUrl ? [{ label: "Instagram", href: siteConfig.instagramUrl }] : []),
    ...(siteConfig.whatsappNumber ? [{ label: "WhatsApp", href: `https://wa.me/${siteConfig.whatsappNumber}` }] : []),
    ...(siteConfig.writeReviewUrl ? [{ label: "Google-Bewertung schreiben", href: siteConfig.writeReviewUrl }] : []),
  ];

  return (
    <div className={`${styles.page} bg-surface-base font-text text-ink`}>
      <SiteHeader phone={profile?.phone} phoneHref={phoneHref} activePath="/ueber-uns" />
      <main id="main-content">
        <Container className="pt-8 lg:pt-12">
          <div className="mb-8 grid gap-5 lg:mb-10 lg:grid-cols-12 lg:items-end lg:gap-6">
            <div className="lg:col-span-7">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-gold-500">Über uns</p>
              <h1 className="mt-3 font-brand text-[40px] uppercase leading-[44px] text-balance lg:text-[72px] lg:leading-[76px]">Rücken an Rücken.<br />Auf Augenhöhe.</h1>
            </div>
            <p className="max-w-[50ch] text-base leading-7 text-ink-muted lg:col-span-4 lg:col-start-9 lg:text-[17px]">Unser Logo zeigt, wofür wir stehen: ein Salon, in dem Damen und Herren dieselbe Aufmerksamkeit bekommen.{profile?.city ? ` Mitten in ${profile.city}.` : ""} Mit oder ohne Termin.</p>
          </div>
          <div className="relative h-[280px] overflow-hidden rounded-xl sm:h-[360px] lg:h-[clamp(360px,48svh,460px)]">
            <Image src="/brand/home/salon-innenraum.jpeg" alt="Innenraum des Azzam Salons mit Bogenspiegeln, Lichtdecke und Barberplätzen" fill priority sizes="(min-width: 1200px) 1136px, 100vw" className={photoTreatment} />
            <span aria-hidden="true" className="pointer-events-none absolute inset-0" style={photoShading} />
          </div>
          <section aria-labelledby="about-values" className="py-10 lg:py-16">
            <h2 id="about-values" className="sr-only">Wofür wir stehen</h2>
            <ul className="grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4 lg:gap-6">
              {values.map((value) => <li key={value.title} className="border-t border-gold-500 pt-3 lg:pt-4">
                <h3 className="font-brand text-2xl uppercase leading-7 lg:text-[32px] lg:leading-9">{value.title}</h3>
                <p className="mt-2 text-sm leading-[22px] text-ink-muted lg:text-[15px] lg:leading-6">{value.description}</p>
              </li>)}
            </ul>
          </section>
        </Container>
        <Section tone="raise" aria-labelledby="about-team">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-4 lg:mb-10">
            <h2 id="about-team" className="font-brand text-[32px] uppercase leading-9 lg:text-[56px] lg:leading-[60px]">Unser Team</h2>
            <TextLink href="/dienstleistungen">Leistungen & Preise</TextLink>
          </div>
          {team.length > 0 ? <ul aria-label="Teammitglieder" className={`grid gap-8 lg:grid-cols-2 lg:gap-6 ${team.length > 2 ? "xl:grid-cols-4" : "xl:grid-cols-2"}`}>
            {team.map((member) => {
              const monogram = member.name.trim().split(/\s+/).map((part) => part.charAt(0)).slice(0, 2).join("").toUpperCase();
              return <li key={member.id} data-team-id={member.id} className={`grid grid-cols-[104px_1fr] items-start gap-4 sm:grid-cols-[120px_1fr] ${team.length > 2 ? "xl:grid-cols-1 xl:gap-4" : "lg:grid-cols-[160px_1fr]"}`}>
                <div>
                  <div role="img" aria-label={`Porträt-Platzhalter für ${member.name}`} className="flex aspect-[3/4] items-center justify-center rounded-arch border border-gold-700 bg-surface-card font-brand text-5xl text-gold-300 xl:text-6xl"><span aria-hidden="true">{monogram}</span></div>
                  <p className="mt-2 text-xs text-ink-subtle">Porträt folgt</p>
                </div>
                <div className="min-w-0">
                  <h3 className="break-words font-brand text-[28px] uppercase leading-8 lg:text-[32px] lg:leading-9">{member.name}</h3>
                  {member.bio && <p className="mt-2 whitespace-pre-line text-sm leading-6 text-ink-muted">{member.bio}</p>}
                  {member.services.length > 0 ? <>
                    <p className="mt-3 text-sm text-ink-subtle">{member.services.length} {member.services.length === 1 ? "Leistung" : "Leistungen"} online buchbar</p>
                    <TextLink href={`/termin?team=${encodeURIComponent(member.id)}`} className="mt-1 max-w-full text-sm">Bei {member.name} buchen</TextLink>
                  </> : <TextLink href="/kontakt" className="mt-3 text-sm">Termin anfragen</TextLink>}
                </div>
              </li>;
            })}
          </ul> : <div className="rounded-xl border border-line bg-surface-card p-6">
            <p className="text-ink-muted">Unsere Teamübersicht ist gerade nicht verfügbar. Wir helfen dir gern persönlich weiter.</p>
            <TextLink href="/kontakt" className="mt-3">Kontakt aufnehmen</TextLink>
          </div>}
        </Section>
        <Section aria-labelledby="about-booking">
          <div className="flex flex-col items-start gap-5 sm:items-center sm:text-center">
            <h2 id="about-booking" className="font-brand text-[32px] uppercase leading-9 lg:text-5xl">Lern uns persönlich kennen</h2>
            <p className="max-w-[55ch] text-ink-muted">Buche deinen nächsten Termin online oder komm einfach vorbei. Barzahlung vor Ort.</p>
            <Button size="lg" href="/termin">Termin buchen</Button>
          </div>
        </Section>
      </main>
      <SiteFooter profile={profile} hours={hours} copyrightYear={Number(salonToday().slice(0, 4))} description={`Friseur für Damen und Herren${profile?.city ? ` in ${profile.city}` : ""}.`} contactLinks={contactLinks} />
      <BottomBarSpacer />
      <BottomBar />
    </div>
  );
}
