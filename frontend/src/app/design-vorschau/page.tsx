import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HomePageView from "@/components/site/HomePageView";
import ServicesPageView from "@/components/site/ServicesPageView";
import AboutPageView from "@/components/site/AboutPageView";
import ContactPageView from "@/components/site/ContactPageView";
import FaqPageView from "@/components/site/FaqPageView";
import LegalPageView from "@/components/site/LegalPageView";
import NotFoundPageView from "@/components/site/NotFoundPageView";
import BookingPageView from "@/components/site/BookingPageView";
import { getPublicServices, getPublicTeamMembers, getPublicSalonProfile, getPublicSalonHours } from "@/lib/api";

export const metadata: Metadata = {
  title: "Design-Vorschau",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function DesignVorschauPage({ searchParams }: { searchParams: Promise<{ seite?: string; service?: string; team?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { seite, service: initialServiceId, team: initialMemberId } = await searchParams;

  if (seite === "buchung") {
    const [services, team, profile, hours] = await Promise.all([
      getPublicServices().catch(() => []),
      getPublicTeamMembers().catch(() => []),
      getPublicSalonProfile().catch(() => null),
      getPublicSalonHours().catch(() => []),
    ]);
    return <BookingPageView services={services} team={team} profile={profile} hours={hours} initialServiceId={initialServiceId} initialMemberId={initialMemberId} preview />;
  }

  if (seite === "impressum" || seite === "datenschutz" || seite === "404") {
    const [profile, hours] = await Promise.all([
      getPublicSalonProfile().catch(() => null),
      getPublicSalonHours().catch(() => []),
    ]);
    return seite === "404" ? <NotFoundPageView profile={profile} hours={hours} /> : <LegalPageView kind={seite} profile={profile} hours={hours} />;
  }

  if (seite === "faq") {
    const [profile, hours] = await Promise.all([
      getPublicSalonProfile().catch(() => null),
      getPublicSalonHours().catch(() => []),
    ]);
    return <FaqPageView profile={profile} hours={hours} />;
  }

  if (seite === "kontakt") {
    const [profile, hours] = await Promise.all([
      getPublicSalonProfile().catch(() => null),
      getPublicSalonHours().catch(() => []),
    ]);
    return <ContactPageView profile={profile} hours={hours} />;
  }

  if (seite === "team") {
    const [team, profile, hours] = await Promise.all([
      getPublicTeamMembers().catch(() => []),
      getPublicSalonProfile().catch(() => null),
      getPublicSalonHours().catch(() => []),
    ]);
    return <AboutPageView team={team} profile={profile} hours={hours} />;
  }

  if (seite === "preise") {
    const [serviceResult, profile, hours] = await Promise.all([
      getPublicServices().then((services) => ({ services, failed: false })).catch(() => ({ services: [], failed: true })),
      getPublicSalonProfile().catch(() => null),
      getPublicSalonHours().catch(() => []),
    ]);
    return <ServicesPageView services={serviceResult.services} profile={profile} hours={hours} loadFailed={serviceResult.failed} retryHref="/design-vorschau?seite=preise" />;
  }

  const [services, team, profile, hours] = await Promise.all([
    getPublicServices().catch(() => []),
    getPublicTeamMembers().catch(() => []),
    getPublicSalonProfile().catch(() => null),
    getPublicSalonHours().catch(() => []),
  ]);

  return <HomePageView services={services} team={team} profile={profile} hours={hours} />;
}
