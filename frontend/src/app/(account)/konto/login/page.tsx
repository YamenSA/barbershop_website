'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { accountLogin, apiFetch, ApiError } from '@/lib/api';
import PasswordInput from '@/components/PasswordInput';

export default function LoginPage() {
  const router = useRouter();
  const [form, setForm] = useState({ email: '', password: '', remember_me: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    // 1. Kunden-Login versuchen
    try {
      await accountLogin(form);
      router.push('/konto/termine');
      return;
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '';
      if (msg === 'EMAIL_NOT_VERIFIED') {
        setError('Bitte bestätigen Sie zuerst Ihre E-Mail-Adresse.');
        setLoading(false);
        return;
      }
      // INVALID_CREDENTIALS o. Ä. → es könnte ein Admin-Konto sein, weiter zu Schritt 2
    }

    // 2. Admin-Login mit derselben Eingabe versuchen
    try {
      await apiFetch('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ username: form.email, password: form.password }),
      });
      router.push('/admin');
      router.refresh();
      return;
    } catch (err: unknown) {
      if (err instanceof ApiError && err.status === 401) {
        setError('E-Mail/Benutzername oder Passwort ist falsch.');
      } else {
        setError(err instanceof Error ? err.message : 'Anmeldung fehlgeschlagen.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Anmelden</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">E-Mail oder Benutzername</label>
          <input
            type="text"
            autoComplete="username"
            required
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Passwort</label>
          <PasswordInput
            autoComplete="current-password"
            required
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-500"
          />
        </div>
        <label className="flex items-center gap-2 text-sm text-stone-600">
          <input
            type="checkbox"
            checked={form.remember_me}
            onChange={(e) => setForm({ ...form, remember_me: e.target.checked })}
            className="rounded border-stone-300"
          />
          Angemeldet bleiben (30 Tage)
        </label>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-stone-900 text-white py-2.5 rounded-lg font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Anmelden…' : 'Anmelden'}
        </button>
        <div className="flex justify-between text-sm text-stone-500">
          <a href="/konto/passwort-vergessen" className="hover:underline">Passwort vergessen?</a>
          <a href="/konto/registrieren" className="hover:underline">Neu registrieren</a>
        </div>
      </form>
    </div>
  );
}
