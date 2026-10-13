import type { Metadata } from "next";
import ServicesPageView from "@/components/site/ServicesPageView";
import { getPublicSiteData } from "@/lib/public-site-data";
import { getPublicServices } from "@/lib/api";

export const metadata: Metadata = {
  title: "Leistungen & Preise",
  description: "Alle Leistungen mit Preisen und Dauer für Damen, Herren und Kinder. Barzahlung vor Ort.",
};

export default async function Page() {
  const [data, result] = await Promise.all([getPublicSiteData(), getPublicServices().then(services => ({ services, failed: false })).catch(() => ({ services: [], failed: true }))]);
  return <ServicesPageView {...data} embedded services={result.services} loadFailed={result.failed} />;
}
