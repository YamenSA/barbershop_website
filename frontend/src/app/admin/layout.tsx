'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { apiFetch } from '@/lib/api';

const navItems = [
  { name: 'Dashboard', href: '/admin' },
  { name: 'Kalender', href: '/admin/calendar' },
  { name: 'Dienstleistungen', href: '/admin/services' },
  { name: 'Team', href: '/admin/team' },
  { name: 'Öffnungszeiten', href: '/admin/hours' },
  { name: 'Arbeitsplan', href: '/admin/schedule' },
  { name: 'Salon-Profil', href: '/admin/profile' },
];

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();

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
      router.push('/admin/login');
    } catch (error) {
      console.error('Logout failed', error);
      // Even if API fails, clear client side and redirect
      router.push('/admin/login');
    }
  };

  return (
    <div className="admin-shell flex min-h-screen flex-col">
      <header className="bg-[var(--admin-surface)] border-b border-[var(--admin-border)]">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <span className="text-xl font-bold text-[var(--admin-text)]">BarberAdmin</span>
              </div>
              <nav className="ml-6 flex space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium transition-colors ${
                      pathname === item.href
                        ? 'border-[var(--admin-primary)] text-[var(--admin-text)]'
                        : 'border-transparent text-[var(--admin-text-muted)] hover:border-[var(--admin-border-strong)] hover:text-[var(--admin-text)]'
                    }`}
                  >
                    {item.name}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center">
              <button
                onClick={handleLogout}
                className="ml-4 text-sm font-medium text-[var(--admin-text-muted)] hover:text-[var(--admin-text)]"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      <main id="main-content" className="flex-1 py-10">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
