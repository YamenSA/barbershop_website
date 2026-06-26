'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { accountMe, accountUpdateProfile } from '@/lib/api';
import type { MeOut } from '@/lib/types';

export default function ProfilPage() {
  const router = useRouter();
  const [me, setMe] = useState<MeOut | null>(null);
  const [form, setForm] = useState({ name: '', phone: '' });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    accountMe()
      .then((data) => {
        setMe(data);
        setForm({ name: data.name, phone: data.phone ?? '' });
      })
      .catch(() => router.push('/konto/login'))
      .finally(() => setLoading(false));
  }, [router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError('');
    setSuccess(false);
    try {
      await accountUpdateProfile({ name: form.name || undefined, phone: form.phone || undefined });
      setSuccess(true);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Fehler beim Speichern.');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-800 mx-auto mt-16" />;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Mein Profil</h1>

      <div className="bg-white rounded-xl border border-stone-200 p-6">
        <p className="text-sm text-stone-500 mb-4">E-Mail: <span className="text-stone-800">{me?.email}</span></p>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
          )}
          {success && (
            <div className="bg-green-50 border border-green-200 rounded-lg p-3 text-green-800 text-sm">
              Profil gespeichert.
            </div>
          )}
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Name</label>
            <input
              type="text"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">Telefon</label>
            <input
              type="tel"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>
          <button
            type="submit"
            disabled={saving}
            className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
          >
            {saving ? 'Wird gespeichert…' : 'Speichern'}
          </button>
        </form>
      </div>
    </div>
  );
}
