"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const entries = [
  { label: "Start", href: "/" },
  { label: "Preise", href: "/dienstleistungen" },
  { label: "Termin buchen", href: "/termin" },
  { label: "Kontakt", href: "/kontakt" },
];

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300";

export default function BottomBar() {
  const pathname = usePathname();
  if (pathname.startsWith("/termin")) return null;

  return (
    <nav aria-label="Schnellnavigation" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-[1fr_1fr_1.5fr_1fr] gap-1 border-t border-line bg-surface-raise px-2 pt-2 pb-[max(1.25rem,env(safe-area-inset-bottom))] md:hidden">
      {entries.map(({ label, href }) => {
        if (href === "/termin") {
          return (
            <Link key={href} href={href} className={`flex h-12 items-center justify-center rounded-lg bg-gold-500 font-text text-sm font-bold text-surface-pitch hover:bg-gold-400 ${focus}`}>
              {label}
            </Link>
          );
        }

        const active = pathname === href || (href !== "/" && pathname.startsWith(`${href}/`));
        return (
          <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`flex h-12 flex-col items-center justify-center gap-1.5 font-text text-[11px] font-semibold ${focus} ${active ? "text-gold-300" : "text-ink-muted"}`}>
            <span aria-hidden="true" className={`h-0.5 w-[18px] ${active ? "bg-gold-300" : "bg-transparent"}`} />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

export function BottomBarSpacer() {
  const pathname = usePathname();
  if (pathname.startsWith("/termin")) return null;

  return <div aria-hidden className="md:hidden h-[calc(76px+env(safe-area-inset-bottom))]" />;
}
