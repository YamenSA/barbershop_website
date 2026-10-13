import Container from "@/components/ui/Container";
import Card from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import TextLink from "@/components/ui/TextLink";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import BottomBar, { BottomBarSpacer } from "./BottomBar";
import FaqAccordion from "./FaqAccordion";
import { faqs } from "@/content/faq";
import { salonToday } from "@/lib/time";
import { siteConfig } from "@/lib/site-config";
import type { SalonProfile, PublicSalonHoursRead } from "@/lib/types";
import styles from "./FaqPageView.module.css";

export default function FaqPageView({ profile, hours }: { profile: SalonProfile | null; hours: PublicSalonHoursRead[] }) {
  const phoneHref = profile?.phone ? `tel:${profile.phone.replace(/\s/g, "")}` : undefined;
  const contactLinks = [
    ...(siteConfig.instagramUrl ? [{ label: "Instagram", href: siteConfig.instagramUrl }] : []),
    ...(siteConfig.whatsappNumber ? [{ label: "WhatsApp", href: `https://wa.me/${siteConfig.whatsappNumber}` }] : []),
    ...(siteConfig.writeReviewUrl ? [{ label: "Google-Bewertung schreiben", href: siteConfig.writeReviewUrl }] : []),
  ];

  return (
    <div className={`${styles.page} bg-surface-base font-text text-ink`}>
      <SiteHeader phone={profile?.phone} phoneHref={phoneHref} activePath="/faq" />
      <main id="main-content">
        <Container className="pb-12 pt-8 lg:pb-24 lg:pt-12">
          <div className="grid gap-8 lg:grid-cols-12 lg:gap-6">
            <div className="lg:col-span-4">
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-gold-500">FAQ</p>
              <h1 className="mt-3 font-brand text-[40px] uppercase leading-[44px] text-balance lg:text-[72px] lg:leading-[76px]">Häufige Fragen</h1>
              <p className="mt-4 max-w-[50ch] leading-7 text-ink-muted">Antworten rund um deinen Besuch, die Buchung und unsere Leistungen.</p>
              <Card className="mt-6 hidden lg:block">
                <h2 className="font-brand text-[26px] uppercase leading-[30px]">Noch Fragen?</h2>
                <p className="mt-3 text-sm leading-6 text-ink-muted">Wir helfen dir gern persönlich weiter.</p>
                {phoneHref ? <TextLink href={phoneHref} className="mt-2 tabular-nums">{profile?.phone}</TextLink> : <TextLink href="/kontakt" className="mt-2">Kontakt aufnehmen</TextLink>}
                <Button href="/termin" className="mt-3 w-full">Termin buchen</Button>
              </Card>
            </div>
            <div className="lg:col-span-7 lg:col-start-6"><FaqAccordion items={faqs} /></div>
            <Card className="lg:hidden">
              <h2 className="font-brand text-[26px] uppercase leading-[30px]">Noch Fragen?</h2>
              <p className="mt-3 text-sm leading-6 text-ink-muted">Wir helfen dir gern persönlich weiter.</p>
              {phoneHref ? <TextLink href={phoneHref} className="mt-2 tabular-nums">{profile?.phone}</TextLink> : <TextLink href="/kontakt" className="mt-2">Kontakt aufnehmen</TextLink>}
              <Button href="/termin" className="mt-3 w-full">Termin buchen</Button>
            </Card>
          </div>
        </Container>
      </main>
      <SiteFooter profile={profile} hours={hours} copyrightYear={Number(salonToday().slice(0, 4))} description={`Friseur für Damen und Herren${profile?.city ? ` in ${profile.city}` : ""}.`} contactLinks={contactLinks} />
      <BottomBarSpacer />
      <BottomBar />
    </div>
  );
}
