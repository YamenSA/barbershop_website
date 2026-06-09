'use client';

import { useEffect, useState } from 'react';
import {
  getSalonHours,
  updateSalonHours,
  getSalonClosures,
  createSalonClosure,
  deleteSalonClosure,
  ApiError,
} from '@/lib/api';
import type { SalonHours, SalonClosure } from '@/lib/types';
import ClosureWarningDialog from '@/components/admin/ClosureWarningDialog';

const DAY_NAMES = ['Montag', 'Dienstag', 'Mittwoch', 'Donnerstag', 'Freitag', 'Samstag', 'Sonntag'];

type HoursEdit = { is_open: boolean; open_time: string; close_time: string };

function buildEdits(hours: SalonHours[]): Record<number, HoursEdit> {
  const map: Record<number, HoursEdit> = {};
  for (let d = 0; d < 7; d++) {
    const row = hours.find((h) => h.day_of_week === d);
    map[d] = {
      is_open: row?.is_open ?? false,
      open_time: row?.open_time ?? '09:00',
      close_time: row?.close_time ?? '18:00',
    };
  }
  return map;
}

export default function HoursPage() {
  const [hours, setHours] = useState<SalonHours[]>([]);
  const [edits, setEdits] = useState<Record<number, HoursEdit>>({});
  const [closures, setClosures] = useState<SalonClosure[]>([]);
  const [newDate, setNewDate] = useState('');
  const [newReason, setNewReason] = useState('');
  const [saving, setSaving] = useState<number | null>(null);
  const [addingClosure, setAddingClosure] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Conflict dialog state
  const [conflictCount, setConflictCount] = useState(0);
  const [pendingClosure, setPendingClosure] = useState<{ date: string; reason: string } | null>(null);
  const [showDialog, setShowDialog] = useState(false);

  const load = async () => {
    try {
      const [h, c] = await Promise.all([getSalonHours(), getSalonClosures()]);
      setHours(h);
      setEdits(buildEdits(h));
      setClosures(c);
    } catch {
      setError('Laden fehlgeschlagen.');
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const setEdit = (day: number, field: keyof HoursEdit, value: string | boolean) =>
    setEdits((prev) => ({ ...prev, [day]: { ...prev[day], [field]: value } }));

  const saveDay = async (day: number) => {
    setSaving(day);
    setError(null);
    const e = edits[day];
    try {
      await updateSalonHours(day, {
        is_open: e.is_open,
        open_time: e.is_open ? e.open_time : null,
        close_time: e.is_open ? e.close_time : null,
      });
      await load();
    } catch {
      setError(`Speichern für ${DAY_NAMES[day]} fehlgeschlagen.`);
    } finally {
      setSaving(null);
    }
  };

  const submitClosure = async (date: string, reason: string, force = false) => {
    setAddingClosure(true);
    setError(null);
    try {
      await createSalonClosure({ date, reason: reason || undefined, force });
      setNewDate('');
      setNewReason('');
      await load();
    } catch (e) {
      if (e instanceof ApiError && e.status === 409) {
        const data = e.data as { detail: { conflicting_appointment_count: number } };
        setPendingClosure({ date, reason });
        setConflictCount(data.detail.conflicting_appointment_count);
        setShowDialog(true);
      } else {
        setError('Schließung konnte nicht gespeichert werden.');
      }
    } finally {
      setAddingClosure(false);
    }
  };

  const handleClosureSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    submitClosure(newDate, newReason, false);
  };

  const handleDialogConfirm = async () => {
    setShowDialog(false);
    if (pendingClosure) {
      await submitClosure(pendingClosure.date, pendingClosure.reason, true);
      setPendingClosure(null);
    }
  };

  const handleDialogCancel = () => {
    setShowDialog(false);
    setPendingClosure(null);
  };

  const handleDeleteClosure = async (id: string) => {
    if (!confirm('Schließung löschen?')) return;
    try {
      await deleteSalonClosure(id);
      await load();
    } catch {
      setError('Löschen fehlgeschlagen.');
    }
  };

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold text-gray-900">Öffnungszeiten & Schließungen</h1>
      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Weekly hours */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Wöchentliche Öffnungszeiten</h2>
        <div className="overflow-hidden rounded-lg border">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500 w-32">Tag</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Geöffnet</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Öffnet</th>
                <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Schließt</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {Array.from({ length: 7 }, (_, d) => {
                const e = edits[d] ?? { is_open: false, open_time: '09:00', close_time: '18:00' };
                return (
                  <tr key={d}>
                    <td className="px-4 py-3 text-sm font-medium text-gray-700">{DAY_NAMES[d]}</td>
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={e.is_open}
                        onChange={(ev) => setEdit(d, 'is_open', ev.target.checked)}
                        className="rounded"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={e.open_time}
                        disabled={!e.is_open}
                        onChange={(ev) => setEdit(d, 'open_time', ev.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-40"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <input
                        type="time"
                        value={e.close_time}
                        disabled={!e.is_open}
                        onChange={(ev) => setEdit(d, 'close_time', ev.target.value)}
                        className="rounded border border-gray-300 px-2 py-1 text-sm disabled:opacity-40"
                      />
                    </td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => saveDay(d)}
                        disabled={saving === d}
                        className="rounded bg-indigo-600 px-3 py-1 text-xs font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
                      >
                        {saving === d ? '…' : 'Speichern'}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      {/* Closures */}
      <section>
        <h2 className="text-lg font-semibold text-gray-800 mb-3">Schließtage</h2>

        <form onSubmit={handleClosureSubmit} className="mb-4 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs font-medium text-gray-600">Datum *</label>
            <input
              type="date"
              required
              value={newDate}
              onChange={(e) => setNewDate(e.target.value)}
              className="mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-600">Grund (optional)</label>
            <input
              type="text"
              value={newReason}
              onChange={(e) => setNewReason(e.target.value)}
              placeholder="z.B. Feiertag"
              className="mt-1 rounded border border-gray-300 px-2 py-1.5 text-sm w-48"
            />
          </div>
          <button
            type="submit"
            disabled={addingClosure}
            className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
          >
            {addingClosure ? 'Speichern…' : 'Hinzufügen'}
          </button>
        </form>

        {closures.length === 0 ? (
          <p className="text-sm text-gray-400">Keine Schließtage eingetragen.</p>
        ) : (
          <div className="overflow-hidden rounded-lg border">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Datum</th>
                  <th className="px-4 py-3 text-left text-xs font-medium uppercase text-gray-500">Grund</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 bg-white">
                {closures.map((c) => (
                  <tr key={c.id}>
                    <td className="px-4 py-3 text-sm text-gray-900">{c.date}</td>
                    <td className="px-4 py-3 text-sm text-gray-500">{c.reason ?? '—'}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => handleDeleteClosure(c.id)}
                        className="text-sm text-red-500 hover:text-red-700"
                      >
                        Löschen
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <ClosureWarningDialog
        open={showDialog}
        conflictCount={conflictCount}
        onConfirm={handleDialogConfirm}
        onCancel={handleDialogCancel}
      />
    </div>
  );
}
