import type { ReactNode } from "react";
import InfoPageShell, { type InfoPageData } from "./InfoPageShell";

// Preview pages own their shell. Real public pages use the shared route layout.
export default function SitePageFrame({ embedded = false, children, className, ...data }: InfoPageData & { embedded?: boolean; activePath?: string; className?: string; children: ReactNode }) {
  const content = <div className={className}>{children}</div>;
  return embedded ? content : <InfoPageShell {...data}>{content}</InfoPageShell>;
}
