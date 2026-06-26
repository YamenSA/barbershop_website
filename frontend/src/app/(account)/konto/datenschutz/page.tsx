'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { accountExportData, accountDeleteAccount } from '@/lib/api';

export default function DatenschutzPage() {
  const router = useRouter();
  const [exporting, setExporting] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [error, setError] = useState('');

  const handleExport = async () => {
    setExporting(true);
    setError('');
    try {
      await accountExportData();
    } catch {
      setError('Export fehlgeschlagen. Bitte versuchen Sie es erneut.');
    } finally {
      setExporting(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    setError('');
    try {
      await accountDeleteAccount();
      router.push('/konto/login');
    } catch {
      setError('Löschung fehlgeschlagen. Bitte versuchen Sie es erneut.');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-stone-900">Datenschutz & Konto</h1>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{error}</div>
      )}

      <div className="bg-white rounded-xl border border-stone-200 p-6 space-y-4">
        <h2 className="font-semibold text-stone-900">Meine Daten exportieren</h2>
        <p className="text-sm text-stone-600">
          Laden Sie eine JSON-Datei mit Ihrem Profil und Ihrer Terminhistorie herunter (Art. 20 DSGVO).
        </p>
        <button
          onClick={handleExport}
          disabled={exporting}
          className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-stone-700 transition-colors disabled:opacity-50"
        >
          {exporting ? 'Wird erstellt…' : 'Daten exportieren'}
        </button>
      </div>

      <div className="bg-white rounded-xl border border-red-200 p-6 space-y-4">
        <h2 className="font-semibold text-red-800">Konto löschen</h2>
        <p className="text-sm text-stone-600">
          Ihr Konto wird unwiderruflich gelöscht. Kommende Termine werden storniert.
          Vergangene Termindaten werden anonymisiert (kein direkter Personenbezug mehr).
        </p>

        {!confirmDelete ? (
          <button
            onClick={() => setConfirmDelete(true)}
            className="border border-red-300 text-red-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-50 transition-colors"
          >
            Konto löschen
          </button>
        ) : (
          <div className="space-y-3">
            <p className="text-sm font-medium text-red-700">
              Sind Sie sicher? Diese Aktion kann nicht rückgängig gemacht werden.
            </p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {deleting ? 'Wird gelöscht…' : 'Ja, Konto endgültig löschen'}
              </button>
              <button
                onClick={() => setConfirmDelete(false)}
                className="border border-stone-300 px-4 py-2 rounded-lg text-sm"
              >
                Abbrechen
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="text-sm text-stone-500 space-y-1">
        <p>
          Weitere Informationen zum Datenschutz finden Sie in unserer{' '}
          <a href="/datenschutz" className="hover:underline">Datenschutzerklärung</a>.
        </p>
        <p>
          Bei Fragen wenden Sie sich an die im{' '}
          <a href="/impressum" className="hover:underline">Impressum</a> genannte Kontaktadresse.
        </p>
      </div>
    </div>
  );
}
