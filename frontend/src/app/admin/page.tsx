'use client';

import { useEffect, useState } from 'react';
import { apiFetch } from '@/lib/api';
import type { DashboardResponse } from '@/lib/types';
import DailyPlanExport from '@/components/admin/DailyPlanExport';

const today = () => new Date().toISOString().slice(0, 10);

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString('de-DE', { hour: '2-digit', minute: '2-digit' });

export default function DashboardPage() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [selectedDate, setSelectedDate] = useState(today());
  const [error, setError] = useState('');

  useEffect(() => {
    setError('');
    apiFetch<DashboardResponse>(`/admin/dashboard?date=${selectedDate}`)
      .then(setData)
      .catch((err) => setError(err instanceof Error ? err.message : 'Fehler'));
  }, [selectedDate]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <div className="flex items-center gap-3">
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            className="rounded border border-gray-300 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[var(--admin-primary)]"
          />
          <DailyPlanExport defaultDate={selectedDate} />
        </div>
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {data && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Today's appointments */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-5 py-4 border-b">
              <h2 className="text-base font-semibold text-gray-900">Heutige Termine</h2>
            </div>
            {data.appointments.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">Keine Termine für diesen Tag.</p>
            ) : (
              <ul className="divide-y">
                {data.appointments.map((a) => (
                  <li key={a.id} className="px-5 py-3 flex items-center gap-4 text-sm">
                    <span className="w-12 font-mono text-gray-500 shrink-0">
                      {fmtTime(a.starts_at)}
                    </span>
                    <span className="flex-1 text-gray-900">
                      {a.guest_name ?? (a.customer_id ? 'Kunde' : '—')}
                    </span>
                    <span className="text-gray-400 text-xs">
                      {a.team_member_id.slice(0, 8)}…
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>

          {/* Working today */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-5 py-4 border-b">
              <h2 className="text-base font-semibold text-gray-900">Heute im Einsatz</h2>
            </div>
            {data.working_today.length === 0 ? (
              <p className="px-5 py-8 text-sm text-gray-400 text-center">Kein Mitarbeiter heute eingeplant.</p>
            ) : (
              <ul className="divide-y">
                {data.working_today.map((w) => (
                  <li key={String(w.team_member_id)} className="px-5 py-3 flex items-center justify-between text-sm">
                    <span className="font-medium text-gray-900">{w.name}</span>
                    <span className="text-gray-500">
                      {w.start_time} – {w.end_time}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
