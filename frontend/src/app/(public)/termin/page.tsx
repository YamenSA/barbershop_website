import type { Metadata } from "next";
import BookingPageView from "@/components/site/BookingPageView";
import { getPublicServices, getPublicTeamMembers } from "@/lib/api";
import { getPublicSiteData } from "@/lib/public-site-data";

export const metadata: Metadata = {
  title: "Termin buchen",
  description: "Wähle deine Leistungen, dein Teammitglied und eine freie Uhrzeit im Azzam Salon. Barzahlung vor Ort.",
  robots: { index: false },
};

export default async function TerminPage({ searchParams }: { searchParams: Promise<{ service?: string; team?: string }> }) {
  const query = await searchParams;
  const [data, serviceResult, teamResult] = await Promise.all([
    getPublicSiteData(),
    getPublicServices().then(services => ({ services, failed: false })).catch(() => ({ services: [], failed: true })),
    getPublicTeamMembers().then(team => ({ team, failed: false })).catch(() => ({ team: [], failed: true })),
  ]);
  return <BookingPageView {...data} services={serviceResult.services} team={teamResult.team} initialServiceId={query.service} initialMemberId={query.team} loadFailed={serviceResult.failed || teamResult.failed} embedded />;
}
