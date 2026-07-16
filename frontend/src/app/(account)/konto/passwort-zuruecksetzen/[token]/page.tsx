'use client';

import { useState } from 'react';
import { use } from 'react';
import { useRouter } from 'next/navigation';
import { accountResetPassword } from '@/lib/api';
import PasswordInput from '@/components/PasswordInput';

export default function ResetPasswordPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await accountResetPassword(token, password);
      router.push('/konto/login');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      if (msg === 'TOKEN_USED') setError('Dieser Link wurde bereits verwendet.');
      else if (msg === 'TOKEN_EXPIRED') setError('Dieser Link ist abgelaufen. Bitte erneut anfordern.');
      else if (msg === 'WEAK_PASSWORD') setError('Passwort muss mindestens 10 Zeichen haben.');
      else setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8">
      <h1 className="text-2xl font-bold text-stone-900 mb-6">Neues Passwort setzen</h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
        )}
        <div>
          <label className="block text-sm font-medium text-stone-700 mb-1">Neues Passwort (min. 10 Zeichen)</label>
          <PasswordInput
            autoComplete="new-password"
            required
            minLength={10}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-stone-900 text-white py-2.5 rounded-lg font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
        >
          {loading ? 'Wird gespeichert…' : 'Passwort speichern'}
        </button>
      </form>
    </div>
  );
}
