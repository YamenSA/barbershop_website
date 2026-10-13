import type { ReactNode } from "react";
import SiteHeader from "./SiteHeader";
import SiteFooter from "./SiteFooter";
import BottomBar, { BottomBarSpacer } from "./BottomBar";
import { salonToday } from "@/lib/time";
import { siteConfig } from "@/lib/site-config";
import type { SalonProfile, PublicSalonHoursRead } from "@/lib/types";
import styles from "./InfoPageShell.module.css";

export type InfoPageData = { profile: SalonProfile | null; hours: PublicSalonHoursRead[] };

export default function InfoPageShell({ profile, hours, children, activePath }: InfoPageData & { children: ReactNode; activePath?: string }) {
  const phoneHref = profile?.phone ? `tel:${profile.phone.replace(/\s/g, "")}` : undefined;
  const contactLinks = [
    ...(siteConfig.instagramUrl ? [{ label: "Instagram", href: siteConfig.instagramUrl }] : []),
    ...(siteConfig.whatsappNumber ? [{ label: "WhatsApp", href: `https://wa.me/${siteConfig.whatsappNumber}` }] : []),
    ...(siteConfig.writeReviewUrl ? [{ label: "Google-Bewertung schreiben", href: siteConfig.writeReviewUrl }] : []),
  ];
  return (
    <div className={`${styles.page} min-h-svh bg-surface-base font-text text-ink`}>
      <SiteHeader phone={profile?.phone} phoneHref={phoneHref} activePath={activePath} />
      <main id="main-content">{children}</main>
      <SiteFooter profile={profile} hours={hours} copyrightYear={Number(salonToday().slice(0, 4))} description={`Friseur für Damen und Herren${profile?.city ? ` in ${profile.city}` : ""}.`} contactLinks={contactLinks} />
      <BottomBarSpacer activePath={activePath} />
      <BottomBar activePath={activePath} />
    </div>
  );
}
