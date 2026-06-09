'use client';

import { useEffect, useRef, useState } from 'react';
import {
  createAppointment,
  getServices,
  getTeamMembers,
  searchCustomers,
} from '@/lib/api';
import type { Customer, Service, TeamMember } from '@/lib/types';

interface Props {
  initialStartsAt?: string;
  onSaved: () => void;
  onCancel: () => void;
}

export default function AppointmentForm({ initialStartsAt, onSaved, onCancel }: Props) {
  const [services, setServices] = useState<Service[]>([]);
  const [members, setMembers] = useState<TeamMember[]>([]);

  const [serviceId, setServiceId] = useState('');
  const [memberId, setMemberId] = useState('');
  const [startsAt, setStartsAt] = useState(initialStartsAt ?? '');
  const [notes, setNotes] = useState('');
  const [adminOverride, setAdminOverride] = useState(true);

  const [customerQuery, setCustomerQuery] = useState('');
  const [customerResults, setCustomerResults] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [guestName, setGuestName] = useState('');
  const [guestPhone, setGuestPhone] = useState('');

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    getServices(true).then(setServices);
    getTeamMembers(true).then(setMembers);
  }, []);

  // Filtered members: only those offering the selected service
  const filteredMembers = serviceId
    ? members.filter(
        (m) => !m.services?.length || m.services.some((s) => s.id === serviceId),
      )
    : members;

  const handleCustomerQuery = (q: string) => {
    setCustomerQuery(q);
    setSelectedCustomer(null);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (q.length < 2) { setCustomerResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      const results = await searchCustomers(q);
      setCustomerResults(results);
    }, 300);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSaving(true);
    try {
      await createAppointment({
        service_id: serviceId,
        team_member_id: memberId,
        starts_at: new Date(startsAt).toISOString(),
        notes: notes || undefined,
        admin_override: adminOverride,
        ...(selectedCustomer
          ? { customer_id: selectedCustomer.id }
          : { guest_name: guestName || undefined, guest_phone: guestPhone || undefined }),
      });
      onSaved();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Fehler beim Speichern';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Neuer Termin</h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Service */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Dienstleistung</label>
            <select
              required
              value={serviceId}
              onChange={(e) => { setServiceId(e.target.value); setMemberId(''); }}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Bitte wählen…</option>
              {services.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} ({s.duration_minutes} min)
                </option>
              ))}
            </select>
          </div>

          {/* Stylist */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Mitarbeiter</label>
            <select
              required
              value={memberId}
              onChange={(e) => setMemberId(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Bitte wählen…</option>
              {filteredMembers.map((m) => (
                <option key={m.id} value={m.id}>{m.name}</option>
              ))}
            </select>
          </div>

          {/* Date/time */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Datum & Uhrzeit</label>
            <input
              required
              type="datetime-local"
              value={startsAt}
              onChange={(e) => setStartsAt(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Customer search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Kunde suchen</label>
            {selectedCustomer ? (
              <div className="flex items-center gap-2 rounded border border-green-400 bg-green-50 px-3 py-2 text-sm">
                <span className="flex-1 font-medium text-green-800">{selectedCustomer.name}</span>
                <button
                  type="button"
                  onClick={() => { setSelectedCustomer(null); setCustomerQuery(''); }}
                  className="text-green-600 hover:text-green-800"
                >
                  ✕
                </button>
              </div>
            ) : (
              <>
                <input
                  type="text"
                  placeholder="Name oder Telefon…"
                  value={customerQuery}
                  onChange={(e) => handleCustomerQuery(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                {customerResults.length > 0 && (
                  <ul className="mt-1 rounded border border-gray-200 bg-white shadow-sm text-sm max-h-36 overflow-auto">
                    {customerResults.map((c) => (
                      <li key={c.id}>
                        <button
                          type="button"
                          onClick={() => { setSelectedCustomer(c); setCustomerResults([]); setCustomerQuery(''); }}
                          className="w-full px-3 py-2 text-left hover:bg-indigo-50"
                        >
                          {c.name} {c.phone && <span className="text-gray-400">· {c.phone}</span>}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </div>

          {/* Guest fallback */}
          {!selectedCustomer && (
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Gastname</label>
                <input
                  type="text"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Telefon</label>
                <input
                  type="tel"
                  value={guestPhone}
                  onChange={(e) => setGuestPhone(e.target.value)}
                  className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>
            </div>
          )}

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notiz</label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Admin override */}
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={adminOverride}
              onChange={(e) => setAdminOverride(e.target.checked)}
              className="rounded border-gray-300"
            />
            Zeitplan-Prüfung überspringen (Admin-Override)
          </label>

          {error && <p className="text-sm text-red-600">{error}</p>}

          <div className="flex justify-end gap-3 pt-2">
            <button
              type="button"
              onClick={onCancel}
              className="rounded px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100"
            >
              Abbrechen
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded bg-indigo-600 px-4 py-2 text-sm font-medium text-white hover:bg-indigo-700 disabled:opacity-50"
            >
              {saving ? 'Speichern…' : 'Termin buchen'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
