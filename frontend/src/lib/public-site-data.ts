import { cache } from "react";
import { getPublicSalonHours, getPublicSalonProfile } from "./api";

// One consistent set of salon data for the shared layout and page per request.
export const getPublicSiteData = cache(async () => {
  const [profile, hours] = await Promise.all([
    getPublicSalonProfile().catch(() => null),
    getPublicSalonHours().catch(() => []),
  ]);
  return { profile, hours };
});
