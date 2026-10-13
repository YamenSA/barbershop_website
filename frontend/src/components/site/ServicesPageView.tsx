import Container from "@/components/ui/Container";
import Button from "@/components/ui/Button";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import BottomBar, { BottomBarSpacer } from "./BottomBar";
import ServicePriceBoard from "./ServicePriceBoard";
import type { PublicServiceRead, PublicSalonHoursRead, SalonProfile } from "@/lib/types";
import { salonToday } from "@/lib/time";
import { siteConfig } from "@/lib/site-config";
import styles from "./ServicesPageView.module.css";

type ServicesPageViewProps = {
  services: PublicServiceRead[];
  hours: PublicSalonHoursRead[];
  profile: SalonProfile | null;
  loadFailed?: boolean;
  retryHref?: string;
};

export default function ServicesPageView({ services, hours, profile, loadFailed = false, retryHref = "/dienstleistungen" }: ServicesPageViewProps) {
  const phoneHref = profile?.phone ? `tel:${profile.phone.replace(/\s/g, "")}` : undefined;
  const contactLinks = [
    ...(siteConfig.instagramUrl ? [{ label: "Instagram", href: siteConfig.instagramUrl }] : []),
    ...(siteConfig.whatsappNumber ? [{ label: "WhatsApp", href: `https://wa.me/${siteConfig.whatsappNumber}` }] : []),
    ...(siteConfig.writeReviewUrl ? [{ label: "Google-Bewertung schreiben", href: siteConfig.writeReviewUrl }] : []),
  ];

  return (
    <div className={`${styles.page} bg-surface-base font-text text-ink`}>
      <SiteHeader phone={profile?.phone} phoneHref={phoneHref} activePath="/dienstleistungen" />
      <main id="main-content">
        <Container className="pb-12 pt-8 lg:pb-24 lg:pt-12">
          <div className="mb-6 flex flex-wrap items-end justify-between gap-5 lg:mb-10">
            <div>
              <p className="text-xs font-semibold uppercase tracking-[.14em] text-gold-500">Leistungen & Preise</p>
              <h1 className="mt-3 font-brand text-[40px] uppercase leading-[44px] text-balance lg:text-[72px] lg:leading-[76px]">
                <span className="lg:hidden">Für wen ist der Termin?</span>
                <span className="hidden lg:inline">Klar. Fair. Vorab.</span>
              </h1>
            </div>
            <p className="flex items-center gap-3 rounded-lg border border-line bg-surface-raise px-4 py-3 text-sm font-semibold"><span aria-hidden="true" className="text-lg text-gold-300">€</span>Nur Barzahlung vor Ort</p>
          </div>
          {loadFailed ? <div role="status" className="rounded-xl border border-line bg-surface-card p-6">
            <h2 className="font-brand text-3xl">Preise gerade nicht verfügbar</h2>
            <p className="mt-3 max-w-[60ch] text-ink-muted">Die Preisliste konnte nicht geladen werden. Bitte lade die Seite erneut oder kontaktiere uns.</p>
            <div className="mt-5 flex flex-wrap gap-3"><a href={retryHref} className="inline-flex h-12 items-center justify-center rounded-lg border border-gold-500 px-6 font-bold text-gold-300 hover:bg-surface-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300">Erneut laden</a>{phoneHref && <Button href={phoneHref} variant="secondary">Anrufen</Button>}</div>
          </div> : <ServicePriceBoard services={services} />}
        </Container>
      </main>
      <SiteFooter profile={profile} hours={hours} copyrightYear={Number(salonToday().slice(0,4))} description={`Friseur für Damen und Herren${profile?.city ? ` in ${profile.city}` : ""}.`} contactLinks={contactLinks} />
      <BottomBarSpacer />
      <BottomBar activePath="/dienstleistungen" />
    </div>
  );
}
