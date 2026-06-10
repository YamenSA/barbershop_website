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

  // Don't show shell on login page
  if (pathname === '/admin/login') {
    return <>{children}</>;
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
    <div className="flex min-h-screen flex-col">
      <header className="bg-white shadow">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex h-16 justify-between items-center">
            <div className="flex">
              <div className="flex flex-shrink-0 items-center">
                <span className="text-xl font-bold text-gray-900">BarberAdmin</span>
              </div>
              <nav className="ml-6 flex space-x-8">
                {navItems.map((item) => (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`inline-flex items-center border-b-2 px-1 pt-1 text-sm font-medium ${
                      pathname === item.href
                        ? 'border-indigo-500 text-gray-900'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
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
                className="ml-4 text-sm font-medium text-gray-500 hover:text-gray-700"
              >
                Abmelden
              </button>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 py-10">
        <div className="mx-auto max-w-7xl sm:px-6 lg:px-8">
          {children}
        </div>
      </main>
    </div>
  );
}
