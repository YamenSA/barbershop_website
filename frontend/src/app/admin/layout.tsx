'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';

type IconName =
  | 'dashboard'
  | 'calendar'
  | 'services'
  | 'team'
  | 'customers'
  | 'hours'
  | 'schedule'
  | 'profile';

const navItems: { name: string; href: string; icon: IconName }[] = [
  { name: 'Dashboard', href: '/admin', icon: 'dashboard' },
  { name: 'Kalender', href: '/admin/calendar', icon: 'calendar' },
  { name: 'Kunden', href: '/admin/customers', icon: 'customers' as IconName },
  { name: 'Dienstleistungen', href: '/admin/services', icon: 'services' },
  { name: 'Team', href: '/admin/team', icon: 'team' },
  { name: 'Öffnungszeiten', href: '/admin/hours', icon: 'hours' },
  { name: 'Arbeitsplan', href: '/admin/schedule', icon: 'schedule' },
  { name: 'Salon-Profil', href: '/admin/profile', icon: 'profile' },
];

/** Inline-Icons (kein Icon-Paket im Projekt) — 20px, currentColor, stroke-Stil. */
function Icon({ name }: { name: IconName }) {
  const common = {
    width: 18,
    height: 18,
    viewBox: '0 0 24 24',
    fill: 'none',
    stroke: 'currentColor',
    strokeWidth: 2,
    strokeLinecap: 'round' as const,
    strokeLinejoin: 'round' as const,
    'aria-hidden': true,
    className: 'shrink-0',
  };
  switch (name) {
    case 'dashboard':
      return (
        <svg {...common}>
          <rect x="3" y="3" width="7" height="9" rx="1" />
          <rect x="14" y="3" width="7" height="5" rx="1" />
          <rect x="14" y="12" width="7" height="9" rx="1" />
          <rect x="3" y="16" width="7" height="5" rx="1" />
        </svg>
      );
    case 'calendar':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      );
    case 'services':
      return (
        <svg {...common}>
          <circle cx="6" cy="6" r="3" />
          <circle cx="6" cy="18" r="3" />
          <path d="M20 4 8.12 15.88M14.47 14.48 20 20M8.12 8.12 12 12" />
        </svg>
      );
    case 'team':
      return (
        <svg {...common}>
          <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'customers':
      return (
        <svg {...common}>
          <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2" />
          <circle cx="9" cy="7" r="4" />
          <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
          <path d="M16 3.13a4 4 0 0 1 0 7.75" />
        </svg>
      );
    case 'hours':
      return (
        <svg {...common}>
          <circle cx="12" cy="12" r="9" />
          <path d="M12 7v5l3 2" />
        </svg>
      );
    case 'schedule':
      return (
        <svg {...common}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18M9 16l2 2 4-4" />
        </svg>
      );
    case 'profile':
      return (
        <svg {...common}>
          <path d="M3 21h18M5 21V7l8-4v18M19 21V11l-6-3" />
          <path d="M9 9v.01M9 12v.01M9 15v.01M9 18v.01" />
        </svg>
      );
  }
}

function NavLinks({
  pathname,
  onNavigate,
}: {
  pathname: string;
  onNavigate?: () => void;
}) {
  return (
    <nav className="flex flex-col gap-1" aria-label="Admin-Navigation">
      {navItems.map((item) => {
        const active =
          item.href === '/admin'
            ? pathname === '/admin'
            : pathname.startsWith(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            onClick={onNavigate}
            aria-current={active ? 'page' : undefined}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)] focus-visible:ring-offset-1 focus-visible:ring-offset-[var(--admin-surface)] ${
              active
                ? 'bg-[color-mix(in_oklab,var(--admin-primary)_12%,white)] text-[var(--admin-primary)]'
                : 'text-[var(--admin-text-muted)] hover:bg-[var(--admin-page)] hover:text-[var(--admin-text)]'
            }`}
          >
            <Icon name={item.icon} />
            <span>{item.name}</span>
          </Link>
        );
      })}
    </nav>
  );
}

function Brand({ onNavigate }: { onNavigate?: () => void }) {
  return (
    <Link
      href="/admin"
      onClick={onNavigate}
      className="flex items-center gap-3 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]"
    >
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-[var(--admin-primary)] text-base font-bold text-white">
        A
      </span>
      <span className="flex flex-col leading-tight">
        <span className="text-sm font-semibold text-[var(--admin-text)]">
          Azzam Barbershop
        </span>
        <span className="text-xs font-medium tracking-wide text-[var(--admin-text-muted)]">
          Admin
        </span>
      </span>
    </Link>
  );
}

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Drawer bei Routenwechsel schließen.
  useEffect(() => {
    setDrawerOpen(false);
  }, [pathname]);

  // Body-Scroll sperren, solange das mobile Menü offen ist.
  useEffect(() => {
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  // Don't show shell on login page — but still pin the light theme so the
  // login form never inherits the dark public body (white-on-white bug).
  if (pathname === '/admin/login') {
    return (
      <div className="admin-shell min-h-screen flex items-center justify-center">
        {children}
      </div>
    );
  }

  const handleLogout = async () => {
    try {
      await apiFetch('/auth/logout', { method: 'POST' });
      router.push('/konto/login');
    } catch (error) {
      console.error('Logout failed', error);
      // Even if API fails, clear client side and redirect
      router.push('/konto/login');
    }
  };

  const LogoutButton = ({ onNavigate }: { onNavigate?: () => void }) => (
    <button
      onClick={() => {
        onNavigate?.();
        handleLogout();
      }}
      className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[var(--admin-text-muted)] transition-colors hover:bg-[var(--admin-page)] hover:text-[var(--admin-text)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]"
    >
      <svg
        width="18"
        height="18"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
        aria-hidden="true"
        className="shrink-0"
      >
        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9" />
      </svg>
      <span>Abmelden</span>
    </button>
  );

  return (
    <div className="admin-shell min-h-screen">
      {/* Desktop sidebar (fixed) */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 flex-col border-r border-[var(--admin-border)] bg-[var(--admin-surface)] lg:flex">
        <div className="flex h-16 items-center border-b border-[var(--admin-border)] px-5">
          <Brand />
        </div>
        <div className="flex-1 overflow-y-auto px-3 py-4">
          <NavLinks pathname={pathname} />
        </div>
        <div className="border-t border-[var(--admin-border)] p-3">
          <LogoutButton />
        </div>
      </aside>

      {/* Mobile top bar (sticky) */}
      <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-[var(--admin-border)] bg-[var(--admin-surface)] px-4 lg:hidden">
        <Brand />
        <button
          type="button"
          onClick={() => setDrawerOpen(true)}
          aria-label="Menü öffnen"
          aria-expanded={drawerOpen}
          aria-controls="admin-mobile-drawer"
          className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--admin-text)] transition-colors hover:bg-[var(--admin-page)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
            <line x1="4" y1="7" x2="20" y2="7" />
            <line x1="4" y1="12" x2="20" y2="12" />
            <line x1="4" y1="17" x2="20" y2="17" />
          </svg>
        </button>
      </header>

      {/* Mobile drawer + scrim */}
      {drawerOpen && (
        <div className="lg:hidden">
          <div
            className="fixed inset-0 z-40 bg-black/40"
            onClick={() => setDrawerOpen(false)}
            aria-hidden="true"
          />
          <div
            id="admin-mobile-drawer"
            role="dialog"
            aria-modal="true"
            aria-label="Navigation"
            className="fixed inset-y-0 left-0 z-50 flex w-72 max-w-[85%] flex-col bg-[var(--admin-surface)] shadow-xl"
          >
            <div className="flex h-16 items-center justify-between border-b border-[var(--admin-border)] px-4">
              <Brand onNavigate={() => setDrawerOpen(false)} />
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                aria-label="Menü schließen"
                className="flex h-10 w-10 items-center justify-center rounded-lg text-[var(--admin-text)] transition-colors hover:bg-[var(--admin-page)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--admin-primary)]"
              >
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true">
                  <line x1="6" y1="6" x2="18" y2="18" />
                  <line x1="18" y1="6" x2="6" y2="18" />
                </svg>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto px-3 py-4">
              <NavLinks pathname={pathname} onNavigate={() => setDrawerOpen(false)} />
            </div>
            <div className="border-t border-[var(--admin-border)] p-3">
              <LogoutButton onNavigate={() => setDrawerOpen(false)} />
            </div>
          </div>
        </div>
      )}

      {/* Content */}
      <div className="lg:pl-64">
        <main id="main-content" className="mx-auto max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
          {children}
        </main>
      </div>
    </div>
  );
}
