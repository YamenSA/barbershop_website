import type { Metadata } from "next";
import HomePageView from "@/components/site/HomePageView";
import { getPublicServices, getPublicTeamMembers } from "@/lib/api";
import { getPublicSiteData } from "@/lib/public-site-data";

export const metadata: Metadata = {
  title: { absolute: "Azzam Salon | Friseur für Damen und Herren in Cottbus" },
  description: "Schnitt, Farbe, Bart und Styling in Cottbus. Damen und Herren sind mit oder ohne Termin willkommen. Online buchen, Zahlung vor Ort.",
};
export const dynamic = "force-dynamic";

export default async function HomePage() {
  const [data, services, team] = await Promise.all([
    getPublicSiteData(),
    getPublicServices().catch(() => []),
    getPublicTeamMembers().catch(() => []),
  ]);
  return <HomePageView {...data} services={services} team={team} />;
}
