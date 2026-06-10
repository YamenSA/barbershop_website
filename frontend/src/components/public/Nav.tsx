'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import BookingCta from './BookingCta';

const NAV_LINKS = [
  { href: '/dienstleistungen', label: 'Dienstleistungen' },
  { href: '/team', label: 'Team' },
  { href: '/ueber-uns', label: 'Über uns' },
  { href: '/kontakt', label: 'Kontakt' },
  { href: '/faq', label: 'FAQ' },
];

export default function Nav() {
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 bg-midnight border-b border-[oklch(0.95_0.004_140/0.08)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex h-16 items-center justify-between">

          {/* Logo */}
          <Link
            href="/"
            className="font-display font-extrabold text-xl tracking-[-0.02em] text-ink"
          >
            AZZAM BARBERSHOP
          </Link>

          {/* Desktop nav links */}
          <nav
            className="hidden md:flex items-center gap-6"
            aria-label="Hauptnavigation"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`text-sm font-medium transition-colors duration-[150ms] ${
                  pathname === link.href
                    ? 'text-malachite'
                    : 'text-ash hover:text-ink'
                }`}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Desktop CTA */}
          <div className="hidden md:block">
            <BookingCta />
          </div>

          {/* Mobile hamburger */}
          <button
            type="button"
            className="md:hidden flex items-center justify-center w-10 h-10 text-ink"
            onClick={() => setMenuOpen(true)}
            aria-label="Menü öffnen"
            aria-expanded={menuOpen}
            aria-controls="mobile-menu"
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 22 22"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              <line x1="2" y1="5" x2="20" y2="5" />
              <line x1="2" y1="11" x2="20" y2="11" />
              <line x1="2" y1="17" x2="20" y2="17" />
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile full-screen drawer */}
      {menuOpen && (
        <div
          id="mobile-menu"
          className="fixed inset-0 z-50 bg-midnight flex flex-col"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation"
        >
          {/* Drawer header */}
          <div className="flex h-16 items-center justify-between px-4 border-b border-[oklch(0.95_0.004_140/0.08)]">
            <Link
              href="/"
              className="font-display font-extrabold text-xl tracking-[-0.02em] text-ink"
              onClick={() => setMenuOpen(false)}
            >
              AZZAM BARBERSHOP
            </Link>
            <button
              type="button"
              className="flex items-center justify-center w-10 h-10 text-ink"
              onClick={() => setMenuOpen(false)}
              aria-label="Menü schließen"
            >
              <svg
                width="22"
                height="22"
                viewBox="0 0 22 22"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                aria-hidden="true"
              >
                <line x1="4" y1="4" x2="18" y2="18" />
                <line x1="18" y1="4" x2="4" y2="18" />
              </svg>
            </button>
          </div>

          {/* Drawer links */}
          <nav
            className="flex-1 flex flex-col px-4 pt-6"
            aria-label="Mobile Navigation"
          >
            {NAV_LINKS.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={`py-4 font-display font-bold text-2xl tracking-[-0.02em] border-b border-[oklch(0.95_0.004_140/0.06)] ${
                  pathname === link.href ? 'text-malachite' : 'text-ink'
                }`}
                onClick={() => setMenuOpen(false)}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Sticky bottom CTA */}
          <div className="px-4 pb-8 pt-4">
            <BookingCta className="w-full justify-center" />
          </div>
        </div>
      )}
    </header>
  );
}
