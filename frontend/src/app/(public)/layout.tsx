import type { ReactNode } from "react";
import InfoPageShell from "@/components/site/InfoPageShell";
import { getPublicSiteData } from "@/lib/public-site-data";

export const dynamic = "force-dynamic";

export default async function PublicLayout({ children }: { children: ReactNode }) {
  return <InfoPageShell {...await getPublicSiteData()}>{children}</InfoPageShell>;
}
