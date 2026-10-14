import type { Metadata } from "next";
import FaqPageView from "@/components/site/FaqPageView";
import { getPublicSiteData } from "@/lib/public-site-data";

export const metadata: Metadata = {
  title: "Häufige Fragen",
  description: "Antworten zu Terminbuchung, Preisen, Zahlung und deinem Besuch im Azzam Salon.",
};

export default async function Page() {
  const data = await getPublicSiteData();
  return <FaqPageView {...data} embedded />;
}
