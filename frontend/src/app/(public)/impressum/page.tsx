import type { Metadata } from "next";
import LegalPageView from "@/components/site/LegalPageView";
import { getPublicSiteData } from "@/lib/public-site-data";

export const metadata: Metadata = {
  title: "Impressum",
  description: "Gesetzliche Anbieterkennzeichnung gemäß § 5 DDG.",
  robots: { index: false },
};

export default async function Page() {
  const data = await getPublicSiteData();
  return <LegalPageView {...data} embedded kind="impressum" />;
}
