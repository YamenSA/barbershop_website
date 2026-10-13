import NotFoundPageView from "@/components/site/NotFoundPageView";
import { getPublicSiteData } from "@/lib/public-site-data";

export default async function NotFound() {
  return <NotFoundPageView {...await getPublicSiteData()} />;
}
