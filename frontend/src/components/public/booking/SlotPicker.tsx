'use client';

import { useEffect, useState } from 'react';
import { getPublicAvailability } from '@/lib/api';
import type { PublicSlot } from '@/lib/types';

interface Props {
  serviceId: string;
  teamMemberId: string | null;
  selected: PublicSlot | null;
  onSelect: (slot: PublicSlot) => void;
}

const DAYS = 14;

function addDays(d: Date, n: number): Date {
  const r = new Date(d);
  r.setDate(r.getDate() + n);
  return r;
}

function toLocalDateString(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function SlotPicker({ serviceId, teamMemberId, selected, onSelect }: Props) {
  const today = new Date();
  const days = Array.from({ length: DAYS }, (_, i) => toLocalDateString(addDays(today, i + 1)));

  const [activeDay, setActiveDay] = useState(days[0]);
  const [slots, setSlots] = useState<PublicSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(false);
    getPublicAvailability({ service_id: serviceId, team_member_id: teamMemberId, date: activeDay })
      .then((res) => {
        if (!cancelled) setSlots(res.slots);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [serviceId, teamMemberId, activeDay]);

  return (
    <div>
      <h2 className="font-display font-bold text-ink text-xl mb-6">Termin wählen</h2>

      {/* Day tabs */}
      <div
        className="flex gap-2 overflow-x-auto pb-2 mb-6 scrollbar-none"
        role="tablist"
        aria-label="Tag auswählen"
      >
        {days.map((day) => (
          <button
            key={day}
            type="button"
            role="tab"
            aria-selected={day === activeDay}
            onClick={() => setActiveDay(day)}
            className={`shrink-0 px-4 py-2 rounded-[var(--radius-btn)] text-sm font-medium transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_oklch(0.65_0.19_140/0.5)] ${
              day === activeDay
                ? 'bg-malachite text-midnight'
                : 'bg-slate text-ash hover:text-ink'
            }`}
          >
            {formatDay(day)}
          </button>
        ))}
      </div>

      {/* Slots */}
      {loading && (
        <p className="text-ash text-sm" role="status">Verfügbarkeit wird geladen …</p>
      )}
      {error && (
        <p className="text-ash text-sm" role="alert">Verfügbarkeit konnte nicht geladen werden.</p>
      )}
      {!loading && !error && slots.length === 0 && (
        <p className="text-ash text-sm">Keine freien Termine an diesem Tag.</p>
      )}
      {!loading && !error && slots.length > 0 && (
        <ul
          className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2"
          role="listbox"
          aria-label="Verfügbare Uhrzeiten"
        >
          {slots.map((slot) => {
            const isSelected =
              selected?.starts_at === slot.starts_at &&
              selected?.team_member_id === slot.team_member_id;
            return (
              <li key={`${slot.starts_at}-${slot.team_member_id}`} role="option" aria-selected={isSelected}>
                <button
                  type="button"
                  onClick={() => onSelect(slot)}
                  className={`w-full py-2 text-sm font-medium rounded-[var(--radius-btn)] border transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_oklch(0.65_0.19_140/0.5)] ${
                    isSelected
                      ? 'border-malachite bg-malachite/10 text-malachite'
                      : 'border-slate text-ash hover:border-ash hover:text-ink'
                  }`}
                >
                  {formatTime(slot.starts_at)}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
