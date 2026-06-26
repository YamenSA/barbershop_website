'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { accountListAppointments, accountCancelAppointment, accountRescheduleAppointment, accountLogout } from '@/lib/api';
import type { AccountAppointmentRead, AppointmentListOut } from '@/lib/types';

function formatDate(iso: string) {
  return new Date(iso).toLocaleString('de-DE', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function AppointmentCard({
  appt,
  onCancel,
  onReschedule,
}: {
  appt: AccountAppointmentRead;
  onCancel: (id: string) => void;
  onReschedule: (appt: AccountAppointmentRead) => void;
}) {
  return (
    <div className="bg-white rounded-lg border border-stone-200 p-4">
      <div className="flex justify-between items-start">
        <div>
          <p className="font-medium text-stone-900">{appt.service_name}</p>
          <p className="text-sm text-stone-500">{appt.team_member_name}</p>
          <p className="text-sm text-stone-600 mt-1">{formatDate(appt.starts_at)}</p>
        </div>
        <span
          className={`text-xs px-2 py-1 rounded-full font-medium ${
            appt.status === 'confirmed'
              ? 'bg-green-100 text-green-700'
              : appt.status === 'cancelled'
              ? 'bg-red-100 text-red-700'
              : 'bg-stone-100 text-stone-600'
          }`}
        >
          {appt.status === 'confirmed'
            ? 'Bestätigt'
            : appt.status === 'cancelled'
            ? 'Storniert'
            : appt.status === 'completed'
            ? 'Abgeschlossen'
            : appt.status}
        </span>
      </div>
      {(appt.cancellable || appt.reschedulable) && (
        <div className="mt-3 flex gap-2">
          {appt.reschedulable && (
            <button
              onClick={() => onReschedule(appt)}
              className="text-sm px-3 py-1.5 border border-stone-300 rounded-lg hover:bg-stone-50 transition-colors"
            >
              Umbuchen
            </button>
          )}
          {appt.cancellable && (
            <button
              onClick={() => onCancel(appt.id)}
              className="text-sm px-3 py-1.5 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 transition-colors"
            >
              Stornieren
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default function TerminePage() {
  const router = useRouter();
  const [data, setData] = useState<AppointmentListOut | null>(null);
  const [loading, setLoading] = useState(true);
  const [rescheduling, setRescheduling] = useState<AccountAppointmentRead | null>(null);
  const [newDate, setNewDate] = useState('');
  const [actionError, setActionError] = useState('');

  const load = () => {
    accountListAppointments()
      .then(setData)
      .catch(() => router.push('/konto/login'))
      .finally(() => setLoading(false));
  };

  useEffect(() => { load(); }, []);

  const handleCancel = async (id: string) => {
    if (!confirm('Termin wirklich stornieren?')) return;
    setActionError('');
    try {
      await accountCancelAppointment(id);
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      if (msg === 'CANCELLATION_WINDOW_CLOSED') setActionError('Stornierungsfrist abgelaufen.');
      else setActionError(msg);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rescheduling || !newDate) return;
    setActionError('');
    try {
      await accountRescheduleAppointment(rescheduling.id, { starts_at: new Date(newDate).toISOString() });
      setRescheduling(null);
      setNewDate('');
      load();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler';
      if (msg === 'BOOKING_CONFLICT') setActionError('Dieser Zeitslot ist bereits belegt. Ihr Termin bleibt unverändert.');
      else if (msg === 'CANCELLATION_WINDOW_CLOSED') setActionError('Umbuchungsfrist abgelaufen.');
      else setActionError(msg);
    }
  };

  const handleLogout = async () => {
    await accountLogout().catch(() => {});
    router.push('/konto/login');
  };

  if (loading) return <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-stone-800 mx-auto mt-16" />;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold text-stone-900">Meine Termine</h1>
        <button onClick={handleLogout} className="text-sm text-stone-500 hover:underline">Abmelden</button>
      </div>

      {actionError && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-red-700 text-sm">{actionError}</div>
      )}

      {rescheduling && (
        <div className="bg-stone-50 border border-stone-200 rounded-xl p-4">
          <h2 className="font-semibold text-stone-900 mb-3">
            Termin umbuchen: {rescheduling.service_name} bei {rescheduling.team_member_name}
          </h2>
          <form onSubmit={handleReschedule} className="flex gap-3 items-end">
            <div className="flex-1">
              <label className="block text-sm text-stone-600 mb-1">Neuer Termin</label>
              <input
                type="datetime-local"
                required
                value={newDate}
                onChange={(e) => setNewDate(e.target.value)}
                className="w-full border border-stone-300 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-stone-500"
              />
            </div>
            <button type="submit" className="bg-stone-900 text-white px-4 py-2 rounded-lg text-sm font-medium">
              Bestätigen
            </button>
            <button
              type="button"
              onClick={() => setRescheduling(null)}
              className="border border-stone-300 px-4 py-2 rounded-lg text-sm"
            >
              Abbrechen
            </button>
          </form>
          <p className="text-xs text-stone-400 mt-2">
            Verfügbare Zeiten finden Sie auf der <a href="/termin" className="hover:underline">Buchungsseite</a>.
          </p>
        </div>
      )}

      <section>
        <h2 className="text-lg font-semibold text-stone-800 mb-3">Kommende Termine</h2>
        {data?.upcoming.length === 0 ? (
          <p className="text-stone-500 text-sm">Keine bevorstehenden Termine.</p>
        ) : (
          <div className="space-y-3">
            {data?.upcoming.map((a) => (
              <AppointmentCard key={a.id} appt={a} onCancel={handleCancel} onReschedule={setRescheduling} />
            ))}
          </div>
        )}
      </section>

      <section>
        <h2 className="text-lg font-semibold text-stone-800 mb-3">Vergangene Termine</h2>
        {data?.past.length === 0 ? (
          <p className="text-stone-500 text-sm">Keine vergangenen Termine.</p>
        ) : (
          <div className="space-y-3">
            {data?.past.map((a) => (
              <AppointmentCard key={a.id} appt={a} onCancel={handleCancel} onReschedule={setRescheduling} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
