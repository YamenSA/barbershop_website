import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HomePageView from "@/components/site/HomePageView";
import ServicesPageView from "@/components/site/ServicesPageView";
import AboutPageView from "@/components/site/AboutPageView";
import { getPublicServices, getPublicTeamMembers, getPublicSalonProfile, getPublicSalonHours } from "@/lib/api";

export const metadata: Metadata = {
  title: "Design-Vorschau",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function DesignVorschauPage({ searchParams }: { searchParams: Promise<{ seite?: string }> }) {
  if (process.env.NODE_ENV === "production") notFound();
  const { seite } = await searchParams;

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
