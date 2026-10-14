import type { Metadata } from "next";
import ContactPageView from "@/components/site/ContactPageView";
import { getPublicSiteData } from "@/lib/public-site-data";
import JsonLd from "@/components/public/JsonLd";

export const metadata: Metadata = {
  title: "Kontakt & Öffnungszeiten",
  description: "Telefon, Adresse, Öffnungszeiten und Anfahrt zum Azzam Salon in Cottbus.",
};

export default async function Page() {
  const data = await getPublicSiteData();
  return <>{data.profile && data.hours.length > 0 && <JsonLd profile={data.profile} hours={data.hours} />}<ContactPageView {...data} embedded /></>;
}
