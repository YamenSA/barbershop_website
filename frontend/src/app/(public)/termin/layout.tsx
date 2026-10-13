import type { ReactNode } from "react";

// The existing booking form keeps its typography and palette until step 10.
export default function BookingLayout({ children }: { children: ReactNode }) {
  return <div className="bg-midnight font-body text-ink">{children}</div>;
}
