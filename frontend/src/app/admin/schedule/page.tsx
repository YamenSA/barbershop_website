'use client';

import { useState, useEffect } from 'react';
import { apiFetch } from '@/lib/api';
import { TeamMember, WorkingHours, DayOverride } from '@/lib/types';

const DAYS = [
  { id: 1, name: 'Montag' },
  { id: 2, name: 'Dienstag' },
  { id: 3, name: 'Mittwoch' },
  { id: 4, name: 'Donnerstag' },
  { id: 5, name: 'Freitag' },
  { id: 6, name: 'Samstag' },
  { id: 0, name: 'Sonntag' },
];

export default function SchedulePage() {
  const [team, setTeam] = useState<TeamMember[]>([]);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [workingHours, setWorkingHours] = useState<WorkingHours[]>([]);
  const [overrides, setOverrides] = useState<DayOverride[]>([]);
  const [loading, setLoading] = useState(true);

  // New Override Form State
  const [overrideDate, setOverrideDate] = useState('');
  const [overrideType, setOverrideType] = useState<'day_off' | 'extra_hours'>('day_off');
  const [customStart, setCustomStart] = useState('09:00');
  const [customEnd, setCustomEnd] = useState('17:00');
  const [overrideReason, setOverrideReason] = useState('');

  useEffect(() => {
    loadTeam();
  }, []);

  useEffect(() => {
    if (selectedMember) {
      loadMemberData(selectedMember.id);
    }
  }, [selectedMember]);

  const loadTeam = async () => {
    try {
      const data = await apiFetch<TeamMember[]>('/team-members');
      setTeam(data);
      if (data.length > 0) setSelectedMember(data[0]);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const loadMemberData = async (memberId: string) => {
    try {
      const [hours, ovr] = await Promise.all([
        apiFetch<WorkingHours[]>(`/team-members/${memberId}/working-hours`),
        apiFetch<DayOverride[]>(`/team-members/${memberId}/day-overrides`),
      ]);
      setWorkingHours(hours);
      setOverrides(ovr);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUpdateWorkingHours = async (dayOfWeek: number, start: string, end: string) => {
    if (!selectedMember) return;
    try {
      await apiFetch(`/team-members/${selectedMember.id}/working-hours/${dayOfWeek}`, {
        method: 'PUT',
        body: JSON.stringify({ start_time: start, end_time: end }),
      });
      loadMemberData(selectedMember.id);
    } catch (e) {
      alert(e);
    }
  };

  const handleAddOverride = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMember || !overrideDate) return;

    const body: any = {
      date: overrideDate,
      override_type: overrideType,
      reason: overrideReason || null,
    };

    if (overrideType === 'extra_hours') {
      body.custom_start_time = customStart;
      body.custom_end_time = customEnd;
    }

    try {
      await apiFetch(`/team-members/${selectedMember.id}/day-overrides`, {
        method: 'POST',
        body: JSON.stringify(body),
      });
      setOverrideDate('');
      setOverrideReason('');
      loadMemberData(selectedMember.id);
    } catch (e) {
      alert(e);
    }
  };

  const handleDeleteOverride = async (id: string) => {
    try {
      await apiFetch(`/day-overrides/${id}`, { method: 'DELETE' });
      if (selectedMember) loadMemberData(selectedMember.id);
    } catch (e) {
      alert(e);
    }
  };

  if (loading) return <div>Laden...</div>;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Arbeitsplan & Überschreibungen</h1>
        <p className="text-gray-600">Verwalten Sie die regulären Arbeitszeiten und tagesgenaue Ausnahmen.</p>
      </div>

      <div className="flex gap-4 items-center">
        <label className="font-medium">Mitarbeiter wählen:</label>
        <select
          className="border rounded px-3 py-2"
          value={selectedMember?.id || ''}
          onChange={(e) => setSelectedMember(team.find(m => m.id === e.target.value) || null)}
        >
          {team.map(m => (
            <option key={m.id} value={m.id}>{m.name}</option>
          ))}
        </select>
      </div>

      {selectedMember && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* Weekly Schedule */}
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold mb-4">Wochenplan ({selectedMember.name})</h2>
            <div className="space-y-4">
              {DAYS.map(day => {
                const hours = workingHours.find(h => h.day_of_week === day.id);
                return (
                  <div key={day.id} className="flex items-center justify-between border-b pb-2">
                    <span className="w-24 font-medium">{day.name}</span>
                    <div className="flex gap-2 items-center">
                      <input
                        type="time"
                        className="border rounded px-2 py-1"
                        defaultValue={hours?.start_time || '09:00'}
                        onBlur={(e) => handleUpdateWorkingHours(day.id, e.target.value, hours?.end_time || '17:00')}
                      />
                      <span>bis</span>
                      <input
                        type="time"
                        className="border rounded px-2 py-1"
                        defaultValue={hours?.end_time || '17:00'}
                        onBlur={(e) => handleUpdateWorkingHours(day.id, hours?.start_time || '09:00', e.target.value)}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Day Overrides */}
          <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Ausnahme hinzufügen</h2>
              <form onSubmit={handleAddOverride} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium">Datum</label>
                    <input
                      type="date"
                      required
                      className="w-full border rounded px-3 py-2"
                      value={overrideDate}
                      onChange={(e) => setOverrideDate(e.target.value)}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium">Typ</label>
                    <select
                      className="w-full border rounded px-3 py-2"
                      value={overrideType}
                      onChange={(e) => setOverrideType(e.target.value as any)}
                    >
                      <option value="day_off">Freier Tag</option>
                      <option value="extra_hours">Sonderzeit</option>
                    </select>
                  </div>
                </div>

                {overrideType === 'extra_hours' && (
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium">Startzeit</label>
                      <input
                        type="time"
                        className="w-full border rounded px-3 py-2"
                        value={customStart}
                        onChange={(e) => setCustomStart(e.target.value)}
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium">Endzeit</label>
                      <input
                        type="time"
                        className="w-full border rounded px-3 py-2"
                        value={customEnd}
                        onChange={(e) => setCustomEnd(e.target.value)}
                      />
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-sm font-medium">Grund (optional)</label>
                  <input
                    type="text"
                    className="w-full border rounded px-3 py-2"
                    value={overrideReason}
                    onChange={(e) => setOverrideReason(e.target.value)}
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-[var(--admin-primary)] text-white py-2 rounded hover:bg-[var(--admin-primary-hover)]"
                >
                  Speichern
                </button>
              </form>
            </div>

            <div className="bg-white p-6 rounded-lg shadow">
              <h2 className="text-xl font-semibold mb-4">Aktive Ausnahmen</h2>
              <div className="space-y-3">
                {overrides.length === 0 && <p className="text-gray-500 italic">Keine Ausnahmen geplant.</p>}
                {overrides.map(ovr => (
                  <div key={ovr.id} className="flex justify-between items-center bg-gray-50 p-3 rounded border">
                    <div>
                      <div className="font-bold">{new Date(ovr.date).toLocaleDateString('de-DE')}</div>
                      <div className="text-sm">
                        {ovr.override_type === 'day_off' ? 'Freigestellt' : `Sonderzeit: ${ovr.custom_start_time} - ${ovr.custom_end_time}`}
                      </div>
                      {ovr.reason && <div className="text-xs text-gray-500 italic">{ovr.reason}</div>}
                    </div>
                    <button
                      onClick={() => handleDeleteOverride(ovr.id)}
                      className="text-red-600 text-sm hover:underline"
                    >
                      Löschen
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
