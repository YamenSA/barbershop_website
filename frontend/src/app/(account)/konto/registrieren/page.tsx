'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { accountRegister } from '@/lib/api';
import PasswordInput from '@/components/PasswordInput';

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState({ name: '', email: '', phone: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setMessage('');
    try {
      const res = await accountRegister({
        name: form.name,
        email: form.email,
        phone: form.phone || undefined,
        password: form.password,
      });
      setMessage(res.message);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Registrierung fehlgeschlagen.';
      setError(msg === 'WEAK_PASSWORD' ? 'Passwort muss mindestens 10 Zeichen haben.' : msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Konto erstellen</h1>
      {message ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          <p>{message}</p>
          <p className="mt-2 text-sm">Bitte prüfen Sie Ihre E-Mails und klicken Sie auf den Verifikationslink.</p>
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
          )}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Name *</label>
            <input
              type="text"
              required
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">E-Mail *</label>
            <input
              type="email"
              required
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Telefon (optional)</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Passwort * (min. 10 Zeichen)</label>
            <PasswordInput
              autoComplete="new-password"
              required
              minLength={10}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-900 text-white py-2.5 rounded-lg font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Wird registriert…' : 'Konto erstellen'}
          </button>
          <p className="text-center text-sm text-stone-500">
            Bereits ein Konto?{' '}
            <a href="/konto/login" className="text-stone-900 hover:underline">Anmelden</a>
          </p>
        </form>
      )}
    </div>
  );
}
