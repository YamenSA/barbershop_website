'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import { cancelAppointment } from '@/lib/api';
import { ApiError } from '@/lib/api';
import type { CancellationView } from '@/lib/types';
import { formatSalonDateTimeLong, formatSalonDeadline } from '@/lib/time';

interface Props {
  view: CancellationView;
  token: string;
  preview?: boolean;
}

const formatDateTime = formatSalonDateTimeLong;
const formatDeadline = formatSalonDeadline;

export default function CancelCard({ view: initial, token, preview = false }: Props) {
  const [view, setView] = useState<CancellationView>(initial);
  const [confirming, setConfirming] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const pending = useRef(false);

  async function handleCancel() {
    if (pending.current) return;
    pending.current = true;
    setSubmitting(true);
    setError(null);
    try {
      const updated = preview ? { ...view, status: 'cancelled' as const, cancellable: false } : await cancelAppointment(token);
      setView(updated);
      setConfirming(false);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 410) {
          setError('Die Stornierungsfrist ist abgelaufen. Bitte ruf uns im Salon an.');
        } else if (err.status === 429) {
          setError('Zu viele Anfragen. Bitte warte kurz und versuche es erneut.');
        } else {
          setError('Ein Fehler ist aufgetreten. Bitte versuche es erneut.');
        }
      } else {
        setError('Verbindungsfehler. Bitte versuche es erneut.');
      }
    } finally {
      pending.current = false;
      setSubmitting(false);
    }
  }

  const isCancelled = view.status === 'cancelled';

  return (
    <div className="mx-auto max-w-[640px]">
      {preview && <p className="mb-6 rounded-lg border border-line bg-surface-raise p-4 text-sm leading-6 text-ink-muted">Design-Vorschau: Die Absage wird nur dargestellt. Es wird kein Termin verändert.</p>}
      {/* Header */}
      <div className="flex items-center gap-3 mb-6">
        <span
          className={`flex items-center justify-center w-10 h-10 rounded-full ${
            isCancelled ? 'bg-surface-card text-ink-muted' : 'bg-success-bg text-success'
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
        <h1 className="font-brand font-medium uppercase text-ink text-[40px] leading-[44px]">
          {isCancelled ? 'Termin abgesagt' : 'Termin absagen'}
        </h1>
      </div>

      {/* Appointment details */}
      <div className="bg-surface-card rounded-xl px-5 py-5 space-y-4 mb-6 border border-line">
        <div>
          <span className="text-ink-muted text-xs">Dienstleistung</span>
          <p className="text-ink text-sm font-medium mt-0.5">{view.service_name}</p>
        </div>
        <div>
          <span className="text-ink-muted text-xs">Bei</span>
          <p className="text-ink text-sm font-medium mt-0.5">{view.team_member_name}</p>
        </div>
        <div>
          <span className="text-ink-muted text-xs">Datum &amp; Uhrzeit</span>
          <p className="text-ink text-sm font-medium mt-0.5">{formatDateTime(view.starts_at)}</p>
        </div>
        <div>
          <span className="text-ink-muted text-xs">Status</span>
          <p className={`text-sm font-medium mt-0.5 ${isCancelled ? 'text-ink-muted' : 'text-success'}`}>
            {isCancelled ? 'Abgesagt' : 'Bestätigt'}
          </p>
        </div>
      </div>

      {/* Cancelled state */}
      {isCancelled && (
        <p className="text-ink-muted text-sm mb-6">
          Dein Termin wurde abgesagt. Der Zeitraum ist wieder für andere Buchungen verfügbar.
        </p>
      )}

      {/* Cancellable — show deadline + confirm flow */}
      {!isCancelled && view.cancellable && !confirming && (
        <>
          {view.cancellation_deadline && (
            <p className="text-ink-muted text-sm mb-4">
              Absage möglich bis:{' '}
              <span className="text-ink font-medium">{formatDeadline(view.cancellation_deadline)}</span>
            </p>
          )}
          <button
            type="button"
            onClick={() => setConfirming(true)}
            className="min-h-12 px-6 py-3 border border-gold-500 text-gold-300 text-sm font-bold rounded-lg hover:bg-surface-hover"
          >
            Termin absagen
          </button>
        </>
      )}

      {/* Confirmation step */}
      {!isCancelled && view.cancellable && confirming && (
        <div className="space-y-4">
          <p className="text-ink text-sm">
            Möchtest du deinen Termin wirklich absagen? Diese Aktion kann nicht rückgängig gemacht werden.
          </p>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={handleCancel}
              disabled={submitting}
              className="min-h-12 px-6 py-3 bg-danger text-surface-pitch text-sm font-bold rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Wird abgesagt …' : 'Ja, absagen'}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={submitting}
              className="min-h-12 px-6 py-3 border border-gold-500 text-gold-300 text-sm font-bold rounded-lg hover:bg-surface-hover disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Abbrechen
            </button>
          </div>
        </div>
      )}

      {/* Past deadline */}
      {!isCancelled && !view.cancellable && (
        <p className="text-ink-muted text-sm">
          Die Stornierungsfrist ist abgelaufen. Bitte ruf uns an, falls du deinen
          Termin absagen möchten.
        </p>
      )}

      {error && (
        <p role="alert" className="mt-4 text-sm text-danger bg-danger-bg border border-danger-line rounded-lg px-4 py-3">
          {error}
        </p>
      )}

      <div className="mt-8">
        <Link
          href="/"
          className="inline-flex min-h-12 items-center text-gold-300 text-sm hover:text-ink underline underline-offset-4"
        >
          ← Zurück zur Startseite
        </Link>
      </div>
    </div>
  );
}
