"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import Button from "@/components/ui/Button";

type SiteHeaderProps = {
  phone?: string;
  phoneHref?: string;
};

const links = [
  { label: "Leistungen & Preise", href: "/dienstleistungen" },
  { label: "Über uns", href: "/ueber-uns" },
  { label: "Kontakt", href: "/kontakt" },
  { label: "FAQ", href: "/faq" },
];

const focus = "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-gold-300";

export default function SiteHeader({ phone, phoneHref }: SiteHeaderProps) {
  const pathname = usePathname();

  return (
    <header className="border-b border-line bg-surface-raise md:bg-surface-base">
      <div className="mx-auto flex h-14 max-w-[1200px] items-center justify-between gap-2 pl-4 pr-1 md:h-20 md:px-8 lg:gap-4">
        <Link href="/" aria-label="Azzam Salon Startseite" className={`flex shrink-0 items-center gap-2.5 md:gap-3.5 ${focus}`}>
          <Image src="/brand/logo-256.png" alt="" width={56} height={56} className="h-10 w-10 md:h-14 md:w-14" />
          <span className="font-brand text-2xl leading-none tracking-[.14em] text-ink md:text-[32px]">AZZAM</span>
          <span className="font-text text-[9px] font-semibold leading-none tracking-[.3em] text-gold-500 md:text-[10px]">SALON</span>
        </Link>

        <button type="button" aria-label="Menü öffnen" aria-expanded={false} className={`flex h-12 w-12 shrink-0 flex-col items-center justify-center gap-1.5 md:hidden ${focus}`}>
          <span aria-hidden="true" className="h-[1.5px] w-5 bg-ink" />
          <span aria-hidden="true" className="h-[1.5px] w-5 bg-ink" />
        </button>

        <nav aria-label="Hauptnavigation" className="hidden items-center md:flex">
          {links.map(({ label, href }) => {
            const active = pathname === href || pathname.startsWith(`${href}/`);
            return (
              <Link key={href} href={href} aria-current={active ? "page" : undefined} className={`relative flex h-12 items-center px-3.5 font-text text-[15px] font-semibold ${focus} ${active ? "text-gold-300" : "text-ink-muted hover:text-ink"}`}>
                {label}
                {active && <span aria-hidden="true" className="absolute inset-x-0 bottom-0 h-0.5 bg-gold-300" />}
              </Link>
            );
          })}
        </nav>

        <div className="hidden items-center gap-2 font-text lg:gap-4 md:flex">
          {phone && (phoneHref ? (
            <a href={phoneHref} className={`text-[15px] tabular-nums text-ink-muted ${focus}`}>{phone}</a>
          ) : (
            <span className="text-[15px] tabular-nums text-ink-muted">{phone}</span>
          ))}
          <Link href="/konto/login" className={`flex h-12 items-center gap-1.5 text-sm text-ink-subtle hover:text-gold-300 ${focus}`}>
            <svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="shrink-0">
              <circle cx="12" cy="8" r="4" />
              <path d="M4 21v-2a8 8 0 0 1 16 0v2" />
            </svg>
            Mein Konto
          </Link>
          <Button variant="primary" href="/termin">Termin buchen</Button>
        </div>
      </div>
    </header>
  );
}
