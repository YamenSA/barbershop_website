'use client';

import { useEffect, useState } from 'react';
import { use } from 'react';
import { accountVerify } from '@/lib/api';

export default function VerifyPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params);
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    accountVerify(token)
      .then(() => setStatus('success'))
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : 'Fehler';
        if (msg === 'TOKEN_USED') setErrorMsg('Dieser Link wurde bereits verwendet.');
        else if (msg === 'TOKEN_EXPIRED') setErrorMsg('Dieser Link ist abgelaufen. Bitte neu registrieren.');
        else setErrorMsg('Ungültiger Verifikationslink.');
        setStatus('error');
      });
  }, [token]);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-stone-200 p-8 text-center">
      {status === 'loading' && (
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-800 mx-auto" />
      )}
      {status === 'success' && (
        <>
          <div className="text-4xl mb-4">✓</div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">E-Mail bestätigt</h1>
          <p className="text-stone-600 mb-4">Ihr Konto ist jetzt aktiv.</p>
          <a
            href="/konto/login"
            className="inline-block bg-stone-900 text-white px-6 py-2.5 rounded-lg font-medium hover:bg-stone-700 transition-colors"
          >
            Jetzt anmelden
          </a>
        </>
      )}
      {status === 'error' && (
        <>
          <div className="text-4xl mb-4">✗</div>
          <h1 className="text-xl font-bold text-stone-900 mb-2">Verifikation fehlgeschlagen</h1>
          <p className="text-stone-600 mb-4">{errorMsg}</p>
          <a href="/konto/registrieren" className="text-stone-900 hover:underline text-sm">
            Zurück zur Registrierung
          </a>
        </>
      )}
    </div>
  );
}
