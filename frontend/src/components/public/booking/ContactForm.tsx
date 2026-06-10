'use client';

import { useState } from 'react';
import { createPublicAppointment } from '@/lib/api';
import { ApiError } from '@/lib/api';
import type { PublicAppointmentRead, PublicSlot } from '@/lib/types';

interface Props {
  serviceId: string;
  slot: PublicSlot;
  onSuccess: (result: PublicAppointmentRead) => void;
}

const inputClass =
  'w-full px-4 py-3 bg-slate text-ink text-sm rounded-[var(--radius-input)] border border-slate placeholder:text-ash focus-visible:outline-none focus-visible:border-malachite transition-colors duration-[var(--duration-fast)]';

export default function ContactForm({ serviceId, slot, onSuccess }: Props) {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [privacy, setPrivacy] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!privacy) return;
    setSubmitting(true);
    setError(null);
    try {
      const result = await createPublicAppointment({
        service_id: serviceId,
        team_member_id: slot.team_member_id,
        starts_at: slot.starts_at,
        customer: { name, email, phone: phone || undefined },
        privacy_acknowledged: true,
      });
      onSuccess(result);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 409) setError('Dieser Slot ist leider nicht mehr verfügbar. Bitte wählen Sie einen anderen Termin.');
        else if (err.status === 429) setError('Zu viele Anfragen. Bitte warten Sie kurz und versuchen Sie es erneut.');
        else setError('Ein Fehler ist aufgetreten. Bitte versuchen Sie es erneut.');
      } else {
        setError('Verbindungsfehler. Bitte versuchen Sie es erneut.');
      }
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div>
      <h2 className="font-display font-bold text-ink text-xl mb-6">Ihre Kontaktdaten</h2>
      <form onSubmit={handleSubmit} noValidate className="space-y-4 max-w-md">
        <div>
          <label className="block text-ash text-xs mb-1.5" htmlFor="name">
            Name <span aria-hidden>*</span>
          </label>
          <input
            id="name"
            type="text"
            required
            autoComplete="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Max Mustermann"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-ash text-xs mb-1.5" htmlFor="email">
            E-Mail-Adresse <span aria-hidden>*</span>
          </label>
          <input
            id="email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="max@beispiel.de"
            className={inputClass}
          />
        </div>

        <div>
          <label className="block text-ash text-xs mb-1.5" htmlFor="phone">
            Telefon <span className="text-ash">(optional)</span>
          </label>
          <input
            id="phone"
            type="tel"
            autoComplete="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="+49 30 …"
            className={inputClass}
          />
        </div>

        <label className="flex items-start gap-3 cursor-pointer group">
          <span className="relative mt-0.5 flex-shrink-0">
            <input
              type="checkbox"
              className="sr-only"
              checked={privacy}
              onChange={(e) => setPrivacy(e.target.checked)}
              required
            />
            <span
              aria-hidden
              className={`block w-5 h-5 rounded border transition-colors duration-[var(--duration-fast)] ${
                privacy ? 'bg-malachite border-malachite' : 'bg-slate border-slate group-hover:border-ash'
              }`}
            >
              {privacy && (
                <svg viewBox="0 0 16 16" fill="none" className="w-5 h-5 text-midnight">
                  <path d="M3 8l3.5 3.5 6.5-7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              )}
            </span>
          </span>
          <span className="text-ash text-xs leading-relaxed">
            Ich habe die{' '}
            <a href="/datenschutz" className="text-malachite underline-offset-2 hover:underline" target="_blank" rel="noopener">
              Datenschutzerklärung
            </a>{' '}
            gelesen und stimme der Verarbeitung meiner Daten zur Terminverwaltung zu.{' '}
            <span aria-hidden>*</span>
          </span>
        </label>

        {error && (
          <p role="alert" className="text-sm text-red-400 bg-red-900/20 rounded-[var(--radius-input)] px-4 py-3">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting || !privacy}
          className="w-full min-h-[44px] px-8 py-3.5 bg-malachite text-midnight font-semibold text-sm rounded-[var(--radius-btn)] transition-all duration-[var(--duration-fast)] hover:scale-[1.01] disabled:opacity-50 disabled:cursor-not-allowed focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_oklch(0.65_0.19_140/0.5)]"
        >
          {submitting ? 'Wird gebucht …' : 'Termin verbindlich buchen'}
        </button>

        <p className="text-ash text-xs">
          <span aria-hidden>*</span> Pflichtfelder · Zahlung bar vor Ort
        </p>
      </form>
    </div>
  );
}
