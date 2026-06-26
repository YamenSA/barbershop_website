'use client';

import { useState } from 'react';
import { accountForgotPassword } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await accountForgotPassword(email);
    } finally {
      setSent(true);
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8">
      <h1 className="text-2xl font-bold text-stone-900 mb-2">Passwort vergessen</h1>
      {sent ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-green-800">
          Falls ein Konto mit dieser E-Mail-Adresse existiert, wurde eine E-Mail gesendet.
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="space-y-4">
          <p className="text-stone-600 text-sm mb-4">
            Geben Sie Ihre E-Mail-Adresse ein. Falls ein Konto existiert, erhalten Sie einen Link.
          </p>
          <div>
            <label className="block text-sm font-medium text-stone-700 mb-1">E-Mail</label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-500"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-stone-900 text-white py-2.5 rounded-lg font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
          >
            {loading ? 'Wird gesendet…' : 'Link anfordern'}
          </button>
          <a href="/konto/login" className="block text-center text-sm text-stone-500 hover:underline">
            Zurück zur Anmeldung
          </a>
        </form>
      )}
    </div>
  );
}
