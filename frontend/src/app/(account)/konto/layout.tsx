'use client';

import { useEffect, useState } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { accountMe } from '@/lib/api';
import type { MeOut } from '@/lib/types';

const PUBLIC_PATHS = [
  '/konto/registrieren',
  '/konto/login',
  '/konto/verifizieren',
  '/konto/passwort-vergessen',
  '/konto/passwort-zuruecksetzen',
];

export default function AccountLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<MeOut | null>(null);
  const [loading, setLoading] = useState(true);

  const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));

  useEffect(() => {
    if (isPublicPath) {
      setLoading(false);
      return;
    }
    accountMe()
      .then((me) => {
        setUser(me);
        setLoading(false);
      })
      .catch(() => {
        router.replace('/konto/login');
      });
  }, [isPublicPath, router]);

  if (loading && !isPublicPath) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-800" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-stone-50">
      {!isPublicPath && user && (
        <header className="bg-white border-b border-stone-200 px-4 py-3 flex items-center justify-between">
          <a href="/" className="text-stone-800 font-semibold text-lg">Azzam Barbershop</a>
          <nav className="flex gap-4 text-sm">
            <a href="/konto/termine" className="text-stone-600 hover:text-stone-900">Termine</a>
            <a href="/konto/profil" className="text-stone-600 hover:text-stone-900">Profil</a>
            <a href="/konto/datenschutz" className="text-stone-600 hover:text-stone-900">Datenschutz</a>
          </nav>
          <span className="text-sm text-stone-500">{user.name}</span>
        </header>
      )}
      <main className="max-w-2xl mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
