'use client';

import { useEffect, useState } from 'react';
import {
  getTeamMembers,
  patchAppointment,
  updateAppointmentStatus,
  ApiError,
} from '@/lib/api';
import type { Appointment, TeamMember } from '@/lib/types';

const STATUS_LABELS: Record<Appointment['status'], string> = {
  confirmed: 'Bestätigt',
  completed: 'Abgeschlossen',
  cancelled: 'Storniert',
  no_show: 'Nicht erschienen',
};

interface Props {
  appointment: Appointment;
  serviceNames: Record<string, string>;
  memberNames: Record<string, string>;
  onClose: () => void;
  onUpdated: (appt: Appointment) => void;
}

export default function AppointmentModal({
  appointment,
  serviceNames,
  memberNames,
  onClose,
  onUpdated,
}: Props) {
  const [members, setMembers] = useState<TeamMember[]>([]);

  const [status, setStatus] = useState<Appointment['status']>(appointment.status);
  const [notes, setNotes] = useState(appointment.notes ?? '');

  const [newStartsAt, setNewStartsAt] = useState('');
  const [newMemberId, setNewMemberId] = useState('');

  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getTeamMembers(true).then(setMembers);
  }, []);

  const localDt = (iso: string) => {
    const d = new Date(iso);
    const pad = (n: number) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleStatusChange = async (next: Appointment['status']) => {
    setStatusSaving(true);
    setError('');
    try {
      const updated = await updateAppointmentStatus(appointment.id, next);
      setStatus(updated.status);
      onUpdated(updated);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Fehler');
    } finally {
      setStatusSaving(false);
    }
  };

  const handleReschedule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStartsAt && !newMemberId && notes === appointment.notes) return;
    setSaving(true);
    setError('');
    try {
      const payload: Parameters<typeof patchAppointment>[1] = {};
      if (newStartsAt) payload.starts_at = new Date(newStartsAt).toISOString();
      if (newMemberId) payload.team_member_id = newMemberId;
      if (notes !== appointment.notes) payload.notes = notes;
      const updated = await patchAppointment(appointment.id, payload);
      onUpdated(updated);
      onClose();
    } catch (err) {
      if (err instanceof ApiError && err.status === 409) {
        setError(
          err.message === 'BOOKING_CONFLICT'
            ? 'Dieser Zeitslot ist bereits belegt.'
            : 'Ungültiger Statuswechsel.',
        );
      } else {
        setError(err instanceof Error ? err.message : 'Fehler');
      }
    } finally {
      setSaving(false);
    }
  };

  const fmt = (iso: string) =>
    new Date(iso).toLocaleString('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6 space-y-5">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-lg font-semibold text-gray-900">
              {serviceNames[appointment.service_id] ?? 'Termin'}
            </h2>
            <p className="text-sm text-gray-500">
              {fmt(appointment.starts_at)} – {fmt(appointment.ends_at)}
            </p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl leading-none">✕</button>
        </div>

        {/* Details */}
        <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm">
          <dt className="font-medium text-gray-500">Mitarbeiter</dt>
          <dd>{memberNames[appointment.team_member_id] ?? appointment.team_member_id}</dd>
          <dt className="font-medium text-gray-500">Kunde</dt>
          <dd>{appointment.guest_name ?? appointment.customer_id ?? '—'}</dd>
          {appointment.guest_phone && (
            <>
              <dt className="font-medium text-gray-500">Telefon</dt>
              <dd>{appointment.guest_phone}</dd>
            </>
          )}
        </dl>

        {/* Status */}
        <div className="flex items-center gap-3">
          <span className="text-sm font-medium text-gray-700">Status:</span>
          <div className="flex gap-2 flex-wrap">
            {(Object.keys(STATUS_LABELS) as Appointment['status'][]).map((s) => (
              <button
                key={s}
                disabled={statusSaving || s === status}
                onClick={() => handleStatusChange(s)}
                className={`rounded px-2 py-1 text-xs font-medium transition-colors ${
                  s === status
                    ? 'bg-indigo-100 text-indigo-800 cursor-default'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
              >
                {STATUS_LABELS[s]}
              </button>
            ))}
          </div>
        </div>

        {/* Reschedule / notes form */}
        <form onSubmit={handleReschedule} className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium text-gray-700">Bearbeiten</p>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Neues Datum & Uhrzeit</label>
            <input
              type="datetime-local"
              value={newStartsAt}
              onChange={(e) => setNewStartsAt(e.target.value)}
              placeholder={localDt(appointment.starts_at)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Mitarbeiter</label>
            <select
              value={newMemberId}
              onChange={(e) => setNewMemberId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Unverändert</option>
              {members.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs text-gray-500 mb-1">Interne Notiz</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="rounded px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Schließen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Speichern…' : 'Speichern'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
