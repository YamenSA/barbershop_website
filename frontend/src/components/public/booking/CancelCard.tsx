'use client';

import { useState } from 'react';
import { cancelAppointment } from '@/lib/api';
import { ApiError } from '@/lib/api';
import type { CancellationView } from '@/lib/types';

interface Props {
  view: CancellationView;
  token: string;
}

function formatDateTime(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatDeadline(iso: string): string {
  return new Date(iso).toLocaleString('de-DE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

export default function CancelCard({ view: initial, token }: Props) {
  const [view, setView] = useState<CancellationView>(initial);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleCancel() {
    setSubmitting(true);
    setError(null);
    try {
      const updated = await cancelAppointment(token);
      setView(updated);
      setConfirming(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 410) {
          setError('Die Stornierungsfrist ist abgelaufen. Bitte kontaktieren Sie uns telefonisch.');
        } else if (err.status === 429) {
          setError('Zu viele Anfragen. Bitte warten Sie kurz und versuchen Sie es erneut.');
        } else {
          setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
        }
      } else {
        setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  const isCancelled = view.status === 'cancelled';

  return (
    <div className="max-w-md">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span
          className={`flex items-center justify-center w-10 h-10 rounded-full ${
            isCancelled ? 'bg-ash/20 text-ash' : 'bg-malachite/15 text-malachite'
          }`}
        >
          {isCancelled ? (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden>
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          ) : (
            <svg viewBox="0 0 20 20" fill="currentColor" className="w-5 h-5" aria-hidden>
              <path fillRule="evenodd" d="M6 2a1 1 0 00-1 1v1H4a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V6a2 2 0 00-2-2h-1V3a1 1 0 10-2 0v1H7V3a1 1 0 00-1-1zm0 5a1 1 0 000 2h8a1 1 0 100-2H6z" clipRule="evenodd" />
            </svg>
          )}
        </span>
        <h1 className="font-display font-bold text-ink text-xl">
          {isCancelled ? 'Termin storniert' : 'Termin stornieren'}
        </h1>
      </div>

      {/* Appointment details */}
      <div className="bg-slate rounded-[var(--radius-card)] px-5 py-4 space-y-3 mb-6">
        <div>
          <span className="text-ash text-xs">Dienstleistung</span>
          <p className="text-ink text-sm font-medium mt-0.5">{view.service_name}</p>
        </div>
        <div>
          <span className="text-ash text-xs">Stylist</span>
          <p className="text-ink text-sm font-medium mt-0.5">{view.team_member_name}</p>
        </div>
        <div>
          <span className="text-ash text-xs">Datum &amp; Uhrzeit</span>
          <p className="text-ink text-sm font-medium mt-0.5">{formatDateTime(view.starts_at)}</p>
        </div>
        <div>
          <span className="text-ash text-xs">Status</span>
          <p className={`text-sm font-medium mt-0.5 ${isCancelled ? 'text-ash' : 'text-malachite'}`}>
            {isCancelled ? 'Storniert' : 'Bestätigt'}
          </p>
        </div>
      </div>

      {/* Cancelled state */}
      {isCancelled && (
        <p className="text-ash text-sm mb-6">
          Ihr Termin wurde erfolgreich storniert. Der Slot ist wieder für andere Buchungen verfügbar.
        </p>
      )}

      {/* Cancellable — show deadline + confirm flow */}
      {!isCancelled && view.cancellable && !confirming && (
        <>
          {view.cancellation_deadline && (
            <p className="text-ash text-sm mb-4">
              Stornierung möglich bis:{' '}
              <span className="text-ink font-medium">{formatDeadline(view.cancellation_deadline)}</span>
            </p>
          )}
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="min-h-[44px] px-6 py-3 border border-red-800 text-red-400 text-sm font-medium rounded-[var(--radius-btn)] hover:bg-red-900/20 transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_oklch(0.65_0.19_140/0.5)]"
          >
            Termin stornieren
          </button>
        </>
      )}

      {/* Confirmation step */}
      {!isCancelled && view.cancellable && confirming && (
        <div className="space-y-4">
          <p className="text-ink text-sm">
            Möchten Sie den Termin wirklich stornieren? Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <div className="flex gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              className="min-h-[44px] px-6 py-3 bg-red-800 text-red-100 text-sm font-medium rounded-[var(--radius-btn)] hover:bg-red-700 disabled:opacity-50 transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_oklch(0.65_0.19_140/0.5)]"
            >
              {submitting ? 'Wird storniert …' : 'Ja, stornieren'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={submitting}
              className="min-h-[44px] px-6 py-3 border border-slate text-ash text-sm font-medium rounded-[var(--radius-btn)] hover:border-ash hover:text-ink disabled:opacity-50 transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_oklch(0.65_0.19_140/0.5)]"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Past deadline */}
      {!isCancelled && !view.cancellable && (
        <p className="text-ash text-sm">
          Die Stornierungsfrist ist abgelaufen. Bitte kontaktieren Sie uns telefonisch, falls Sie Ihren
          Termin verschieben oder absagen möchten.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-red-400 bg-red-900/20 rounded-[var(--radius-input)] px-4 py-3">
          {error}
        </p>
      )}

      <div className="mt-8">
        <a
          href="/"
          className="text-ash text-sm hover:text-ink transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_oklch(0.65_0.19_140/0.5)] rounded"
        >
          ← Zurück zur Startseite
        </a>
      </div>
    </div>
  );
}
