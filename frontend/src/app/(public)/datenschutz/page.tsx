import type { Metadata } from "next";
import LegalPageView from "@/components/site/LegalPageView";
import { getPublicSiteData } from "@/lib/public-site-data";

export const metadata: Metadata = {
  title: "Datenschutzerklärung",
  description: "Informationen zur Verarbeitung personenbezogener Daten auf dieser Website.",
  robots: { index: false },
};

export default async function Page() {
  const data = await getPublicSiteData();
  return <LegalPageView {...data} embedded kind="datenschutz" />;
}
