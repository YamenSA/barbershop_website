import type { Metadata } from "next";
import AboutPageView from "@/components/site/AboutPageView";
import { getPublicSiteData } from "@/lib/public-site-data";
import { getPublicTeamMembers } from "@/lib/api";

export const metadata: Metadata = {
  title: "Über uns & Team",
  description: "Lerne das Team des Azzam Salon in Cottbus kennen. Friseur für Damen und Herren, mit oder ohne Termin.",
};

export default async function Page() {
  const [data, team] = await Promise.all([getPublicSiteData(), getPublicTeamMembers().catch(() => [])]);
  return <AboutPageView {...data} embedded team={team} />;
}
