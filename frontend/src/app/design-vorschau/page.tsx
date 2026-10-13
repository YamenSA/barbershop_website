import type { Metadata } from "next";
import { notFound } from "next/navigation";
import HomePageView from "@/components/site/HomePageView";
import { getPublicServices, getPublicTeamMembers, getPublicSalonProfile, getPublicSalonHours } from "@/lib/api";

export const metadata: Metadata = {
  title: "Startseite · Design-Vorschau",
  robots: { index: false },
};

export const dynamic = "force-dynamic";

export default async function DesignVorschauPage() {
  if (process.env.NODE_ENV === "production") notFound();

  const [services, team, profile, hours] = await Promise.all([
    getPublicServices().catch(() => []),
    getPublicTeamMembers().catch(() => []),
    getPublicSalonProfile().catch(() => null),
    getPublicSalonHours().catch(() => []),
  ]);

  return <HomePageView services={services} team={team} profile={profile} hours={hours} />;
}
