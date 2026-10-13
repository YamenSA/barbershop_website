import type { ReactNode } from "react";

// Scope the public booking/cancellation pages without changing admin/account.
export default function BookingLayout({ children }: { children: ReactNode }) {
  return <div className="bg-surface-base font-text text-ink">{children}</div>;
}
