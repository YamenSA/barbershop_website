'use client';

import { useEffect, useRef, useState } from 'react';
import { getPublicAvailability, getPublicSalonHours } from '@/lib/api';
import type { PublicSlot, PublicSalonHoursRead } from '@/lib/types';

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

/** Weekday for a "YYYY-MM-DD" string as 0=Mon … 6=Sun (matches SalonHours). */
function weekdayMonday0(dateStr: string): number {
  const d = new Date(`${dateStr}T12:00:00`); // local noon → tz-robust weekday
  return (d.getDay() + 6) % 7; // JS getDay(): 0=Sun … 6=Sat
}

function formatTime(iso: string): string {
  return new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });
}

function formatDay(dateStr: string): string {
  return new Date(`${dateStr}T12:00:00`).toLocaleDateString('de-DE', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

export default function SlotPicker({ serviceId, teamMemberId, selected, onSelect }: Props) {
  const today = new Date();
  const days = Array.from({ length: DAYS }, (_, i) => toLocalDateString(addDays(today, i + 1)));

  const [salonHours, setSalonHours] = useState<PublicSalonHoursRead[]>([]);
  const [activeDay, setActiveDay] = useState(days[0]);
  const [slots, setSlots] = useState<PublicSlot[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Horizontal scrolling of the day strip: the scrollbar is hidden, so on
  // desktop (mouse) there is no other way to reach the off-screen days.
  const stripRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const updateScrollHints = () => {
    const el = stripRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  };

  const scrollStrip = (dir: 1 | -1) => {
    stripRef.current?.scrollBy({ left: dir * 220, behavior: 'smooth' });
  };

  useEffect(() => {
    updateScrollHints();
    const el = stripRef.current;
    if (!el) return;
    el.addEventListener('scroll', updateScrollHints, { passive: true });
    window.addEventListener('resize', updateScrollHints);
    return () => {
      el.removeEventListener('scroll', updateScrollHints);
      window.removeEventListener('resize', updateScrollHints);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // A weekday counts as closed only once we actually know the salon hours; until
  // then treat every day as open so nothing flickers grey on first paint.
  const isDayClosed = (dateStr: string): boolean => {
    const sh = salonHours.find((s) => s.day_of_week === weekdayMonday0(dateStr));
    return sh ? !sh.is_open : false;
  };

  useEffect(() => {
    getPublicSalonHours().then(setSalonHours).catch(() => {});
  }, []);

  // Once hours are known, never leave the selection sitting on a closed day.
  useEffect(() => {
    if (salonHours.length && isDayClosed(activeDay)) {
      const firstOpen = days.find((d) => !isDayClosed(d));
      if (firstOpen) setActiveDay(firstOpen);
    }
    updateScrollHints();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [salonHours]);

  useEffect(() => {
    if (isDayClosed(activeDay)) {
      setSlots([]);
      setLoading(false);
      setError(false);
      return;
    }
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [serviceId, teamMemberId, activeDay, salonHours]);

  const activeClosed = isDayClosed(activeDay);

  return (
    <div>
      <h2 className="font-display font-bold text-ink text-xl mb-6">Termin wählen</h2>

      {/* Day tabs with scroll arrows (the scrollbar itself is hidden) */}
      <div className="flex items-center gap-1 mb-6">
        <button
          type="button"
          onClick={() => scrollStrip(-1)}
          disabled={!canScrollLeft}
          aria-label="Frühere Tage anzeigen"
          className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full text-ash transition-colors hover:bg-slate hover:text-ink disabled:opacity-25 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_oklch(0.65_0.19_140/0.5)]"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
            <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>

        <div
          ref={stripRef}
          className="flex gap-2 overflow-x-auto pb-2 scrollbar-none flex-1"
          role="tablist"
          aria-label="Tag auswählen"
        >
          {days.map((day) => {
          const closed = isDayClosed(day);
          const active = day === activeDay;
          return (
            <button
              key={day}
              type="button"
              role="tab"
              aria-selected={active}
              aria-disabled={closed}
              disabled={closed}
              onClick={() => !closed && setActiveDay(day)}
              title={closed ? 'Salon geschlossen' : undefined}
              className={`shrink-0 flex flex-col items-center gap-0.5 px-4 py-2 rounded-[var(--radius-btn)] text-sm font-medium transition-colors duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_oklch(0.65_0.19_140/0.5)] ${
                closed
                  ? 'bg-slate/50 text-ash/50 cursor-not-allowed'
                  : active
                  ? 'bg-malachite text-midnight'
                  : 'bg-slate text-ash hover:text-ink'
              }`}
            >
              <span className={closed ? 'line-through decoration-1' : ''}>{formatDay(day)}</span>
              {closed && <span className="text-[10px] font-normal not-italic">geschlossen</span>}
            </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={() => scrollStrip(1)}
          disabled={!canScrollRight}
          aria-label="Weitere Tage anzeigen"
          className="shrink-0 flex h-9 w-9 items-center justify-center rounded-full text-ash transition-colors hover:bg-slate hover:text-ink disabled:opacity-25 disabled:hover:bg-transparent focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_oklch(0.65_0.19_140/0.5)]"
        >
          <svg viewBox="0 0 24 24" fill="none" className="h-5 w-5" aria-hidden>
            <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>

      {/* Slots */}
      {activeClosed && (
        <p className="text-ash text-sm">Salon an diesem Tag geschlossen.</p>
      )}
      {!activeClosed && loading && (
        <p className="text-ash text-sm" role="status">Verfügbarkeit wird geladen …</p>
      )}
      {!activeClosed && error && (
        <p className="text-ash text-sm" role="alert">Verfügbarkeit konnte nicht geladen werden.</p>
      )}
      {!activeClosed && !loading && !error && slots.length === 0 && (
        <p className="text-ash text-sm">Keine freien Termine an diesem Tag.</p>
      )}
      {!activeClosed && !loading && !error && slots.length > 0 && (
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
                  className={`w-full py-2 text-sm font-medium rounded-[var(--radius-btn)] border transition-all duration-[var(--duration-fast)] focus-visible:outline-none focus-visible:shadow-[0_0_0_3px_oklch(0.65_0.19_140/0.5)] ${
                    isSelected
                      ? 'border-malachite bg-malachite/10 text-malachite shadow-glow'
                      : 'border-hairline bg-slate text-ash shadow-bevel hover:border-hairline-strong hover:text-ink hover:shadow-lift hover:-translate-y-0.5'
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
